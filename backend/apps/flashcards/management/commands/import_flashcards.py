import json
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.flashcards.models import Flashcard, FlashcardDeck

DEFAULT_DECKS_DIR = settings.BASE_DIR / "apps" / "flashcards" / "data" / "decks"


class Command(BaseCommand):
    help = "Import flashcard deck JSON files into FlashcardDeck/Flashcard."

    def add_arguments(self, parser):
        parser.add_argument("--dir", type=str, default=None, help="Override decks dir")

    def handle(self, *args, **options):
        decks_dir = Path(options["dir"]) if options["dir"] else DEFAULT_DECKS_DIR
        # Recurse into per-subject subfolders (data/decks/math/, /physics/, ...),
        # while still supporting flat *.json files directly in the decks dir.
        files = sorted(decks_dir.rglob("*.json"))
        if not files:
            self.stdout.write(self.style.WARNING(f"No files found in {decks_dir}"))
            return

        total_decks = 0
        total_cards = 0
        for order, f in enumerate(files):
            imported = self._import_file(f, order)
            total_decks += 1
            total_cards += imported
            self.stdout.write(f"{f.name}: imported {imported} cards")

        self.stdout.write(self.style.SUCCESS(
            f"Done. {total_decks} decks, {total_cards} cards imported."
        ))

    @transaction.atomic
    def _import_file(self, path: Path, order: int) -> int:
        data = json.loads(path.read_text(encoding="utf-8"))
        deck, _ = FlashcardDeck.objects.update_or_create(
            deck_id=data["deck_id"],
            defaults=dict(
                title=data["title"],
                subject=data.get("subject", "math"),
                card_count=len(data["cards"]),
                order=order,
            ),
        )

        seen_dataset_ids = []
        for c in data["cards"]:
            dataset_id = f"{deck.deck_id}-{c['number']}"
            Flashcard.objects.update_or_create(
                dataset_id=dataset_id,
                defaults=dict(
                    deck=deck,
                    number=c["number"],
                    topic=c.get("topic") or "",
                    front_text=c["front"],
                    back_text=c["back"],
                    hint=c.get("hint") or "",
                    translation=c.get("translation") or "",
                ),
            )
            seen_dataset_ids.append(dataset_id)

        stale = Flashcard.objects.filter(deck=deck).exclude(dataset_id__in=seen_dataset_ids)
        stale_count = stale.count()
        stale.delete()
        if stale_count:
            self.stdout.write(f"  removed {stale_count} stale card(s) from {deck.deck_id}")

        return len(seen_dataset_ids)
