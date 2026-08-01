from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand

from apps.practice.models import Subject, Domain
from apps.practice.topics_order import load_flat_lists

DEFAULT_MATERIAL_DIR = (
    settings.BASE_DIR / "data_scripts" / "scripts" / "pipeline" / "output" / "generated"
    / "material" / "domains"
)
DEFAULT_SUBJECT_NAME = "Մաթեմատիկա"


class Command(BaseCommand):
    help = (
        "Import domain intro text from output/generated/material/domains/domNN.md "
        "files, slugs assigned by document order in data_scripts/source/math/topics.txt."
    )

    def add_arguments(self, parser):
        parser.add_argument("--dir", type=str, default=None, help="Override material dir")
        parser.add_argument("--subject", type=str, default=DEFAULT_SUBJECT_NAME)

    def handle(self, *args, **options):
        material_dir = Path(options["dir"]) if options["dir"] else DEFAULT_MATERIAL_DIR
        subject_name = options["subject"]

        try:
            subject = Subject.objects.get(name=subject_name)
        except Subject.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"Subject not found: {subject_name}"))
            return

        domains, _ = load_flat_lists()

        imported = 0
        missing = []
        for i, domain_name in enumerate(domains):
            slug = f"dom{i:02d}"
            file_path = material_dir / f"{slug}.md"
            if not file_path.exists():
                missing.append(f"{slug} ({domain_name})")
                continue

            try:
                domain = Domain.objects.get(subject=subject, name=domain_name)
            except Domain.DoesNotExist:
                self.stdout.write(self.style.WARNING(f"{slug}: domain not found in DB ({domain_name})"))
                continue

            domain.intro_text = file_path.read_text(encoding="utf-8").strip()
            domain.save(update_fields=["intro_text"])
            imported += 1

        self.stdout.write(self.style.SUCCESS(f"Done. {imported} domain(s) updated."))
        if missing:
            self.stdout.write(f"{len(missing)} file(s) not yet written: {', '.join(missing)}")