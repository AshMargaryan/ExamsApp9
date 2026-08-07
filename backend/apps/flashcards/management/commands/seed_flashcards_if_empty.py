from django.core.management import call_command
from django.core.management.base import BaseCommand

from apps.flashcards.models import FlashcardDeck


class Command(BaseCommand):
    help = (
        "Imports the flashcard deck JSON files on a fresh database. Only runs "
        "if FlashcardDeck has no rows yet, so it's safe to run on every container "
        "start — it will never duplicate or overwrite data."
    )

    def handle(self, *args, **options):
        if FlashcardDeck.objects.exists():
            self.stdout.write("Flashcard decks already present — skipping seed.")
            return
        self.stdout.write("FlashcardDeck table is empty — importing flashcards...")
        call_command("import_flashcards")
        self.stdout.write(self.style.SUCCESS("Flashcards seeded."))
