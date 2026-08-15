import uuid

from django.conf import settings
from django.db import models


# ---------------------------------------------------------------------------
# Content: a FlashcardDeck is either shared/library content (owner=None,
# imported from data/decks/*.json — see management/commands/import_flashcards)
# or a private deck a student created themselves through the app.
# ---------------------------------------------------------------------------

class FlashcardSubject(models.TextChoices):
    MATH = "math", "Mathematics"
    PHYSICS = "physics", "Physics"
    BIOLOGY = "biology", "Biology"
    CHEMISTRY = "chemistry", "Chemistry"
    ENGLISH = "english", "English"


class FlashcardDeck(models.Model):
    deck_id = models.CharField(max_length=50, unique=True)
    title = models.CharField(max_length=300)
    description = models.TextField(blank=True, default="")
    subject = models.CharField(
        max_length=20, choices=FlashcardSubject.choices, default=FlashcardSubject.MATH,
        db_index=True,
    )
    card_count = models.PositiveIntegerField(default=0)
    order = models.PositiveIntegerField(default=0)

    # Null = shared library deck (imported, read-only for students). Set =
    # a private deck owned by that student — created/edited/deleted only by them.
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True, blank=True,
        related_name="owned_flashcard_decks",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["subject", "order", "deck_id"]

    def __str__(self):
        return self.title


def flashcard_image_upload_path(instance, filename):
    unique_name = f"{uuid.uuid4().hex}_{filename}"
    return f"flashcards/{instance.deck.owner_id}/{unique_name}"


def flashcard_audio_upload_path(instance, filename):
    unique_name = f"{uuid.uuid4().hex}_{filename}"
    return f"flashcards/{instance.deck.owner_id}/audio/{unique_name}"


class FlashcardDifficulty(models.TextChoices):
    EASY = "easy", "Easy"
    MEDIUM = "medium", "Medium"
    HARD = "hard", "Hard"


class Flashcard(models.Model):
    deck = models.ForeignKey(FlashcardDeck, on_delete=models.CASCADE, related_name="cards")
    number = models.PositiveIntegerField(help_text="Display order within the deck.")
    topic = models.CharField(max_length=200, blank=True, default="")
    front_text = models.TextField()
    back_text = models.TextField()
    hint = models.TextField(blank=True, default="")
    translation = models.TextField(
        blank=True, default="", help_text="Armenian translation of front_text, shown alongside it."
    )

    # Shown on the back, alongside the answer — distinct from `hint` (a
    # front-side study aid shown before flipping).
    explanation = models.TextField(blank=True, default="")
    notes = models.TextField(blank=True, default="")

    front_image = models.ImageField(upload_to=flashcard_image_upload_path, null=True, blank=True)
    back_image = models.ImageField(upload_to=flashcard_image_upload_path, null=True, blank=True)
    audio = models.FileField(upload_to=flashcard_audio_upload_path, null=True, blank=True)

    tags = models.JSONField(default=list, blank=True)
    difficulty = models.CharField(
        max_length=10, choices=FlashcardDifficulty.choices, default=FlashcardDifficulty.MEDIUM,
    )

    # f"{deck.deck_id}-{number}" for library cards (ties back to the source
    # file for idempotent re-import); f"USER-{uuid4}" for student-created cards.
    dataset_id = models.CharField(max_length=100, unique=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["deck", "number"]

    def __str__(self):
        return f"[{self.deck.deck_id} #{self.number}] {self.front_text[:60]}"


# ---------------------------------------------------------------------------
# Per-user study progress
# ---------------------------------------------------------------------------

class FlashcardProgressStatus(models.TextChoices):
    NEW = "new", "New"
    LEARNING = "learning", "Still Learning"
    KNOWN = "known", "Known"


class FlashcardProgress(models.Model):
    """One row per (user, card). Not versioned/history — just the latest
    self-reported study state, updated every time the user reviews the card.
    Full history of individual grades lives in FlashcardReview below."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="flashcard_progress"
    )
    card = models.ForeignKey(Flashcard, on_delete=models.CASCADE, related_name="progress")
    status = models.CharField(
        max_length=10, choices=FlashcardProgressStatus.choices, default=FlashcardProgressStatus.NEW
    )
    times_seen = models.PositiveIntegerField(default=0)
    times_correct = models.PositiveIntegerField(default=0)
    last_reviewed_at = models.DateTimeField(null=True, blank=True)

    # Manual toggles — independent of grading. "Learned" isn't a separate
    # field: it's status == KNOWN, set the same way grading sets it.
    is_favorite = models.BooleanField(default=False)
    is_difficult = models.BooleanField(default=False)

    # Lightweight SM-2-style spaced repetition: interval grows (scaled by
    # ease_factor) each time the card is marked "known", and resets to 0
    # (due again immediately) whenever it's marked "learning".
    ease_factor = models.FloatField(default=2.5)
    interval_days = models.PositiveIntegerField(default=0)
    due_at = models.DateTimeField(
        null=True, blank=True, help_text="Null = due now (never reviewed)."
    )

    class Meta:
        unique_together = [("user", "card")]

    def __str__(self):
        return f"{self.user} / card {self.card_id} = {self.status}"


class FlashcardReview(models.Model):
    """Append-only log of every grading action — one row per review, so
    session accuracy/history can be computed from real data."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="flashcard_reviews"
    )
    card = models.ForeignKey(Flashcard, on_delete=models.CASCADE, related_name="reviews")
    grade = models.CharField(max_length=10, choices=[
        ("again", "Again"), ("hard", "Hard"), ("good", "Good"), ("easy", "Easy"),
    ])
    reviewed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-reviewed_at"]
        indexes = [models.Index(fields=["user", "card", "reviewed_at"])]

    def __str__(self):
        return f"{self.user} / card {self.card_id} = {self.grade} @ {self.reviewed_at}"
