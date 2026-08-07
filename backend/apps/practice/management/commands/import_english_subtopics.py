import json
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.practice.english_manifest import load_manifest, load_order_maps
from apps.practice.models import Subject, Domain, Topic, Subtopic, Question, Choice

DEFAULT_SUBTOPICS_DIR = (
    settings.BASE_DIR / "data_scripts" / "scripts" / "english" / "subtopics"
)
DEFAULT_SUBJECT_NAME = "Անգլերեն"
CHOICE_LETTERS = ["a", "b", "c", "d"]


class Command(BaseCommand):
    help = (
        "Import English practice questions from "
        "data_scripts/scripts/english/subtopics/<slug>_*_practice.json files, "
        "keyed by the slugs in manifest_english.json."
    )

    def add_arguments(self, parser):
        parser.add_argument("--dir", type=str, default=None, help="Override subtopics dir")
        parser.add_argument("--subject", type=str, default=DEFAULT_SUBJECT_NAME)

    def handle(self, *args, **options):
        subtopics_dir = Path(options["dir"]) if options["dir"] else DEFAULT_SUBTOPICS_DIR
        subject_name = options["subject"]

        subject, _ = Subject.objects.get_or_create(name=subject_name)
        domain_order, topic_order, subtopic_order = load_order_maps()

        total_imported = 0
        missing = []
        for entry in load_manifest():
            slug = entry["slug"]
            matches = sorted(subtopics_dir.glob(f"{slug}_*_practice.json"))
            if not matches:
                missing.append(f"{slug} ({entry['subtopic']})")
                continue

            imported = self._import_file(
                matches[0], subject, entry, domain_order, topic_order, subtopic_order,
            )
            total_imported += imported
            self.stdout.write(f"{matches[0].name}: imported {imported}")

        self.stdout.write(self.style.SUCCESS(f"Done. {total_imported} questions imported."))
        if missing:
            self.stdout.write(f"{len(missing)} subtopic file(s) not yet written: {', '.join(missing)}")

    @transaction.atomic
    def _import_file(self, path: Path, subject: Subject, entry: dict,
                      domain_order: dict, topic_order: dict, subtopic_order: dict):
        data = json.loads(path.read_text(encoding="utf-8"))
        domain_name, topic_name, subtopic_name = entry["domain"], entry["topic"], entry["subtopic"]

        domain, _ = Domain.objects.get_or_create(
            subject=subject, name=domain_name,
            defaults={"order": domain_order.get(domain_name, 0)},
        )
        topic, _ = Topic.objects.get_or_create(
            domain=domain, name=topic_name,
            defaults={"order": topic_order.get((domain_name, topic_name), 0)},
        )
        subtopic, _ = Subtopic.objects.get_or_create(
            topic=topic, name=subtopic_name,
            defaults={"order": subtopic_order.get((domain_name, topic_name, subtopic_name), 0)},
        )

        seen_dataset_ids = []
        for p in data["problems"]:
            dataset_id = f"ENG_{p['id']}"
            question, _ = Question.objects.update_or_create(
                dataset_id=dataset_id,
                defaults=dict(
                    subtopic=subtopic,
                    tier=p["difficulty"],
                    question_type="multiple_choice",
                    text=p["question"],
                    passage=p.get("passage", ""),
                    hint=p.get("hint", ""),
                    explanation=p.get("explanation", ""),
                    video_url="",
                    correct_answer_text="",
                ),
            )
            question.choices.all().delete()
            correct_letter = p["answer"]
            for i, letter in enumerate(CHOICE_LETTERS):
                Choice.objects.create(
                    question=question, text=p["choices"][letter], order=i,
                    is_correct=(letter == correct_letter),
                )
            seen_dataset_ids.append(dataset_id)

        stale = Question.objects.filter(subtopic=subtopic).exclude(dataset_id__in=seen_dataset_ids)
        stale_count = stale.count()
        stale.delete()
        if stale_count:
            self.stdout.write(f"  removed {stale_count} stale question(s) from {subtopic.name}")

        return len(seen_dataset_ids)
