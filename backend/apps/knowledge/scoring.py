"""
Pure mastery-scoring math, deliberately isolated from any Django models/
queries so it's trivial to unit-test. Not confidence calibration, not
misconception detection, not spaced repetition — just "how well does this
recent evidence suggest the student knows this," expressed as one number.
"""

from django.utils import timezone

from .models import DataSufficiency

# Recency half-life: an answer from 30 days ago counts half as much as one
# from today. Simple exponential decay — no ML, easy to explain to a
# student or a future engine reading this score.
HALF_LIFE_DAYS = 30

# Attempt-count thresholds for the data_sufficiency label (not folded into
# the score itself — consumers decide how much to trust a thin score).
LOW_MAX_ATTEMPTS = 4
MEDIUM_MAX_ATTEMPTS = 14


def _sufficiency(attempts_count: int) -> str:
    if attempts_count <= LOW_MAX_ATTEMPTS:
        return DataSufficiency.LOW
    if attempts_count <= MEDIUM_MAX_ATTEMPTS:
        return DataSufficiency.MEDIUM
    return DataSufficiency.HIGH


def compute_mastery(events, now=None) -> dict:
    """events: iterable of (occurred_at: datetime, is_correct: bool).
    Returns {mastery_score, attempts_count, correct_count, data_sufficiency,
    last_activity_at} — mastery_score is None (not 0) when there's no data,
    since "no evidence" and "known to be weak" are different facts."""
    now = now or timezone.now()
    events = list(events)

    if not events:
        return {
            "mastery_score": None,
            "attempts_count": 0,
            "correct_count": 0,
            "data_sufficiency": DataSufficiency.LOW,
            "last_activity_at": None,
        }

    weighted_correct = 0.0
    weighted_total = 0.0
    correct_count = 0
    last_activity_at = None

    for occurred_at, is_correct in events:
        if last_activity_at is None or occurred_at > last_activity_at:
            last_activity_at = occurred_at
        days_ago = max((now - occurred_at).total_seconds() / 86400, 0)
        weight = 0.5 ** (days_ago / HALF_LIFE_DAYS)
        weighted_total += weight
        if is_correct:
            weighted_correct += weight
            correct_count += 1

    mastery_score = round(100 * weighted_correct / weighted_total, 1) if weighted_total else None
    attempts_count = len(events)

    return {
        "mastery_score": mastery_score,
        "attempts_count": attempts_count,
        "correct_count": correct_count,
        "data_sufficiency": _sufficiency(attempts_count),
        "last_activity_at": last_activity_at,
    }
