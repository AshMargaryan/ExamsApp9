from django.conf import settings
from django.db import models


class LearningStreak(models.Model):
    """
    Tracks a user's daily learning-activity streak. Deliberately standalone
    (no FKs to achievements/practice/etc.) so gamification features —
    achievements, trophies, competitions, leaderboards — can read from it
    later without this app needing to know about them.
    """

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="learning_streak"
    )
    current_streak = models.PositiveIntegerField(default=0)
    longest_streak = models.PositiveIntegerField(default=0)
    last_activity_date = models.DateField(null=True, blank=True)

    def __str__(self):
        return f"Streak({self.user}) = {self.current_streak}"
