import json
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand

from apps.practice.models import Subject, Domain, Topic, Subtopic

GENERATED_DIR = (
    settings.BASE_DIR / "data_scripts" / "scripts" / "pipeline" / "output" / "generated"
)
DEFAULT_MATERIAL_DIR = GENERATED_DIR / "material" / "subtopics"
DEFAULT_SUBJECT_NAME = "Մաթեմատիկա"


class Command(BaseCommand):
    help = (
        "Import subtopic learning material from output/generated/material/subtopics/"
        "<slug>.md files, keyed by the slugs in output/generated/manifest.json."
    )

    def add_arguments(self, parser):
        parser.add_argument("--dir", type=str, default=None, help="Override material dir")
        parser.add_argument("--subject", type=str, default=DEFAULT_SUBJECT_NAME)

    def handle(self, *args, **options):
        material_dir = Path(options["dir"]) if options["dir"] else DEFAULT_MATERIAL_DIR
        subject_name = options["subject"]

        manifest_path = GENERATED_DIR / "manifest.json"
        if not manifest_path.exists():
            self.stdout.write(self.style.ERROR(f"Manifest not found: {manifest_path}"))
            return
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))

        try:
            subject = Subject.objects.get(name=subject_name)
        except Subject.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"Subject not found: {subject_name}"))
            return

        imported = 0
        missing = []
        for entry in manifest:
            slug = entry["slug"]
            file_path = material_dir / f"{slug}.md"
            if not file_path.exists():
                missing.append(slug)
                continue

            try:
                subtopic = Subtopic.objects.get(
                    topic__domain__subject=subject,
                    topic__domain__name=entry["domain"],
                    topic__name=entry["topic"],
                    name=entry["subtopic"],
                )
            except Subtopic.DoesNotExist:
                self.stdout.write(self.style.WARNING(
                    f"{slug}: subtopic not found in DB ({entry['domain']} / "
                    f"{entry['topic']} / {entry['subtopic']}) — import questions first"
                ))
                continue

            subtopic.learning_material = file_path.read_text(encoding="utf-8").strip()
            subtopic.save(update_fields=["learning_material"])
            imported += 1

        self.stdout.write(self.style.SUCCESS(f"Done. {imported} subtopic(s) updated."))
        if missing:
            self.stdout.write(f"{len(missing)} file(s) not yet written: {', '.join(missing)}")