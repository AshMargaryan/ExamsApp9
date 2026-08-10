"""
Pure, read-only aggregation functions for the student profile's analytics
sections (subject mastery, skill map, Learning DNA, Academic Power score,
personal records, month-over-month growth, and the rule-based AI coach /
next-mission text).

Every number here is derived from real rows in apps.practice / apps.mock_exams
/ apps.flashcards / apps.streaks / apps.activity / apps.rankings — nothing is
invented. Where there isn't enough data to compute something honestly, a
function returns an explicit "locked" / "not enough data" shape instead of a
fake number or a 0%.
"""
from collections import defaultdict
from datetime import timedelta

from django.db.models import Count, F, Q, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone

from apps.activity.models import StudySession
from apps.flashcards.models import FlashcardProgress, FlashcardProgressStatus, FlashcardReview
from apps.mistakes.models import MistakeEntry
from apps.mock_exams.models import MockExamAttempt, MockExamAttemptStatus
from apps.practice.models import AttemptAnswer, DailyProblemAttempt, PracticeAttempt, Tier, Topic, TopicMistake
from apps.practice.views import XP_PER_CORRECT_PRACTICE_ANSWER
from apps.rankings.models import MonthlyXP, RankHistory, RankingAward
from apps.streaks.models import LearningStreak

from .models import GoalType, UserAchievement
from .subjects import PRACTICE_SUBJECT_NAMES as _PRACTICE_SUBJECT_NAMES
from .subjects import SUBJECT_LABELS


def _locked(current: int, needed: int, unit: str) -> dict:
    return {
        "locked": True,
        "current": current,
        "needed": needed,
        "reason": f"Պետք է առնվազն {needed} {unit}, առայժմ ունեք {current}։",
    }


def _completed_answers(user, subject_name=None):
    qs = AttemptAnswer.objects.filter(
        attempt__user=user,
        attempt__completed_at__isnull=False,
        attempt__revealed_answers=False,
    )
    if subject_name is not None:
        qs = qs.filter(attempt__subtopic__topic__domain__subject__name=subject_name)
    return qs


def _accuracy_from_qs(qs):
    total = qs.count()
    if not total:
        return None, 0, 0
    correct = qs.filter(is_correct=True).count()
    return round(correct / total * 100, 1), correct, total


def _completed_mock_attempts(user, subject_key=None):
    qs = MockExamAttempt.objects.filter(user=user, status=MockExamAttemptStatus.COMPLETED)
    if subject_key is not None:
        qs = qs.filter(exam__subject=subject_key)
    return qs


def _study_seconds_between(user, start, end) -> int:
    """Same overlap logic as apps.activity.services.total_seconds_since, but
    bounded on both ends instead of just a lower bound — needed for
    month-over-month comparisons rather than "since X until now"."""
    sessions = StudySession.objects.filter(user=user, started_at__lt=end).filter(
        Q(ended_at__gte=start) | Q(ended_at__isnull=True, last_activity_at__gte=start)
    )
    total = timedelta()
    for session in sessions:
        effective_end = min(session.ended_at or session.last_activity_at, end)
        effective_start = max(session.started_at, start)
        if effective_end > effective_start:
            total += effective_end - effective_start
    return int(total.total_seconds())


# ---------------------------------------------------------------------------
# Subject mastery + skill map
# ---------------------------------------------------------------------------

def _recent_trend(user, practice_name, mock_key):
    now = timezone.now()
    cutoff = now - timedelta(days=30)
    prior_cutoff = now - timedelta(days=60)

    def window_accuracy(start, end):
        correct = total = 0
        if practice_name:
            qs = _completed_answers(user, practice_name).filter(answered_at__gte=start, answered_at__lt=end)
            total += qs.count()
            correct += qs.filter(is_correct=True).count()
        mock_totals = _completed_mock_attempts(user, mock_key).filter(
            completed_at__gte=start, completed_at__lt=end,
        ).aggregate(
            correct=Sum(F("easy_correct") + F("medium_correct") + F("hard_correct")),
            total=Sum(F("easy_total") + F("medium_total") + F("hard_total")),
        )
        total += mock_totals["total"] or 0
        correct += mock_totals["correct"] or 0
        return correct, total

    recent_correct, recent_total = window_accuracy(cutoff, now)
    prior_correct, prior_total = window_accuracy(prior_cutoff, cutoff)
    if recent_total < 3 or prior_total < 3:
        return None
    recent_pct = round(recent_correct / recent_total * 100, 1)
    prior_pct = round(prior_correct / prior_total * 100, 1)
    return {"recent": recent_pct, "prior": prior_pct, "delta": round(recent_pct - prior_pct, 1)}


