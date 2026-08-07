import hashlib
from collections import defaultdict
from datetime import timedelta

from django.db.models import F
from django.utils import timezone

from .models import AttemptAnswer, MistakeSource, Question, Subtopic, Tier

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
# Weakness tracking — called every time a graded answer (Practice tier
# submission, Daily Problem, or Mock Exam) comes back incorrect. Keeps a
# running per-student mistake count per topic, which drives the ranking below.
# ---------------------------------------------------------------------------

def record_topic_mistake(student, *, source, subject_name, topic_label, subtopic=None):
    from .models import TopicMistake

    now = timezone.now()
    obj, created = TopicMistake.objects.get_or_create(
        student=student, source=source, subject_name=subject_name, topic_label=topic_label,
        defaults={"subtopic": subtopic, "incorrect_count": 1, "last_incorrect_at": now},
    )
    if not created:
        TopicMistake.objects.filter(pk=obj.pk).update(
            incorrect_count=F("incorrect_count") + 1, last_incorrect_at=now,
        )


# ---------------------------------------------------------------------------
# Recommended exercises — for the home dashboard: subtopics ranked by how
# many wrong answers the user has racked up there (most mistakes first),
# then subtopics the user hasn't started yet (in hierarchy order) filling any
# remaining slots, up to `limit`. Weak topics lead so a student with a mix of
# untouched and struggling subtopics is steered at their weak spots first.
# ---------------------------------------------------------------------------

def get_recommended_subtopics(user, limit=5):
    from .models import TopicMistake

    progress = progress_by_subtopic(user)
    ids_with_questions = subtopic_ids_with_questions()

    subtopics = {
        s.id: s for s in Subtopic.objects
        .filter(id__in=ids_with_questions)
        .select_related("topic__domain__subject")
    }
    hierarchy_order = sorted(
        subtopics.values(),
        key=lambda s: (
            s.topic.domain.subject.order, s.topic.domain.order, s.topic.order, s.order,
        ),
    )

    not_started = [(s, None, "easy") for s in hierarchy_order if not progress.get(s.id)]

    mistake_rows = (
        TopicMistake.objects
        .filter(student=user, source=MistakeSource.PRACTICE, subtopic_id__in=subtopics.keys())
        .values_list("subtopic_id", "incorrect_count", "last_incorrect_at")
    )
    mistakes_by_subtopic = defaultdict(lambda: [0, None])
    for subtopic_id, count, last_at in mistake_rows:
        entry = mistakes_by_subtopic[subtopic_id]
        entry[0] += count
        if entry[1] is None or last_at > entry[1]:
            entry[1] = last_at

    weak = []
    for subtopic_id, (count, last_at) in mistakes_by_subtopic.items():
        s = subtopics.get(subtopic_id)
        scores = progress.get(subtopic_id)
        if s is None or not scores or count <= 0:
            continue
        next_tier = next((t for t in TIERS if t not in scores), None)
        weak.append((s, count, last_at, next_tier or "hard"))

    # Highest mistake frequency first; ties broken by the most recent mistake,
    # so recent wrong answers also nudge future recommendations, not just totals.
    weak.sort(key=lambda item: (-item[1], -(item[2].timestamp() if item[2] else 0)))

    picks = ([(s, count, tier) for s, count, _, tier in weak] + not_started)[:limit]
    return [
        {
            "subtopic_id": s.id,
            "subtopic_name": s.name,
            "topic_name": s.topic.name,
            "domain_name": s.topic.domain.name,
            "subject_name": s.topic.domain.subject.name,
            "mistake_count": count,
            "suggested_tier": tier,
        }
        for s, count, tier in picks
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
