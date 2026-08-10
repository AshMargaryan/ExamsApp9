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


class SubjectXP(models.Model):
    """XP a user earned within one calendar month, broken down by subject.
    Parallel ledger to MonthlyXP — written alongside it (never instead of
    it) whenever award_xp is called with a subject. subject_key uses the
    canonical 5-value taxonomy from apps.profiles.subjects.SUBJECT_LABELS,
    not a FK, since apps.practice.Subject only covers 2 of the 5 subjects
    today and mock exams/flashcards use their own enums for the same set."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="subject_xp"
    )
    subject_key = models.CharField(max_length=20)
    year = models.PositiveSmallIntegerField()
    month = models.PositiveSmallIntegerField()
    xp = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "subject_key", "year", "month"], name="unique_subject_xp_per_user_month"
            )
        ]
        indexes = [
            models.Index(fields=["subject_key", "year", "month", "-xp"], name="rankings_subjectxp_period_idx"),
        ]
        verbose_name_plural = "Subject XP"

    def __str__(self):
        return f"{self.user} — {self.subject_key} {self.year}-{self.month:02d}: {self.xp} XP"


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


class RankHistory(models.Model):
    """One row per (user, scope, day) — a daily snapshot of the user's own
    rank/xp for that scope, captured lazily the first time they view that
    board on a given day (see services.maybe_snapshot_rank_history). Powers
    the season progress chart and the "best rank ever" personal record.
    Only written for users who actually have XP this month — a user who
    never opens a ranking view, or has no XP yet, simply has no rows."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="rank_history"
    )
    scope = models.CharField(max_length=10, choices=RankingScope.choices)
    scope_key = models.CharField(
        max_length=64,
        help_text="Disambiguates GLOBAL / SCHOOL:<id> / CLASS:<school_id>:<grade> for uniqueness "
                   "without relying on nullable FK combinations.",
    )
    school = models.ForeignKey(School, on_delete=models.CASCADE, null=True, blank=True, related_name="+")
    grade = models.PositiveSmallIntegerField(null=True, blank=True)
    date = models.DateField()
    xp = models.PositiveIntegerField()
    rank = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "scope_key", "date"], name="unique_rank_history_per_day")
        ]
        indexes = [
            models.Index(fields=["user", "scope_key", "-date"], name="rankings_rankhistory_user_idx"),
        ]
        ordering = ["date"]

    def __str__(self):
        return f"{self.user} — {self.scope_key} {self.date}: #{self.rank}"
