from django.core.management import call_command
from django.core.management.base import BaseCommand

from apps.practice.models import Subject
from apps.users.models import School


class Command(BaseCommand):
    help = (
        "Loads shared reference content (practice subjects/domains/topics/"
        "subtopics/questions, plus the school/university lookup lists) on a "
        "fresh database. Each fixture is only loaded if its table is still "
        "empty, so this is safe to run on every container start — it will "
        "never duplicate or overwrite data a teammate has since added."
    )

    def handle(self, *args, **options):
        if Subject.objects.exists():
            self.stdout.write("Practice content already present — skipping seed.")
        else:
            self.stdout.write("Practice content table is empty — loading seed_content fixture...")
            call_command("loaddata", "seed_content")
            self.stdout.write(self.style.SUCCESS("Practice seed content loaded."))

        if School.objects.exists():
            self.stdout.write("School/university reference data already present — skipping seed.")
        else:
            self.stdout.write("School table is empty — loading seed_reference fixture...")
            call_command("loaddata", "seed_reference")
            self.stdout.write(self.style.SUCCESS("Reference seed content loaded."))