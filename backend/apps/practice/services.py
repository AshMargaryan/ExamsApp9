import hashlib
from collections import defaultdict
from datetime import timedelta

from django.utils import timezone

from .models import AttemptAnswer, Question, Subtopic, Tier

TIERS = [t.value for t in Tier]


# ---------------------------------------------------------------------------
# Hierarchy progress helpers (shared by the hierarchy view and the
# recommendation engine below).
# ---------------------------------------------------------------------------

def progress_by_subtopic(user):
    """{subtopic_id: {tier: score}} for attempts the user finished without revealing."""
    from .models import PracticeAttempt

    progress = defaultdict(dict)
    if not user or not user.is_authenticated:
        return progress
    qs = PracticeAttempt.objects.filter(
        user=user, revealed_answers=False, completed_at__isnull=False, score__isnull=False,
    ).values_list("subtopic_id", "tier", "score")
    for subtopic_id, tier, score in qs:
        progress[subtopic_id][tier] = score
    return progress


def subtopic_ids_with_questions():
    """Subtopics with zero imported questions are left out entirely."""
    return set(Question.objects.values_list("subtopic_id", flat=True).distinct())


# ---------------------------------------------------------------------------
# Recommended exercises — for the home dashboard: subtopics the user hasn't
# started yet (in hierarchy order), then subtopics where their best score is
# weak, up to `limit`.
# ---------------------------------------------------------------------------

WEAK_SCORE_THRESHOLD = 70


def get_recommended_subtopics(user, limit=5):
    progress = progress_by_subtopic(user)
    ids_with_questions = subtopic_ids_with_questions()

    subtopics = (
        Subtopic.objects
        .filter(id__in=ids_with_questions)
        .select_related("topic__domain__subject")
        .order_by(
            "topic__domain__subject__order", "topic__domain__order",
            "topic__order", "order",
        )
    )

    not_started = []
    weak = []
    for s in subtopics:
        scores = progress.get(s.id, {})
        if not scores:
            not_started.append((s, None, "easy"))
            continue
        avg = sum(scores.values()) / len(scores)
        if avg < WEAK_SCORE_THRESHOLD:
            next_tier = next((t for t in TIERS if t not in scores), None)
            weak.append((s, round(avg, 1), next_tier or "hard"))

    weak.sort(key=lambda item: item[1])

    picks = (not_started + weak)[:limit]
    return [
        {
            "subtopic_id": s.id,
            "subtopic_name": s.name,
            "topic_name": s.topic.name,
            "domain_name": s.topic.domain.name,
            "subject_name": s.topic.domain.subject.name,
            "best_avg_score": avg,
            "suggested_tier": tier,
        }
        for s, avg, tier in picks
    ]


# ---------------------------------------------------------------------------
# Weekly progress — questions answered per week, for the dashboard chart.
# ---------------------------------------------------------------------------

def get_weekly_progress(user, weeks=8):
    today = timezone.localdate()
    this_week_start = today - timedelta(days=today.weekday())
    range_start = this_week_start - timedelta(weeks=weeks - 1)

    answers = AttemptAnswer.objects.filter(
        attempt__user=user,
        attempt__completed_at__isnull=False,
        attempt__revealed_answers=False,
        answered_at__date__gte=range_start,
    ).values_list("answered_at", "is_correct")

    buckets = {
        this_week_start - timedelta(weeks=i): {"solved": 0, "correct": 0}
        for i in range(weeks)
    }
    for answered_at, is_correct in answers:
        answered_date = timezone.localtime(answered_at).date()
        week_start = answered_date - timedelta(days=answered_date.weekday())
        bucket = buckets.get(week_start)
        if bucket is None:
            continue
        bucket["solved"] += 1
        if is_correct:
            bucket["correct"] += 1

    return [
        {"week_start": week_start.isoformat(), **counts}
        for week_start, counts in sorted(buckets.items())
    ]


# ---------------------------------------------------------------------------
# Daily problem — same question for every user on a given calendar day,
# picked deterministically so it doesn't need its own scheduling job.
# ---------------------------------------------------------------------------

def get_daily_question(on_date=None):
    on_date = on_date or timezone.localdate()
    ids = list(
        Question.objects.filter(tier__in=[Tier.EASY, Tier.MEDIUM])
        .order_by("id")
        .values_list("id", flat=True)
    )
    if not ids:
        return None
    seed = int(hashlib.sha256(on_date.isoformat().encode()).hexdigest(), 16)
    question_id = ids[seed % len(ids)]
    return (
        Question.objects
        .prefetch_related("choices", "statements")
        .get(pk=question_id)
    )
