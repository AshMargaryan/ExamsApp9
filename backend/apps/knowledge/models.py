from django.conf import settings
from django.db import models

from apps.mock_exams.models import MockExamSubject


class DataSufficiency(models.TextChoices):
    """How much evidence a mastery score is based on — separate from the
    score itself. Not a confidence-calibration model (that's a distinct
    future engine); just an honest signal for consumers to decide whether
    to trust a thin score."""

    LOW = "low", "Low"
    MEDIUM = "medium", "Medium"
    HIGH = "high", "High"


class SubjectMastery(models.Model):
    """One row per (user, subject). The single source of truth for subject-
    level mastery — replaces the ad-hoc, unstored `subject_mastery()` in
    apps.profiles.analytics. Recomputed on every relevant practice/mock-exam/
    flashcard event (see signals.py), not on a schedule, so it's never more
    stale than the student's last answer."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="subject_mastery_scores"
    )
    subject_key = models.CharField(max_length=20, choices=MockExamSubject.choices)
    mastery_score = models.FloatField(
        null=True, blank=True, help_text="0-100, recency-weighted accuracy. Null = no data yet."
    )
    attempts_count = models.PositiveIntegerField(default=0)
    correct_count = models.PositiveIntegerField(default=0)
    data_sufficiency = models.CharField(max_length=10, choices=DataSufficiency.choices, default=DataSufficiency.LOW)
    last_activity_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "subject_key"], name="unique_subject_mastery_per_user"),
        ]
        indexes = [models.Index(fields=["user", "subject_key"])]

    def __str__(self):
        return f"{self.user} / {self.subject_key} = {self.mastery_score}"


class TopicMastery(models.Model):
    """One row per (user, subtopic). Only populated for subjects with real
    apps.practice content (currently math + english) — apps.practice.Subtopic
    is the only structured, FK-based topic granularity that exists across
    the codebase today (mock exams/flashcards use free-text topic labels).
    Replaces the ad-hoc, unstored `skill_map()` in apps.profiles.analytics."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="topic_mastery_scores"
    )
    subtopic = models.ForeignKey("practice.Subtopic", on_delete=models.CASCADE, related_name="mastery_scores")
    mastery_score = models.FloatField(null=True, blank=True, help_text="0-100, recency-weighted accuracy.")
    attempts_count = models.PositiveIntegerField(default=0)
    correct_count = models.PositiveIntegerField(default=0)
    data_sufficiency = models.CharField(max_length=10, choices=DataSufficiency.choices, default=DataSufficiency.LOW)
    last_activity_at = models.DateTimeField(null=True, blank=True)

    # Spaced repetition — same Anki-style SM-2 formula and bounds as
    # apps.flashcards.views._schedule, applied to the single most recent
    # AttemptAnswer for this subtopic (correct ~= "good", incorrect ~=
    # "again"; practice questions are binary, unlike flashcards' 4-button
    # self-grade). Deliberately separate from mastery_score above: mastery
    # is always recomputed fresh from full history, this is incremental
    # state that only this scheduler touches.
    ease_factor = models.FloatField(default=2.5)
    interval_days = models.PositiveIntegerField(default=0)
    next_review_at = models.DateTimeField(
        null=True, blank=True, help_text="Null = due now (never scheduled, or interval reset to 0)."
    )

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "subtopic"], name="unique_topic_mastery_per_user"),
        ]
        indexes = [models.Index(fields=["user", "subtopic"])]

    def __str__(self):
        return f"{self.user} / {self.subtopic} = {self.mastery_score}"
