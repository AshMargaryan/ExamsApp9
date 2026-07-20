import json
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.practice.models import (
    Subject, Domain, Topic, Subtopic,
    Question, Choice, Statement,
    QuestionType,
)

DEFAULT_GENERATED_DIR = (
    settings.BASE_DIR / "data_scripts" / "scripts" / "pipeline" / "output" / "generated"
)
DEFAULT_SUBJECT_NAME = "Մաթեմատիկա"


class Command(BaseCommand):
    help = "Import questions from the pipeline's output/generated/*.json files."

    def add_arguments(self, parser):
        parser.add_argument("--dir", type=str, default=None, help="Override generated dir")
        parser.add_argument("--subject", type=str, default=DEFAULT_SUBJECT_NAME)

    def handle(self, *args, **options):
        generated_dir = Path(options["dir"]) if options["dir"] else DEFAULT_GENERATED_DIR
        subject_name = options["subject"]

        files = sorted(
            f for f in generated_dir.glob("*.json") if f.name != "manifest.json"
        )
        if not files:
            self.stdout.write(self.style.WARNING(f"No files found in {generated_dir}"))
            return

        subject, _ = Subject.objects.get_or_create(name=subject_name)

        total_imported = 0
        total_skipped = 0
        for f in files:
            imported, skipped = self._import_file(f, subject)
            total_imported += imported
            total_skipped += skipped
            self.stdout.write(f"{f.name}: imported {imported}, skipped {skipped} (unenriched)")

        self.stdout.write(self.style.SUCCESS(
            f"Done. {total_imported} questions imported, {total_skipped} skipped."
        ))

    @transaction.atomic
    def _import_file(self, path: Path, subject: Subject):
        data = json.loads(path.read_text(encoding="utf-8"))
        domain_name = data["domain"]
        topic_name = data["topic"]
        subtopic_name = data["subtopic"]

        domain, _ = Domain.objects.get_or_create(subject=subject, name=domain_name)
        topic, _ = Topic.objects.get_or_create(domain=domain, name=topic_name)
        subtopic, _ = Subtopic.objects.get_or_create(topic=topic, name=subtopic_name)

        questions = data["questions"]
        enriched = [q for q in questions if q.get("hint") and q.get("explanation")]
        skipped = len(questions) - len(enriched)

        non_tf = [q for q in enriched if q["question_type"] != "true_false"]
        tf_groups = {}
        for q in enriched:
            if q["question_type"] == "true_false":
                group_id = q.get("_group_id")
                if group_id is None:
                    # Old pre-type-mix standalone true_false format, no shared
                    # exercise_text/group — not supported by this importer yet.
                    skipped += 1
                    continue
                tf_groups.setdefault(group_id, []).append(q)

        imported = 0
        for q in non_tf:
            self._import_single(subtopic, q)
            imported += 1
        for group_items in tf_groups.values():
            self._import_tf_group(subtopic, group_items)
            imported += 1

        return imported, skipped

    def _import_single(self, subtopic: Subtopic, q: dict):
        question, _ = Question.objects.update_or_create(
            dataset_id=q["dataset_id"],
            defaults=dict(
                subtopic=subtopic,
                tier=q["_tier"],
                question_type=q["question_type"],
                text=q["question_text"],
                hint=q.get("hint", ""),
                explanation=q.get("explanation", ""),
                video_url=q.get("video_url") or "",
                correct_answer_text=(
                    str(q["correct_answer"]) if q["question_type"] == "short_answer" else ""
                ),
            ),
        )
        question.choices.all().delete()
        if q["question_type"] == "multiple_choice":
            correct_letter = q["correct_answer"]
            correct_index = ord(correct_letter.upper()) - ord("A")
            for i, c in enumerate(q["choices"]):
                Choice.objects.create(
                    question=question, text=c["text"], order=i, is_correct=(i == correct_index),
                )

    def _import_tf_group(self, subtopic: Subtopic, items: list):
        first = items[0]
        question, _ = Question.objects.update_or_create(
            dataset_id=first["dataset_id"],
            defaults=dict(
                subtopic=subtopic,
                tier=first["_tier"],
                question_type=QuestionType.TRUE_FALSE,
                text=first["exercise_text"],
                hint=first.get("hint", ""),
                explanation="\n\n".join(
                    f"{i + 1}. {it.get('explanation', '')}" for i, it in enumerate(items)
                ),
                video_url=first.get("video_url") or "",
                correct_answer_text="",
            ),
        )
        question.statements.all().delete()
        labels = "ԱԲԳԴԵԶ"
        for i, it in enumerate(items):
            Statement.objects.create(
                question=question,
                label=labels[i] if i < len(labels) else str(i + 1),
                text=it["question_text"],
                is_true=bool(it["correct_answer"]),
                order=i,
            )