def subject_mastery(user) -> list:
    results = []
    for key, label in SUBJECT_LABELS.items():
        sources = {}
        practice_name = _PRACTICE_SUBJECT_NAMES.get(key)

        if practice_name:
            pct, _, total = _accuracy_from_qs(_completed_answers(user, practice_name))
            if total:
                sources["practice"] = pct

        mock_qs = _completed_mock_attempts(user, key)
        mock_totals = mock_qs.aggregate(
            correct=Sum(F("easy_correct") + F("medium_correct") + F("hard_correct")),
            total=Sum(F("easy_total") + F("medium_total") + F("hard_total")),
        )
        if mock_totals["total"]:
            sources["mock_exam"] = round(mock_totals["correct"] / mock_totals["total"] * 100, 1)

        progress = FlashcardProgress.objects.filter(user=user, card__deck__subject=key).exclude(
            status=FlashcardProgressStatus.NEW
        )
        reviewed_count = progress.count()
        if reviewed_count:
            known_count = progress.filter(status=FlashcardProgressStatus.KNOWN).count()
            sources["flashcards"] = round(known_count / reviewed_count * 100, 1)

        mastery = round(sum(sources.values()) / len(sources), 1) if sources else None

        # Difficulty handling: hard-tier accuracy from practice + mock exam
        # only — flashcard "difficulty" is content metadata, not a
        # performance signal, so it's excluded here.
        hard_correct = hard_total = 0
        if practice_name:
            hard_qs = _completed_answers(user, practice_name).filter(attempt__tier=Tier.HARD)
            hard_total += hard_qs.count()
            hard_correct += hard_qs.filter(is_correct=True).count()
        mock_hard = mock_qs.aggregate(correct=Sum("hard_correct"), total=Sum("hard_total"))
        hard_total += mock_hard["total"] or 0
        hard_correct += mock_hard["correct"] or 0
        difficulty_handling = round(hard_correct / hard_total * 100, 1) if hard_total else None

        results.append({
            "key": key,
            "label": label,
            "mastery": mastery,
            "sources": sources,
            "difficulty_handling": difficulty_handling,
            "trend": _recent_trend(user, practice_name, key),
            "has_data": bool(sources),
        })
    return results


def skill_map(user, subject_key: str) -> dict:
    practice_name = _PRACTICE_SUBJECT_NAMES.get(subject_key)
    if not practice_name:
        return {
            "available": False,
            "reason": "Այս առարկայի համար դեռ վարժություններ չկան Gitus-ում։",
        }

    attempts = PracticeAttempt.objects.filter(
        user=user,
        subtopic__topic__domain__subject__name=practice_name,
        completed_at__isnull=False,
        revealed_answers=False,
    ).select_related("subtopic__topic__domain")

    scores_by_topic = defaultdict(list)
    for attempt in attempts:
        scores_by_topic[attempt.subtopic.topic].append(attempt.score or 0)

    attempted_rows = [
        {
            "id": topic.id,
            "name": topic.name,
            "domain": topic.domain.name,
            "mastery": round(sum(scores) / len(scores), 1),
            "attempts": len(scores),
        }
        for topic, scores in scores_by_topic.items()
    ]
    attempted_ids = {row["id"] for row in attempted_rows}

    locked_rows = [
        {"id": topic.id, "name": topic.name, "domain": topic.domain.name, "mastery": None, "attempts": 0}
        for topic in Topic.objects.filter(domain__subject__name=practice_name).select_related("domain")
        if topic.id not in attempted_ids
    ]

    return {"available": True, "topics": attempted_rows + locked_rows}


# ---------------------------------------------------------------------------
# Learning DNA
# ---------------------------------------------------------------------------

