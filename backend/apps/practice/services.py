import hashlib
from collections import defaultdict
from datetime import timedelta

from django.db.models import F
from django.utils import timezone

from apps.profiles.subjects import canonical_key_for_practice_subject

from .models import (
    AttemptAnswer, DailyProblemAttempt, MistakeSource, Question, Subtopic, Tier, TopicMistake,
)

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
            "subject_key": canonical_key_for_practice_subject(s.topic.domain.subject),
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
# Daily problem — personalized when possible. If the user has an existing
# answer for `on_date`, that exact question is returned (so a re-fetch after
# other practice activity never disagrees with what was actually answered).
# Otherwise, if the user has a weak subtopic (TopicMistake, most mistakes
# first), an easy/medium question from that subtopic is picked, chosen
# deterministically via a hash of (user id, date) so repeat GETs the same day
# are stable. Falls back to the original global-deterministic pick (same
# question for everyone) when there's no personalization signal yet — new
# users / empty state behave exactly as before.
# ---------------------------------------------------------------------------

def _pick_question(ids, seed_text):
    if not ids:
        return None
    seed = int(hashlib.sha256(seed_text.encode()).hexdigest(), 16)
    question_id = ids[seed % len(ids)]
    return (
        Question.objects
        .select_related("subtopic__topic__domain__subject")
        .prefetch_related("choices", "statements")
        .get(pk=question_id)
    )


def get_daily_question(user=None, on_date=None):
    on_date = on_date or timezone.localdate()

    if user is not None and user.is_authenticated:
        existing = DailyProblemAttempt.objects.filter(user=user, date=on_date).first()
        if existing is not None:
            return existing.question

        weakest = (
            TopicMistake.objects
            .filter(student=user, source=MistakeSource.PRACTICE, subtopic__isnull=False)
            .order_by("-incorrect_count", "-last_incorrect_at")
            .first()
        )
        if weakest is not None:
            ids = list(
                Question.objects.filter(
                    subtopic_id=weakest.subtopic_id, tier__in=[Tier.EASY, Tier.MEDIUM],
                ).order_by("id").values_list("id", flat=True)
            )
            question = _pick_question(ids, f"{user.id}:{on_date.isoformat()}")
            if question is not None:
                return question

    ids = list(
        Question.objects.filter(tier__in=[Tier.EASY, Tier.MEDIUM])
        .order_by("id")
        .values_list("id", flat=True)
    )
    return _pick_question(ids, on_date.isoformat())


def get_daily_question_reason(user, question):
    """Why this question was chosen — computed live from the displayed
    question's own subtopic mistake data, so it stays honest even as that
    data changes after the fact (e.g. the topic later gets mastered)."""
    if user is None or not user.is_authenticated or question is None or question.subtopic_id is None:
        return {"kind": "default"}
    mistake = TopicMistake.objects.filter(
        student=user, source=MistakeSource.PRACTICE, subtopic_id=question.subtopic_id,
    ).first()
    if mistake is not None and mistake.incorrect_count > 0:
        return {
            "kind": "weak_topic",
            "topic_label": mistake.topic_label,
            "incorrect_count": mistake.incorrect_count,
        }
    return {"kind": "default"}
