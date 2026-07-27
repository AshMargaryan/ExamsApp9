from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from .models import LearningStreak


@transaction.atomic
def record_activity(user, on_date=None) -> LearningStreak:
    """
    Call once per meaningful learning activity (e.g. a completed, non-revealed
    practice submission). Idempotent per calendar day — calling it multiple
    times on the same day only counts once.
    """
    today = on_date or timezone.localdate()
    streak, _ = LearningStreak.objects.select_for_update().get_or_create(user=user)

    if streak.last_activity_date == today:
        return streak

    if streak.last_activity_date == today - timedelta(days=1):
        streak.current_streak += 1
    else:
        streak.current_streak = 1

    streak.longest_streak = max(streak.longest_streak, streak.current_streak)
    streak.last_activity_date = today
    streak.save(update_fields=["current_streak", "longest_streak", "last_activity_date"])
    return streak