def learning_dna(user) -> dict:
    dims = {}

    answers = _completed_answers(user)
    total_q = answers.count()
    if total_q >= 20:
        pct, _, _ = _accuracy_from_qs(answers)
        dims["accuracy"] = {"value": pct, "basis": f"{total_q} պատասխանված հարցի հիման վրա"}
    else:
        dims["accuracy"] = _locked(total_q, 20, "պատասխանված հարց")

    since_60 = timezone.now() - timedelta(days=60)
    active_days = (
        StudySession.objects.filter(user=user, started_at__gte=since_60)
        .annotate(day=TruncDate("started_at"))
        .values("day")
        .distinct()
        .count()
    )
    if active_days >= 7:
        dims["consistency"] = {
            "value": min(round(active_days / 60 * 100, 1), 100.0),
            "basis": f"{active_days} ակտիվ օր վերջին 60 օրում",
        }
    else:
        dims["consistency"] = _locked(active_days, 7, "ակտիվ օր (վերջին 60 օրում)")

    hard_qs = answers.filter(attempt__tier=Tier.HARD)
    hard_total = hard_qs.count()
    hard_correct = hard_qs.filter(is_correct=True).count()
    mock_hard = _completed_mock_attempts(user).aggregate(correct=Sum("hard_correct"), total=Sum("hard_total"))
    hard_total += mock_hard["total"] or 0
    hard_correct += mock_hard["correct"] or 0
    if hard_total >= 10:
        dims["difficulty_tolerance"] = {
            "value": round(hard_correct / hard_total * 100, 1),
            "basis": f"{hard_total} բարդ մակարդակի հարցի հիման վրա",
        }
    else:
        dims["difficulty_tolerance"] = _locked(hard_total, 10, "բարդ մակարդակի հարց")

    reviews = FlashcardReview.objects.filter(user=user)
    review_count = reviews.count()
    if review_count >= 20:
        good_count = reviews.filter(grade__in=["good", "easy"]).count()
        dims["memory_retention"] = {
            "value": round(good_count / review_count * 100, 1),
            "basis": f"{review_count} կրկնության հիման վրա",
        }
    else:
        dims["memory_retention"] = _locked(review_count, 20, "ֆլեշքարտի կրկնություն")

    completed_mocks = _completed_mock_attempts(user).exclude(scaled_score__isnull=True).order_by("-completed_at")
    mock_count = completed_mocks.count()
    if mock_count >= 1:
        last_three = list(completed_mocks[:3])
        dims["exam_readiness"] = {
            "value": round(sum(a.scaled_score for a in last_three) / len(last_three), 1),
            "basis": f"վերջին {len(last_three)} ավարտված փորձնական քննության միջինը",
            "provisional": mock_count < 3,
        }
    else:
        dims["exam_readiness"] = _locked(mock_count, 1, "ավարտված փորձնական քննություն")

    return dims


# ---------------------------------------------------------------------------
# Academic Power score
# ---------------------------------------------------------------------------

def _knowledge_breadth(user) -> float:
    distinct_subtopics = (
        PracticeAttempt.objects.filter(user=user, completed_at__isnull=False).values("subtopic").distinct().count()
    )
    distinct_subjects = 0
    for key in SUBJECT_LABELS:
        practice_name = _PRACTICE_SUBJECT_NAMES.get(key)
        has_practice = practice_name and _completed_answers(user, practice_name).exists()
        has_mock = _completed_mock_attempts(user, key).exists()
        has_flashcards = (
            FlashcardProgress.objects.filter(user=user, card__deck__subject=key)
            .exclude(status=FlashcardProgressStatus.NEW)
            .exists()
        )
        if has_practice or has_mock or has_flashcards:
            distinct_subjects += 1
    return min(100.0, distinct_subtopics * 4 + distinct_subjects * 15)


