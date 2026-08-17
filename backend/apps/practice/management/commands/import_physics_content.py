import json
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.practice.models import Subject, Domain, Topic, Subtopic, Question, Choice, Statement

DEFAULT_DATA_DIR = settings.BASE_DIR / "apps" / "practice" / "data" / "physics"
SUBJECT_NAME = "Ֆիզիկա"


class Command(BaseCommand):
    help = (
        "Import the from-zero Physics course from backend/apps/practice/data/physics/*.json "
        "(one file per domain). Upserts Subject/Domain/Topic/Subtopic + Question/Choice/"
        "Statement by dataset_id, and removes questions whose dataset_id disappeared from "
        "a subtopic's file."
    )

    def add_arguments(self, parser):
        parser.add_argument("--dir", type=str, default=None, help="Override data dir")

    def handle(self, *args, **options):
        data_dir = Path(options["dir"]) if options["dir"] else DEFAULT_DATA_DIR
        files = sorted(data_dir.glob("*.json"))
        if not files:
            self.stdout.write(self.style.WARNING(f"No files found in {data_dir}"))
            return

        subject, _ = Subject.objects.get_or_create(name=SUBJECT_NAME, defaults={"order": 2})

        total_q = 0
        total_removed = 0
        for f in files:
            q, removed = self._import_file(f, subject)
            total_q += q
            total_removed += removed
            self.stdout.write(f"{f.name}: {q} question(s) imported")

        self.stdout.write(self.style.SUCCESS(
            f"Done. {total_q} question(s) imported across {len(files)} domain file(s)"
            + (f", {total_removed} stale question(s) removed." if total_removed else ".")
        ))

    @transaction.atomic
    def _import_file(self, path: Path, subject: Subject):
        data = json.loads(path.read_text(encoding="utf-8"))
        d = data["domain"]
        domain, _ = Domain.objects.update_or_create(
            subject=subject, name=d["name"],
            defaults={"order": d.get("order", 0), "intro_text": d.get("intro_text", "")},
        )

        q_count = 0
        removed_count = 0
        seen_topics = []
        for t in data["topics"]:
            topic, _ = Topic.objects.update_or_create(
                domain=domain, name=t["name"],
                defaults={"order": t.get("order", 0), "intro_text": t.get("intro_text", "")},
            )
            seen_topics.append(topic.pk)
            seen_subtopics = []
            for s in t["subtopics"]:
                subtopic, _ = Subtopic.objects.update_or_create(
                    topic=topic, name=s["name"],
                    defaults={
                        "order": s.get("order", 0),
                        "intro_text": s.get("intro_text", ""),
                        "learning_material": s.get("learning_material", ""),
                    },
                )
                seen_subtopics.append(subtopic.pk)
                seen_ids = []
                for q in s.get("questions", []):
                    self._import_question(subtopic, q)
                    seen_ids.append(q["dataset_id"])
                    q_count += 1
                stale = Question.objects.filter(subtopic=subtopic).exclude(dataset_id__in=seen_ids)
                removed_count += stale.count()
                stale.delete()

            # Prune subtopics/topics that were dropped from the file. Without this a
            # renamed or removed subtopic silently lingers in the DB with its old
            # questions (how the out-of-scope "Շարժման գրաֆիկներ" survived once).
            dropped = Subtopic.objects.filter(topic=topic).exclude(pk__in=seen_subtopics)
            for sub in dropped:
                self.stdout.write(f"  dropping subtopic no longer in file: {sub.name}")
            dropped.delete()

        dropped_topics = Topic.objects.filter(domain=domain).exclude(pk__in=seen_topics)
        for top in dropped_topics:
            self.stdout.write(f"  dropping topic no longer in file: {top.name}")
        dropped_topics.delete()

        return q_count, removed_count

    def _import_question(self, subtopic: Subtopic, q: dict):
        question, _ = Question.objects.update_or_create(
            dataset_id=q["dataset_id"],
            defaults=dict(
                subtopic=subtopic,
                tier=q["tier"],
                question_type=q["question_type"],
                text=q["text"],
                passage=q.get("passage", ""),
                hint=q.get("hint", ""),
                explanation=q.get("explanation", ""),
                video_url=q.get("video_url") or "",
                correct_answer_text=q.get("correct_answer_text", ""),
            ),
        )
        question.choices.all().delete()
        question.statements.all().delete()

        if q["question_type"] == "multiple_choice":
            for i, c in enumerate(q["choices"]):
                Choice.objects.create(
                    question=question, text=c["text"], order=i, is_correct=bool(c.get("is_correct")),
                )
        elif q["question_type"] == "true_false":
            for i, st in enumerate(q["statements"]):
                Statement.objects.create(
                    question=question,
                    label=st["label"],
                    text=st["text"],
                    is_true=bool(st["is_true"]),
                    hint=st.get("hint", ""),
                    order=i,
                )
