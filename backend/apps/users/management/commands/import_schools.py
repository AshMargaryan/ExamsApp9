import json
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand

from apps.users.models import School, University

SCHOOLS_JSON = settings.BASE_DIR / "data_scripts" / "schools" / "schools.json"
UNIVERSITIES_JSON = settings.BASE_DIR / "data_scripts" / "schools" / "universities.json"


class Command(BaseCommand):
    help = "Import schools and universities from data_scripts/schools/*.json into the database."

    def handle(self, *args, **options):
        schools_imported = self._import_schools()
        universities_imported = self._import_universities()
        self.stdout.write(self.style.SUCCESS(
            f"Imported {schools_imported} school(s), {universities_imported} university/universities."
        ))

    def _import_schools(self) -> int:
        if not SCHOOLS_JSON.exists():
            self.stdout.write(self.style.WARNING(f"No file at {SCHOOLS_JSON}"))
            return 0
        data = json.loads(SCHOOLS_JSON.read_text(encoding="utf-8"))
        count = 0
        for entry in data:
            School.objects.update_or_create(
                name=entry["name"],
                defaults={"marz": entry.get("marz", "")},
            )
            count += 1
        return count

    def _import_universities(self) -> int:
        if not UNIVERSITIES_JSON.exists():
            self.stdout.write(self.style.WARNING(f"No file at {UNIVERSITIES_JSON}"))
            return 0
        data = json.loads(UNIVERSITIES_JSON.read_text(encoding="utf-8"))
        count = 0
        for entry in data:
            University.objects.update_or_create(name=entry["name"])
            count += 1
        return count
