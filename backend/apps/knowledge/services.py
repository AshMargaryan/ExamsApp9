"""
Recompute functions — one per granularity, each pulling raw events from the
domain apps that already own that data (practice, mock_exams, flashcards)
and writing the result to this app's stored tables. Called from signals.py
on every relevant save, not on a schedule.
"""

from datetime import timedelta

from django.utils import timezone

from apps.flashcards.models import FlashcardReview
from apps.mock_exams.models import MockExamAnswer
from apps.practice.models import AttemptAnswer
from apps.profiles.subjects import PRACTICE_SUBJECT_NAMES

from .models import SubjectMastery, TopicMastery
from .scoring import compute_mastery

# Same Anki-style bounds/curve as apps.flashcards.views._schedule, reused
# here for a consistent "how spacing grows" feel across the app. Practice
# answers are binary (correct/incorrect), so this only has two branches
# where flashcards' 4-button grading has four.
MIN_EASE_FACTOR = 1.3
MAX_EASE_FACTOR = 3.0
# A year is already far past "review this before an exam" territory — caps
# the exponential interval*ease_factor growth so a long correct streak
# can't compound into a datetime.timedelta overflow.
MAX_INTERVAL_DAYS = 365


def _apply_spaced_repetition(topic_mastery: TopicMastery, is_correct: bool) -> None:
    prev_interval = topic_mastery.interval_days
    if not is_correct:
        topic_mastery.interval_days = 0
        topic_mastery.ease_factor = max(MIN_EASE_FACTOR, topic_mastery.ease_factor - 0.3)
    else:
        if prev_interval == 0:
            topic_mastery.interval_days = 1
        elif prev_interval == 1:
            topic_mastery.interval_days = 3
        else:
            topic_mastery.interval_days = min(MAX_INTERVAL_DAYS, round(prev_interval * topic_mastery.ease_factor))
        topic_mastery.ease_factor = min(MAX_EASE_FACTOR, topic_mastery.ease_factor + 0.05)
    topic_mastery.next_review_at = timezone.now() + timedelta(days=topic_mastery.interval_days)


def _practice_events(user, subject_name=None, subtopic=None):
    qs = AttemptAnswer.objects.filter(
        attempt__user=user,
        attempt__completed_at__isnull=False,
        attempt__revealed_answers=False,
    )
    if subject_name is not None:
        qs = qs.filter(attempt__subtopic__topic__domain__subject__name=subject_name)
    if subtopic is not None:
        qs = qs.filter(attempt__subtopic=subtopic)
    return qs.values_list("answered_at", "is_correct")


def _mock_exam_events(user, subject_key):
    return MockExamAnswer.objects.filter(
        attempt__user=user, attempt__exam__subject=subject_key, is_correct__isnull=False,
    ).values_list("answered_at", "is_correct")


def _flashcard_events(user, subject_key):
    qs = FlashcardReview.objects.filter(user=user, card__deck__subject=subject_key).values_list(
        "reviewed_at", "grade"
    )
    return [(reviewed_at, grade != "again") for reviewed_at, grade in qs]


def recompute_subject_mastery(user, subject_key: str) -> SubjectMastery:
    events = list(_mock_exam_events(user, subject_key)) + _flashcard_events(user, subject_key)
    practice_subject_name = PRACTICE_SUBJECT_NAMES.get(subject_key)
    if practice_subject_name:
        events += list(_practice_events(user, subject_name=practice_subject_name))

    result = compute_mastery(events)
    obj, _ = SubjectMastery.objects.update_or_create(
        user=user, subject_key=subject_key,
        defaults={
            "mastery_score": result["mastery_score"],
            "attempts_count": result["attempts_count"],
            "correct_count": result["correct_count"],
            "data_sufficiency": result["data_sufficiency"],
            "last_activity_at": result["last_activity_at"],
        },
    )
    return obj


def recompute_topic_mastery(user, subtopic, *, latest_is_correct: bool | None = None) -> TopicMastery:
    """`latest_is_correct`, when given, is the correctness of the single
    AttemptAnswer that just triggered this recompute — drives the spaced-
    repetition schedule incrementally. Omit it (e.g. when just backfilling
    the mastery_score with no specific new answer) to leave the schedule
    untouched."""
    events = list(_practice_events(user, subtopic=subtopic))
    result = compute_mastery(events)
    obj, _ = TopicMastery.objects.update_or_create(
        user=user, subtopic=subtopic,
        defaults={
            "mastery_score": result["mastery_score"],
            "attempts_count": result["attempts_count"],
            "correct_count": result["correct_count"],
            "data_sufficiency": result["data_sufficiency"],
            "last_activity_at": result["last_activity_at"],
        },
    )
    if latest_is_correct is not None:
        _apply_spaced_repetition(obj, latest_is_correct)
        obj.save(update_fields=["ease_factor", "interval_days", "next_review_at"])
    return obj
