from django.core.management import call_command
from django.core.management.base import BaseCommand

from apps.mock_exams.models import MockExam


class Command(BaseCommand):
    help = (
        "Imports the 50 mock-exam JSON files on a fresh database. Only runs "
        "if MockExam has no rows yet, so it's safe to run on every container "
        "start — it will never duplicate or overwrite data."
    )

    def handle(self, *args, **options):
        if MockExam.objects.exists():
            self.stdout.write("Mock exams already present — skipping seed.")
            return
        self.stdout.write("MockExam table is empty — importing mock exams...")
        call_command("import_mock_exams")
        self.stdout.write(self.style.SUCCESS("Mock exams seeded."))