def academic_power(user) -> dict:
    total_answers = _completed_answers(user).count()
    completed_mocks = _completed_mock_attempts(user).count()
    flashcard_reviews = FlashcardReview.objects.filter(user=user).count()
    if not (total_answers or completed_mocks or flashcard_reviews):
        return {"available": False}

    components = {}

    accuracy_pct, _, accuracy_total = _accuracy_from_qs(_completed_answers(user))
    mock_totals = _completed_mock_attempts(user).aggregate(
        correct=Sum(F("easy_correct") + F("medium_correct") + F("hard_correct")),
        total=Sum(F("easy_total") + F("medium_total") + F("hard_total")),
    )
    combined_correct = (accuracy_pct is not None and int(accuracy_pct / 100 * accuracy_total) or 0) + (
        mock_totals["correct"] or 0
    )
    combined_total = accuracy_total + (mock_totals["total"] or 0)
    if combined_total:
        components["accuracy"] = round(combined_correct / combined_total * 100, 1)

    since_30 = timezone.now() - timedelta(days=30)
    active_days_30 = (
        StudySession.objects.filter(user=user, started_at__gte=since_30)
        .annotate(day=TruncDate("started_at"))
        .values("day")
        .distinct()
        .count()
    )
    if active_days_30:
        components["consistency"] = min(100.0, round(active_days_30 / 30 * 100, 1))

    hard_qs = _completed_answers(user).filter(attempt__tier=Tier.HARD)
    hard_total = hard_qs.count()
    hard_correct = hard_qs.filter(is_correct=True).count()
    mock_hard = _completed_mock_attempts(user).aggregate(correct=Sum("hard_correct"), total=Sum("hard_total"))
    hard_total += mock_hard["total"] or 0
    hard_correct += mock_hard["correct"] or 0
    if hard_total:
        components["difficulty"] = round(hard_correct / hard_total * 100, 1)

    components["knowledge"] = round(_knowledge_breadth(user), 1)

    g = growth(user)
    if g["has_enough_data"] and g["accuracy_delta"] is not None:
        # Neutral (no change) = 50; every +/-1% accuracy shifts the growth
        # component by 2.5 points, clamped to [0, 100].
        components["growth"] = round(min(100.0, max(0.0, 50 + g["accuracy_delta"] * 2.5)), 1)

    power = round(sum(components.values()) / len(components) * 10)
    return {"available": True, "power": power, "components": components}


# ---------------------------------------------------------------------------
# Personal records
# ---------------------------------------------------------------------------

def personal_records(user) -> dict:
    best_test = (
        _completed_mock_attempts(user).exclude(scaled_score__isnull=True).order_by("-scaled_score").first()
    )
    streak, _ = LearningStreak.objects.get_or_create(user=user)
    busiest_day = (
        _completed_answers(user)
        .annotate(day=TruncDate("answered_at"))
        .values("day")
        .annotate(count=Count("id"))
        .order_by("-count")
        .first()
    )
    longest_session_seconds = 0
    for session in StudySession.objects.filter(user=user, ended_at__isnull=False):
        duration = (session.ended_at - session.started_at).total_seconds()
        if duration > longest_session_seconds:
            longest_session_seconds = duration
    best_month = MonthlyXP.objects.filter(user=user).order_by("-xp").first()
    best_rank = RankHistory.objects.filter(user=user, scope="global").order_by("rank").first()

    return {
        "highest_test_score": round(best_test.scaled_score, 1) if best_test else None,
        "longest_streak_days": streak.longest_streak or None,
        "most_questions_in_a_day": busiest_day["count"] if busiest_day else None,
        "longest_study_session_seconds": int(longest_session_seconds) or None,
        "best_month_xp": best_month.xp if best_month else None,
        "best_rank_ever": best_rank.rank if best_rank else None,
    }


# ---------------------------------------------------------------------------
# Growth ("you vs you")
# ---------------------------------------------------------------------------

def _period_stats(user, start, end) -> dict:
    answers = _completed_answers(user).filter(answered_at__gte=start, answered_at__lt=end)
    total = answers.count()
    correct = answers.filter(is_correct=True).count()
    return {
        "questions": total,
        "accuracy": round(correct / total * 100, 1) if total else None,
        "tests": _completed_mock_attempts(user).filter(completed_at__gte=start, completed_at__lt=end).count(),
        "study_seconds": _study_seconds_between(user, start, end),
    }


def growth(user) -> dict:
    now = timezone.now()
    this_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    prev_start = (
        this_start.replace(year=this_start.year - 1, month=12)
        if this_start.month == 1
        else this_start.replace(month=this_start.month - 1)
    )

    this_period = _period_stats(user, this_start, now)
    prev_period = _period_stats(user, prev_start, this_start)

    accuracy_delta = None
    if this_period["accuracy"] is not None and prev_period["accuracy"] is not None:
        accuracy_delta = round(this_period["accuracy"] - prev_period["accuracy"], 1)

    return {
        "this_month": this_period,
        "previous_month": prev_period,
        "accuracy_delta": accuracy_delta,
        "questions_delta": this_period["questions"] - prev_period["questions"],
        "study_seconds_delta": this_period["study_seconds"] - prev_period["study_seconds"],
        "tests_delta": this_period["tests"] - prev_period["tests"],
        "has_enough_data": this_period["questions"] >= 3 and prev_period["questions"] >= 3,
    }


