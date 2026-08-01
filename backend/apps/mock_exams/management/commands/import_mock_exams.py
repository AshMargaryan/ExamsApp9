import json
import re
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.mock_exams.models import (
    MockExam, MockExamQuestion, MockExamChoice, MockExamStatement,
    MockExamQuestionType, MockExamDifficulty,
)

DEFAULT_EXAMS_DIR = settings.BASE_DIR / "apps" / "mock_exams" / "data" / "exams"

DIFFICULTY_MAP = {
    "հեշտ": MockExamDifficulty.EASY,
    "միջին": MockExamDifficulty.MEDIUM,
    "բարձր": MockExamDifficulty.HARD,
}

# Armenian alphabet, in order — options/statement labels index into this.
ARMENIAN_LETTERS = "ԱԲԳԴԵԶԷԸԹԺԻԼԽԾԿՀՁՂՃՄ"
ARMENIAN_LETTER_RE = re.compile(r"[Ա-Ֆ]")


class Command(BaseCommand):
    help = "Import the 50 mock-exam JSON files into MockExam/MockExamQuestion."

    def add_arguments(self, parser):
        parser.add_argument("--dir", type=str, default=None, help="Override exams dir")

    def handle(self, *args, **options):
        exams_dir = Path(options["dir"]) if options["dir"] else DEFAULT_EXAMS_DIR
        files = sorted(exams_dir.glob("*.json"))
        if not files:
            self.stdout.write(self.style.WARNING(f"No files found in {exams_dir}"))
            return

        total_exams = 0
        total_questions = 0
        for order, f in enumerate(files):
            imported = self._import_file(f, order)
            total_exams += 1
            total_questions += imported
            self.stdout.write(f"{f.name}: imported {imported} questions")

        self.stdout.write(self.style.SUCCESS(
            f"Done. {total_exams} exams, {total_questions} questions imported."
        ))

    @transaction.atomic
    def _import_file(self, path: Path, order: int) -> int:
        data = json.loads(path.read_text(encoding="utf-8"))
        exam, _ = MockExam.objects.update_or_create(
            exam_id=data["exam_id"],
            defaults=dict(
                title=data["title"],
                question_count=data["question_count"],
                order=order,
            ),
        )

        seen_dataset_ids = []
        for q in data["questions"]:
            dataset_id = f"{exam.exam_id}-{q['number']}"
            self._import_question(exam, dataset_id, q)
            seen_dataset_ids.append(dataset_id)

        stale = MockExamQuestion.objects.filter(exam=exam).exclude(dataset_id__in=seen_dataset_ids)
        stale_count = stale.count()
        stale.delete()
        if stale_count:
            self.stdout.write(f"  removed {stale_count} stale question(s) from {exam.exam_id}")

        return len(seen_dataset_ids)

    def _import_question(self, exam: MockExam, dataset_id: str, q: dict):
        qtype = q["type"]
        question, _ = MockExamQuestion.objects.update_or_create(
            dataset_id=dataset_id,
            defaults=dict(
                exam=exam,
                number=q["number"],
                topic=q.get("topic") or "",
                group=q.get("group") or "",
                question_type=qtype,
                text=q["question"],
                difficulty=DIFFICULTY_MAP[q["difficulty"]],
                hint=q.get("hint") or "",
                solution_steps=q.get("solution_steps") or [],
                correct_answer_text=q.get("answer") or "" if qtype == MockExamQuestionType.FREE_RESPONSE else "",
            ),
        )
        question.choices.all().delete()
        question.statements.all().delete()

        if qtype == MockExamQuestionType.SINGLE_CHOICE:
            correct_index = ARMENIAN_LETTERS.index(q["correct_option"].strip())
            for i, text in enumerate(q["options"]):
                MockExamChoice.objects.create(
                    question=question, text=text, order=i, is_correct=(i == correct_index),
                )

        elif qtype == MockExamQuestionType.MULTI_STATEMENT:
            correct_labels = set(ARMENIAN_LETTER_RE.findall(q["correct_option"]))
            for i, statement in enumerate(q["statements"]):
                label, text = self._split_statement(statement)
                MockExamStatement.objects.create(
                    question=question, label=label, text=text, order=i,
                    is_true=label in correct_labels,
                )

    @staticmethod
    def _split_statement(statement: str) -> tuple[str, str]:
        match = re.match(r"^([Ա-Ֆ])\)\s*(.*)$", statement, re.DOTALL)
        if match:
            return match.group(1), match.group(2)
        return "", statement
