"""
get_learner_context() — the single place future AI systems (Tutor, Study
Planner, Exam Engine, Memory Engine, ...) should call to read a student's
learner-foundation data for prompt construction, instead of querying
Profile/PersonalGoal/StudentSubject/StudentExam/LearningEvent directly.

Deliberately does NOT compute mastery, misconceptions, confidence, or study
plans — those are other subsystems' data (see docs/ai-learning-system/
ARCHITECTURE.md). This only assembles what already exists. Callers control
how much history they pull via `recent_events_limit`/`include_events`, so a
system that only needs "does this student have an availability preference"
isn't forced to also pay for a learning-events query it won't use.
"""

from . import analytics
from .models import (
    CoachPreferences, LearningEvent, LearningPreferences, PersonalGoal, StudentExam, StudentSubject,
    StudyAvailability,
)


def get_learner_context(user, *, recent_events_limit=20, include_events=True) -> dict:
    profile = getattr(user, "profile", None)

    context = {
        "identity": {
            "user_id": user.id,
            "username": user.username,
            "grade": getattr(user, "grade", None),
        },
        "profile": None,
        "active_subjects": [],
        "upcoming_exams": [],
        "goals": [],
        "study_availability": None,
        "learning_preferences": None,
        "coach_preferences": None,
        "recent_events": [],
    }

    if profile is not None:
        context["profile"] = {
            "total_xp": profile.total_xp,
            "level": profile.level,
            "target_exam_date": profile.target_exam_date,
            "target_major": profile.target_major,
        }

    for subject in StudentSubject.objects.filter(user=user, is_active=True).select_related("exam"):
        context["active_subjects"].append({
            "subject_key": subject.subject_key,
            "priority": subject.priority,
            "target_note": subject.target_note,
            "exam_id": subject.exam_id,
            "start_date": subject.start_date,
        })

    for exam in StudentExam.objects.filter(user=user, status=StudentExam.Status.UPCOMING).order_by("exam_date"):
        context["upcoming_exams"].append({
            "id": exam.id,
            "name": exam.name,
            "subject_key": exam.subject_key,
            "exam_date": exam.exam_date,
            "target_score": exam.target_score,
            "importance": exam.importance,
        })

    for goal in PersonalGoal.objects.filter(user=user, completed_at__isnull=True).select_related("subject"):
        context["goals"].append({
            "id": goal.id,
            "goal_type": goal.goal_type,
            "subject_name": goal.subject.name if goal.subject else None,
            "priority": goal.priority,
            "deadline": goal.deadline,
            "progress": analytics.goal_progress(goal),
        })

    availability = StudyAvailability.objects.filter(user=user).first()
    if availability is not None:
        context["study_availability"] = {
            "preferred_days": availability.preferred_days,
            "preferred_start_time": availability.preferred_start_time,
            "typical_session_minutes": availability.typical_session_minutes,
            "min_daily_minutes": availability.min_daily_minutes,
            "max_daily_minutes": availability.max_daily_minutes,
            "timezone": availability.timezone,
        }

    preferences = LearningPreferences.objects.filter(user=user).first()
    if preferences is not None:
        context["learning_preferences"] = {
            "explanation_style": preferences.explanation_style,
            "hints_before_answers": preferences.hints_before_answers,
            "preferred_language": preferences.preferred_language,
        }

    coach_preferences = CoachPreferences.objects.filter(user=user).first()
    if coach_preferences is not None:
        context["coach_preferences"] = {
            "mock_exams_per_week": coach_preferences.mock_exams_per_week,
            "preferred_test_days": coach_preferences.preferred_test_days,
            "preferred_test_time": coach_preferences.preferred_test_time,
        }

    if include_events and recent_events_limit > 0:
        events = LearningEvent.objects.filter(user=user)[:recent_events_limit]
        context["recent_events"] = [
            {
                "event_type": e.event_type,
                "subject_key": e.subject_key,
                "topic_label": e.topic_label,
                "result": e.result,
                "occurred_at": e.occurred_at,
            }
            for e in events
        ]

    return context
