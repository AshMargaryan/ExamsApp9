"""
Tool handlers — one function per entry in definitions.TOOL_DEFINITIONS.

Every handler's first parameter is `user`, always passed explicitly by
registry.execute() from the authenticated conversation owner, never from the
model's arguments. Handlers only ever read data (no mutation) and return
small JSON-serializable dicts.
"""

from collections import defaultdict
from datetime import timedelta

from django.utils import timezone

from apps.mistakes.models import MistakeEntry, MistakeType
from apps.mock_exams.models import MockExamAttempt, MockExamAttemptStatus, MockExamSubject
from apps.practice.services import get_recommended_subtopics
from apps.profiles.leveling import xp_progress
from apps.profiles.models import Profile, UserAchievement
from apps.profiles.subjects import SUBJECT_LABELS, subject_key_for_name
from apps.streaks.models import LearningStreak
from apps.study_plan.services import completion_status, generate_daily_plan

MISTAKE_LOOKBACK_DAYS = 30

# Every stored subject string a canonical key can appear as. MistakeEntry
# snapshots a *display name* whose language depends on where the mistake came
# from (Armenian for practice, English for mock exams/flashcards — see
# apps.profiles.subjects), so a single key has to match both.
_ENGLISH_LABELS = dict(MockExamSubject.choices)


class UnknownSubject(ValueError):
    """The model passed a `subject` we can't map to a canonical key. Raised
    rather than silently filtering to nothing: an empty result reads to the
    model as 'this student has no mistakes', which is how a filter typo
    turns into a confidently wrong answer."""


def _resolve_subject_key(subject) -> str | None:
    """Anything the model might plausibly send -> canonical subject key.

    The tool schema asks for a key, but a model that has been reading
    Armenian question text will sometimes send 'Մաթեմատիկա' or
    'Mathematics' anyway, and both of those are also what's stored in the
    database, so accept all three shapes."""
    if not subject:
        return None
    value = str(subject).strip()
    if value.casefold() in SUBJECT_LABELS:
        return value.casefold()
    key = subject_key_for_name(value)
    if key:
        return key
    for candidate, label in SUBJECT_LABELS.items():
        if label.casefold() == value.casefold():
            return candidate
    raise UnknownSubject(
        f"Unknown subject '{subject}'. Use one of: {', '.join(sorted(SUBJECT_LABELS))}."
    )


def _subject_names_for_key(key: str) -> list[str]:
    names = [SUBJECT_LABELS[key]]
    english = _ENGLISH_LABELS.get(key)
    if english:
        names.append(english)
    return names


def get_profile(*, user):
    profile, _ = Profile.objects.get_or_create(user=user)
    streak, _ = LearningStreak.objects.get_or_create(user=user)
    progress = xp_progress(profile.total_xp)

    days_until_exam = None
    if profile.target_exam_date:
        days_until_exam = (profile.target_exam_date - timezone.localdate()).days

    return {
        "grade": user.grade,
        "school": user.school.name if user.school_id else None,
        "total_xp": profile.total_xp,
        "level": progress["level"],
        "xp_into_level": progress["xp_into_level"],
        "xp_for_next_level": progress["xp_for_next_level"],
        "current_streak_days": streak.current_streak,
        "longest_streak_days": streak.longest_streak,
        "achievements_unlocked": UserAchievement.objects.filter(user=user).count(),
        "target_exam_date": profile.target_exam_date.isoformat() if profile.target_exam_date else None,
        "days_until_exam": days_until_exam,
    }


def get_progress(*, user, subject=None):
    # Both sides of this used to compare the model's `subject` string against
    # a display name — but weak topics carry Armenian practice names while
    # mock exams render English ones, so ANY single string silently matched
    # at most one of the two halves. Compare canonical keys instead.
    subject_key = _resolve_subject_key(subject)

    weak_topics = [
        {
            "subject_name": r["subject_name"],
            "subtopic_name": r["subtopic_name"],
            "mistake_count": r["mistake_count"],
            "suggested_tier": r["suggested_tier"],
        }
        for r in get_recommended_subtopics(user, limit=5)
        if not subject_key or r["subject_key"] == subject_key
    ]

    attempts = (
        MockExamAttempt.objects
        .filter(user=user, status=MockExamAttemptStatus.COMPLETED)
        .select_related("exam")
        .order_by("exam_id", "-completed_at")
    )
    if subject_key:
        attempts = attempts.filter(exam__subject=subject_key)
    latest_by_exam = {}
    for attempt in attempts:
        latest_by_exam.setdefault(attempt.exam_id, attempt)

    mock_exam_breakdown = []
    for attempt in latest_by_exam.values():
        bands = {
            "easy": {"correct": attempt.easy_correct, "total": attempt.easy_total},
            "medium": {"correct": attempt.medium_correct, "total": attempt.medium_total},
            "hard": {"correct": attempt.hard_correct, "total": attempt.hard_total},
        }
        weakest = min(
            (b for b in bands.items() if b[1]["total"] > 0),
            key=lambda b: b[1]["correct"] / b[1]["total"],
            default=None,
        )
        mock_exam_breakdown.append({
            "exam_title": attempt.exam.title,
            "subject_name": attempt.exam.get_subject_display(),
            "scaled_score": attempt.scaled_score,
            "difficulty_breakdown": bands,
            "weakest_difficulty": weakest[0] if weakest else None,
        })

    return {
        "weak_topics": weak_topics,
        "recent_mock_exams": mock_exam_breakdown,
    }


def get_mistakes(*, user, subject=None, limit=10):
    subject_key = _resolve_subject_key(subject)
    since = timezone.now() - timedelta(days=MISTAKE_LOOKBACK_DAYS)
    entries = MistakeEntry.objects.filter(user=user, created_at__gte=since)
    if subject_key:
        entries = entries.filter(subject_name__in=_subject_names_for_key(subject_key))

    grouped = defaultdict(list)
    for entry in entries:
        # Group by canonical key, not by the stored display name: the same
        # subject is spelled 'Մաթեմատիկա' by practice and 'Mathematics' by
        # mock exams, which used to split one topic into two "weakest" rows.
        key = subject_key_for_name(entry.subject_name)
        label = SUBJECT_LABELS.get(key, entry.subject_name)
        grouped[(label, entry.topic_label)].append(entry)

    ranked = sorted(grouped.items(), key=lambda kv: -len(kv[1]))[:limit]
    return {
        "lookback_days": MISTAKE_LOOKBACK_DAYS,
        "groups": [
            {
                "subject_name": subject_name,
                "topic_label": topic_label,
                "mistake_count": len(group),
                # A blank answer is logged here too (MistakeType.NOT_ATTEMPTED).
                # It counts as a gap, but it is not a wrong answer — split it
                # out so the tutor doesn't tell a student they "got these
                # wrong" when they ran out of time and left them empty.
                "not_attempted_count": sum(
                    1 for e in group if e.mistake_type == MistakeType.NOT_ATTEMPTED
                ),
                "last_mistake_at": max(e.created_at for e in group).isoformat(),
            }
            for (subject_name, topic_label), group in ranked
        ],
    }


def get_study_plan(*, user):
    plan = generate_daily_plan(user)
    tasks = []
    for task in plan.tasks.all():
        status = completion_status(task)
        tasks.append({
            "title": task.title,
            "subject_name": task.subject_name,
            "topic_label": task.topic_label,
            "task_type": task.task_type,
            "estimated_minutes": task.estimated_minutes,
            "done": status["done"],
            "progress": status["progress"],
        })

    return {
        "date": plan.date.isoformat(),
        "headline": plan.headline,
        "tasks": tasks,
    }