# ---------------------------------------------------------------------------
# Activity heatmap
# ---------------------------------------------------------------------------

def activity_heatmap(user, days: int = 365) -> list:
    """One row per active day: study minutes, questions solved/correct,
    tests completed. A session's minutes are attributed entirely to its
    start date (local time) — sessions crossing midnight are a rare,
    small approximation given the 5-minute idle-close session model."""
    since = timezone.now() - timedelta(days=days)

    minutes_by_day = defaultdict(float)
    for session in StudySession.objects.filter(user=user, started_at__gte=since):
        end = session.ended_at or session.last_activity_at
        duration_minutes = max(0.0, (end - session.started_at).total_seconds() / 60)
        day = timezone.localtime(session.started_at).date()
        minutes_by_day[day] += duration_minutes

    answers_by_day = {
        row["day"]: row
        for row in (
            _completed_answers(user)
            .filter(answered_at__gte=since)
            .annotate(day=TruncDate("answered_at"))
            .values("day")
            .annotate(total=Count("id"), correct=Count("id", filter=Q(is_correct=True)))
        )
    }
    tests_by_day = {
        row["day"]: row["count"]
        for row in (
            _completed_mock_attempts(user)
            .filter(completed_at__gte=since)
            .annotate(day=TruncDate("completed_at"))
            .values("day")
            .annotate(count=Count("id"))
        )
    }

    all_days = set(minutes_by_day) | set(answers_by_day) | set(tests_by_day)
    return [
        {
            "date": day.isoformat(),
            "minutes": round(minutes_by_day.get(day, 0)),
            "questions_solved": answers_by_day[day]["total"] if day in answers_by_day else 0,
            "correct_answers": answers_by_day[day]["correct"] if day in answers_by_day else 0,
            "tests_completed": tests_by_day.get(day, 0),
        }
        for day in sorted(all_days)
    ]


# ---------------------------------------------------------------------------
# AI Coach + Next Mission (rule-based — real numbers, template sentences, no LLM)
# ---------------------------------------------------------------------------

def _weakest_topic_mistake(user):
    since_30 = timezone.now() - timedelta(days=30)
    recent = (
        TopicMistake.objects.filter(student=user, last_incorrect_at__gte=since_30)
        .order_by("-incorrect_count")
        .first()
    )
    return recent or TopicMistake.objects.filter(student=user).order_by("-incorrect_count").first()


def coach(user) -> dict:
    mistake = _weakest_topic_mistake(user)
    if mistake is None:
        return {"available": False, "reason": "Դեռ բավարար տվյալներ չկան Ձեր վերլուծության համար։ Շարունակեք սովորել։"}

    total_mistakes = TopicMistake.objects.filter(student=user).aggregate(total=Sum("incorrect_count"))["total"] or 0
    share = round(mistake.incorrect_count / total_mistakes * 100) if total_mistakes else 0

    g = growth(user)
    situation = None
    if g["accuracy_delta"] is not None:
        if g["accuracy_delta"] > 0:
            situation = f"Ձեր ճշգրտությունը բարձրացել է {g['accuracy_delta']}%-ով նախորդ ամսվա համեմատ։"
        elif g["accuracy_delta"] < 0:
            situation = f"Ձեր ճշգրտությունը նվազել է {abs(g['accuracy_delta'])}%-ով նախորդ ամսվա համեմատ։"
        else:
            situation = "Ձեր ճշգրտությունը կայուն է մնացել նախորդ ամսվա համեմատ։"

    return {
        "available": True,
        "situation": situation,
        "weakness": f"«{mistake.topic_label}» թեման Ձեր ամենամեծ խնդիրն է հենց հիմա։",
        "opportunity": f"Այս թեմայի սխալները կազմում են Ձեր վերջին սխալների {share}%-ը։",
        "recommendation": f"Հաջորդ լավագույն քայլը՝ վերանայել «{mistake.topic_label}» թեմայի սխալները։",
        "evidence": {
            "topic": mistake.topic_label,
            "incorrect_count": mistake.incorrect_count,
            "mistake_share_percent": share,
            "accuracy_delta": g["accuracy_delta"],
            "last_incorrect_at": mistake.last_incorrect_at.isoformat() if mistake.last_incorrect_at else None,
        },
    }


