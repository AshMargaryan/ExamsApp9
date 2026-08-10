"""
Assembles the "AI coach" panel shown alongside the daily plan: today's real
progress numbers, a per-subject weakness breakdown, a spaced-repetition-style
review reminder, an exam pacing strategy, and a real 7-day recap. Every
number here is computed live from existing apps.profiles.analytics helpers
(the same ones the profile page uses) — nothing is stored or fabricated.

The general "coach insight" card (situation/weakness/opportunity/
recommendation) and exam countdown/goal fields already exist end-to-end via
/api/profile/home-insight/ and /api/profile/me/ — the frontend fetches
those directly rather than duplicating them here.
"""
from django.utils import timezone

from apps.profiles import analytics

from .models import StudyTaskType
from .services import completion_status

REVIEW_STALENESS_DAYS = 2


def _today_and_week(user):
    week_days = analytics.activity_heatmap(user, days=7)
    today_str = timezone.localdate().isoformat()
    today_row = next((d for d in week_days if d["date"] == today_str), None) or {
        "minutes": 0, "questions_solved": 0, "correct_answers": 0,
    }
    return today_row, week_days


def _weakness_breakdown(mastery):
    with_data = sorted(
        (m for m in mastery if m["has_data"] and m["mastery"] is not None),
        key=lambda m: m["mastery"],
    )
    return with_data, [{"label": m["label"], "pct": round(m["mastery"])} for m in with_data[:3]]


def _week_narrative(mastery, with_data):
    improving = [m for m in mastery if m["has_data"] and m["trend"] and m["trend"]["delta"] > 0]
    most_improved = max(improving, key=lambda m: m["trend"]["delta"], default=None)
    needs_work = with_data[0] if with_data else None

    parts = []
    if most_improved:
        parts.append(f"Այս շաբաթ ամենամեծ առաջընթացը ունեցել ես {most_improved['label']}-ում։")
    if needs_work and (not most_improved or needs_work["key"] != most_improved["key"]):
        parts.append(f"Ամենաշատ աշխատանքի կարիք դեռ ունի {needs_work['label']}-ը։")
    return " ".join(parts) or "Այս շաբաթ դեռ բավարար տվյալներ չկան միտումներ գնահատելու համար։"


def _pacing_strategy(days_left, days_studied_this_week):
    if days_left is None:
        return None
    if days_left <= 30:
        recommended_days, recommended_minutes = 6, "40–50"
    elif days_left <= 90:
        recommended_days, recommended_minutes = 5, "30–40"
    else:
        recommended_days, recommended_minutes = 4, "25–35"
    return {
        "days_left": days_left,
        "current_pace_days": days_studied_this_week,
        "recommended_days_per_week": recommended_days,
        "recommended_minutes_per_day": recommended_minutes,
        "is_behind": days_studied_this_week < recommended_days,
    }


def _review_reminder(coach_data, mission_data):
    if not coach_data.get("available"):
        return None
    evidence = coach_data["evidence"]
    last_incorrect_at = evidence.get("last_incorrect_at")
    if not last_incorrect_at:
        return None

    last_date = timezone.datetime.fromisoformat(last_incorrect_at).date()
    days_since = (timezone.localdate() - last_date).days
    if days_since < REVIEW_STALENESS_DAYS:
        return None

    link_path = None
    if mission_data.get("available") and mission_data["cta"]["type"] == "practice_subtopic":
        cta = mission_data["cta"]
        link_path = f"/practice/subtopic/{cta['subtopic_id']}/{cta['tier']}"

    return {
        "topic_label": evidence["topic"],
        "days_since": days_since,
        "link_path": link_path,
    }


def build_coach_panel(user, plan):
    tasks = list(plan.tasks.all())
    statuses = [completion_status(t) for t in tasks]
    done_count = sum(1 for s in statuses if s["done"])
    total_count = len(tasks)
    minutes_total = sum(t.estimated_minutes for t in tasks)
    minutes_done = sum(t.estimated_minutes for t, s in zip(tasks, statuses) if s["done"])

    today_row, week_days = _today_and_week(user)
    questions_today = today_row["questions_solved"]
    correct_today = today_row["correct_answers"]
    accuracy_today = round(correct_today / questions_today * 100) if questions_today else 0

    week_minutes = sum(d["minutes"] for d in week_days)
    week_questions = sum(d["questions_solved"] for d in week_days)
    week_correct = sum(d["correct_answers"] for d in week_days)
    week_accuracy = round(week_correct / week_questions * 100) if week_questions else None

    coach_data = analytics.coach(user)
    mission_data = analytics.next_mission(user)
    mastery = analytics.subject_mastery(user)
    with_data, weakness = _weakness_breakdown(mastery)

    profile = user.profile
    days_left = (
        (profile.target_exam_date - timezone.localdate()).days
        if profile.target_exam_date else None
    )

    priority = "high" if any(
        t.task_type in (StudyTaskType.MISTAKE_RETRY, StudyTaskType.PRACTICE_WEAK_TOPIC) for t in tasks
    ) else "normal"
    expected_result = (
        mission_data["title"] if mission_data.get("available")
        else (tasks[0].title if tasks else "")
    )

    return {
        "today": {
            "minutes_done": minutes_done,
            "minutes_total": minutes_total,
            "done_count": done_count,
            "total_count": total_count,
            "questions": questions_today,
            "correct": correct_today,
            "mistakes": max(0, questions_today - correct_today),
            "accuracy": accuracy_today,
            "priority": priority,
            "expected_result": expected_result,
        },
        "weakness": weakness,
        "review": _review_reminder(coach_data, mission_data),
        "strategy": _pacing_strategy(days_left, len(week_days)),
        "week": {
            "days_studied": len(week_days),
            "minutes": week_minutes,
            "questions": week_questions,
            "accuracy": week_accuracy,
            "narrative": _week_narrative(mastery, with_data),
        },
    }
