from django.conf import settings
from django.db import models

from apps.users.models import School


class MonthlyXP(models.Model):
    """XP a user earned within one calendar month. Accumulates live; the
    (year, month) row for the current month IS the live leaderboard score.
    Never reset in place — a new row just starts at 0 once the month rolls over."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="monthly_xp"
    )
    year = models.PositiveSmallIntegerField()
    month = models.PositiveSmallIntegerField()
    xp = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "year", "month"], name="unique_monthly_xp_per_user")
        ]
        indexes = [
            models.Index(fields=["year", "month", "-xp"], name="rankings_monthlyxp_period_idx"),
        ]

    def __str__(self):
        return f"{self.user} — {self.year}-{self.month:02d}: {self.xp} XP"


class RankingScope(models.TextChoices):
    GLOBAL = "global", "Global"
    SCHOOL = "school", "School"
    CLASS = "class", "Class"


class RankingAward(models.Model):
    """A top-3 finish for a completed month, created once that month closes.
    Permanent trophy record — kept on the winner's profile even though the
    live leaderboard itself carries no month-to-month history."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="ranking_awards"
    )
    scope = models.CharField(max_length=10, choices=RankingScope.choices)
    school = models.ForeignKey(
        School, on_delete=models.CASCADE, null=True, blank=True, related_name="ranking_awards",
        help_text="Null for global-scope awards.",
    )
    grade = models.PositiveSmallIntegerField(
        null=True, blank=True, help_text="Set only for class-scope awards."
    )
    year = models.PositiveSmallIntegerField()
    month = models.PositiveSmallIntegerField()
    rank = models.PositiveSmallIntegerField()
    xp = models.PositiveIntegerField(help_text="XP the user had for that month when the award was granted.")
    title = models.CharField(max_length=150)

    awarded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["scope", "school", "grade", "year", "month", "rank"], name="unique_ranking_award_slot"
            )
        ]
        ordering = ["-year", "-month", "rank"]

    def __str__(self):
        return f"#{self.rank} {self.title} — {self.user}"