def next_mission(user) -> dict:
    mistake = _weakest_topic_mistake(user)
    if mistake is None:
        return {"available": False, "reason": "Դեռ բավարար տվյալներ չկան առաջադրանք առաջարկելու համար։"}

    if mistake.subtopic_id is not None:
        question_count = min(max(mistake.incorrect_count * 2, 4), 20)
        estimated_minutes = max(5, round(question_count * 1.5))
        return {
            "available": True,
            "title": f"Ուղղեք «{mistake.subtopic.name}» թեմայի սխալները",
            "question_count": question_count,
            "estimated_minutes": estimated_minutes,
            "potential_xp": question_count * XP_PER_CORRECT_PRACTICE_ANSWER,
            "reason": f"«{mistake.topic_label}» թեմայում ունեք {mistake.incorrect_count} սխալ պատասխան։",
            "cta": {"type": "practice_subtopic", "subtopic_id": mistake.subtopic_id, "tier": "medium"},
        }

    return {
        "available": True,
        "title": f"Վերանայեք «{mistake.topic_label}» թեման",
        "question_count": None,
        "estimated_minutes": None,
        "potential_xp": None,
        "reason": f"«{mistake.topic_label}» թեմայում ունեք {mistake.incorrect_count} սխալ պատասխան փորձնական քննություններում։",
        "cta": {"type": "mock_exams"},
    }


# ---------------------------------------------------------------------------
# Today's study mission checklist (home page) — real progress only, no
# fabricated targets. Reuses next_mission() for the practice-question target
# where available so the checklist and the mission card never disagree.
# ---------------------------------------------------------------------------

def today_checklist(user) -> dict:
    today = timezone.localdate()

    daily_done = DailyProblemAttempt.objects.filter(user=user, date=today).exists()

    practice_today = _completed_answers(user).filter(answered_at__date=today).count()
    mission = next_mission(user)
    practice_target = (
        mission["question_count"]
        if mission.get("available") and mission.get("question_count")
        else 5
    )

    # "Open" = not successfully resolved on a *previous* day. A mistake
    # resolved today still counts as open (so the target doesn't shrink out
    # from under the student the moment they finish reviewing it today) —
    # only resolutions from before today drop out of the target.
    resolved_before_today = Q(last_retry_correct=True) & ~Q(last_retried_at__date=today)
    open_mistakes = MistakeEntry.objects.filter(user=user).exclude(resolved_before_today).count()
    mistakes_target = min(2, open_mistakes)
    mistakes_reviewed_today = MistakeEntry.objects.filter(
        user=user, last_retried_at__date=today,
    ).count()

    items = [
        {
            "key": "practice",
            "done": min(practice_today, practice_target),
            "target": practice_target,
            "complete": practice_today >= practice_target,
        },
        {
            "key": "mistakes",
            "done": min(mistakes_reviewed_today, mistakes_target),
            "target": mistakes_target,
            "complete": mistakes_target == 0 or mistakes_reviewed_today >= mistakes_target,
        },
        {
            "key": "daily_problem",
            "done": 1 if daily_done else 0,
            "target": 1,
            "complete": daily_done,
        },
    ]
    completed_count = sum(1 for item in items if item["complete"])
    return {
        "items": items,
        "completed_count": completed_count,
        "total_count": len(items),
        "all_complete": completed_count == len(items),
        "estimated_minutes": mission.get("estimated_minutes") if mission.get("available") else None,
    }


# ---------------------------------------------------------------------------
# Profile completion
# ---------------------------------------------------------------------------

_COMPLETION_FIELDS = [
    ("avatar", "Պրոֆիլի նկար"),
    ("bio", "Բիո"),
    ("school", "Դպրոց"),
    ("grade", "Դասարան"),
    ("university", "Ցանկալի բուհ"),
    ("target_major", "Մասնագիտություն"),
]


def profile_completion(user) -> dict:
    profile = user.profile
    values = {
        "avatar": bool(profile.avatar),
        "bio": bool(profile.bio),
        "school": user.school_id is not None,
        "grade": user.grade is not None,
        "university": user.university_id is not None,
        "target_major": bool(profile.target_major),
    }
    completed = [label for key, label in _COMPLETION_FIELDS if values[key]]
    missing = [label for key, label in _COMPLETION_FIELDS if not values[key]]
    percent = round(len(completed) / len(_COMPLETION_FIELDS) * 100)
    return {"percent": percent, "completed": completed, "missing": missing}


# ---------------------------------------------------------------------------
# Recent activity / study journey timeline
# ---------------------------------------------------------------------------

def timeline(user, limit: int = 40) -> list:
    """Merges achievement unlocks, ranking awards, and per-day study
    summaries (last 60 days, same source rows as activity_heatmap) into one
    chronological feed. Serves both "Recent Activity" and "Study Journey" —
    they're the same underlying data, no need for two separate sections."""
    entries = []

    for ua in UserAchievement.objects.filter(user=user).select_related("achievement"):
        entries.append({
            "type": "achievement",
            "date": timezone.localtime(ua.unlocked_at).date().isoformat(),
            "title": f"Ստացավ «{ua.achievement.name}» կրծքանշանը",
            "icon": ua.achievement.icon or "🏆",
            "xp_reward": ua.achievement.xp_reward,
        })

    for award in RankingAward.objects.filter(user=user):
        entries.append({
            "type": "ranking_award",
            "date": award.awarded_at.date().isoformat(),
            "title": award.title,
            "rank": award.rank,
        })

    for day_row in activity_heatmap(user, days=60):
        if not (day_row["minutes"] or day_row["questions_solved"] or day_row["tests_completed"]):
            continue
        entries.append({
            "type": "study_day",
            "date": day_row["date"],
            "minutes": day_row["minutes"],
            "questions_solved": day_row["questions_solved"],
            "correct_answers": day_row["correct_answers"],
            "tests_completed": day_row["tests_completed"],
        })

    entries.sort(key=lambda e: e["date"], reverse=True)
    return entries[:limit]


# ---------------------------------------------------------------------------
# Personal goals
# ---------------------------------------------------------------------------

def _goal_percent(current: float, target: float) -> int:
    if not target:
        return 0
    return min(100, round(current / target * 100))


def goal_progress(goal) -> dict:
    """Progress for one PersonalGoal, always computed live from real rows —
    same philosophy as every other function in this module. CUSTOM goals
    have no computable metric; they're self-reported done by the student."""
    user = goal.user

    if goal.goal_type == GoalType.CUSTOM:
        is_complete = goal.completed_at is not None
        return {"current": None, "target": None, "unit": None, "percent": 100 if is_complete else 0, "is_complete": is_complete}

    if goal.goal_type == GoalType.SUBJECT_ACCURACY:
        subject_name = goal.subject.name if goal.subject else None
        pct, _, total = _accuracy_from_qs(_completed_answers(user, subject_name)) if subject_name else (None, 0, 0)
        current = pct if pct is not None else 0.0
        return {
            "current": current, "target": goal.target_value, "unit": "%",
            "percent": _goal_percent(current, goal.target_value), "is_complete": current >= goal.target_value,
            "has_data": total > 0,
        }

    if goal.goal_type == GoalType.TESTS_THIS_WEEK:
        week_start = timezone.now() - timedelta(days=7)
        current = _completed_mock_attempts(user).filter(completed_at__gte=week_start).count()
        return {
            "current": current, "target": goal.target_value, "unit": "թեստ",
            "percent": _goal_percent(current, goal.target_value), "is_complete": current >= goal.target_value,
        }

    if goal.goal_type == GoalType.STREAK_DAYS:
        streak, _ = LearningStreak.objects.get_or_create(user=user)
        current = streak.current_streak
        return {
            "current": current, "target": goal.target_value, "unit": "օր",
            "percent": _goal_percent(current, goal.target_value), "is_complete": current >= goal.target_value,
        }

    if goal.goal_type == GoalType.STUDY_HOURS_MONTH:
        month_start = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        seconds = _study_seconds_between(user, month_start, timezone.now())
        current = round(seconds / 3600, 1)
        return {
            "current": current, "target": goal.target_value, "unit": "ժ",
            "percent": _goal_percent(current, goal.target_value), "is_complete": current >= goal.target_value,
        }

    if goal.goal_type == GoalType.XP_THIS_MONTH:
        today = timezone.localdate()
        monthly = MonthlyXP.objects.filter(user=user, year=today.year, month=today.month).first()
        current = monthly.xp if monthly else 0
        return {
            "current": current, "target": goal.target_value, "unit": "XP",
            "percent": _goal_percent(current, goal.target_value), "is_complete": current >= goal.target_value,
        }

    return {"current": None, "target": goal.target_value, "unit": None, "percent": 0, "is_complete": False}
