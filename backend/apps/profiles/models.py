from django.conf import settings
from django.db import models

from .leveling import level_for_xp


def avatar_upload_path(instance, filename):
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    return f"avatars/user_{instance.user_id}.{ext}" if ext else f"avatars/user_{instance.user_id}"


class Profile(models.Model):
    """Extends User with display/gamification data that isn't account/auth data."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile"
    )
    avatar = models.ImageField(upload_to=avatar_upload_path, null=True, blank=True)
    bio = models.TextField(max_length=500, blank=True, default="")

    total_xp = models.PositiveIntegerField(default=0)

    target_exam_date = models.DateField(
        null=True, blank=True, help_text="User-set date of their entrance exam, for the countdown."
    )
    target_major = models.CharField(
        max_length=200, blank=True, default="", help_text="Free-text target major/program, e.g. 'Computer Science'."
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Profile({self.user})"

    @property
    def level(self) -> int:
        return level_for_xp(self.total_xp)


class Rarity(models.TextChoices):
    COMMON = "common", "Common"
    RARE = "rare", "Rare"
    EPIC = "epic", "Epic"
    LEGENDARY = "legendary", "Legendary"


class RequirementType(models.TextChoices):
    """
    What an achievement's progress is measured against. Adding a new kind of
    achievement means adding a choice here plus a matching evaluator in
    engine.REQUIREMENT_EVALUATORS — no schema change needed.
    """

    QUESTIONS_SOLVED = "questions_solved", "Questions solved (lifetime correct answers)"
    PERFECT_SCORE = "perfect_score", "Best practice-tier score reached (0-100)"
    STREAK_DAYS = "streak_days", "Longest learning streak (days)"
    GAMES_PLAYED = "games_played", "Multiplayer games played (lifetime)"
    GAMES_WON = "games_won", "Multiplayer games won (lifetime)"


class Achievement(models.Model):
    """Catalog of unlockable trophies/achievements."""

    key = models.SlugField(max_length=100, unique=True)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    icon = models.CharField(max_length=100, blank=True, default="")
    rarity = models.CharField(max_length=20, choices=Rarity.choices, default=Rarity.COMMON)
    requirement_type = models.CharField(
        max_length=40, choices=RequirementType.choices, default=RequirementType.QUESTIONS_SOLVED
    )
    requirement_value = models.PositiveIntegerField(
        default=0, help_text="Threshold the requirement_type's metric must reach/exceed."
    )
    xp_reward = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class UserAchievement(models.Model):
    """An unlocked achievement for a user."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="unlocked_achievements"
    )
    achievement = models.ForeignKey(Achievement, on_delete=models.CASCADE, related_name="unlocks")
    unlocked_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("user", "achievement")]
        ordering = ["-unlocked_at"]

    def __str__(self):
        return f"{self.user} / {self.achievement}"


class ShowcaseSlot(models.Model):
    """A student-chosen achievement pinned to one of 3 hero slots. When a
    user has no slots set, ProfileSerializer falls back to auto-picking the
    rarest unlocked achievements — this only overrides that default."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="showcase_slots"
    )
    achievement = models.ForeignKey(Achievement, on_delete=models.CASCADE, related_name="showcased_in")
    position = models.PositiveSmallIntegerField(help_text="0, 1, or 2 — display order.")

    class Meta:
        unique_together = [("user", "position"), ("user", "achievement")]
        ordering = ["position"]

    def __str__(self):
        return f"{self.user} showcase[{self.position}] = {self.achievement}"


class GoalType(models.TextChoices):
    """What a PersonalGoal's progress is measured against. Mirrors
    apps.parents.GoalType but self-authored by the student rather than set
    by a parent, with a couple of extra student-relevant types."""

    SUBJECT_ACCURACY = "subject_accuracy", "Accuracy in a subject (%)"
    TESTS_THIS_WEEK = "tests_this_week", "Mock exams completed this week"
    STREAK_DAYS = "streak_days", "Learning streak (days)"
    STUDY_HOURS_MONTH = "study_hours_month", "Study hours this month"
    XP_THIS_MONTH = "xp_this_month", "XP earned this month"
    CUSTOM = "custom", "Custom (self-reported)"


class PersonalGoal(models.Model):
    """A target a student sets for themself. Progress for every typed goal
    is computed live in analytics.goal_progress — never stored, so it can't
    go stale. CUSTOM goals have no computable metric and are marked done by
    the student directly (completed_at set on completion, not derived)."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="personal_goals"
    )
    goal_type = models.CharField(max_length=20, choices=GoalType.choices)
    target_value = models.PositiveIntegerField(
        default=0, help_text="Tests, streak days, study hours, XP, or accuracy % depending on goal_type. Unused for custom goals."
    )
    subject = models.ForeignKey(
        "practice.Subject", on_delete=models.CASCADE, null=True, blank=True,
        help_text="Required for subject_accuracy goals; ignored otherwise.",
    )
    custom_title = models.CharField(
        max_length=200, blank=True, default="", help_text="Required for custom goals; ignored otherwise."
    )
    deadline = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        label = self.custom_title if self.goal_type == GoalType.CUSTOM else self.get_goal_type_display()
        return f"{self.user} / {label}"


class ProfilePrivacySettings(models.Model):
    """Per-user visibility toggles for what other users (friends, public
    profile viewers) can see. Owner always sees everything on their own
    profile — these only gate the *other-user* view. Safe defaults: age is
    off by default, everything else on."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="privacy_settings"
    )
    show_school = models.BooleanField(default=True)
    show_age = models.BooleanField(default=False)
    show_university = models.BooleanField(default=True)
    show_stats = models.BooleanField(default=True)
    show_ranking = models.BooleanField(
        default=True, help_text="Show this user's ranking medals/trophy case on their profile."
    )
    show_achievements = models.BooleanField(default=True)
    show_friends = models.BooleanField(default=True)
    show_activity = models.BooleanField(default=True)
    show_on_leaderboard = models.BooleanField(
        default=True,
        help_text=(
            "Whether this user appears in other users' global/school/class/friends "
            "leaderboards at all. Distinct from show_ranking, which only gates the "
            "medals/trophy case shown on their own profile — this one opts them out "
            "of the leaderboard lists themselves. They can always still see their own "
            "position privately even when this is off."
        ),
    )

    def __str__(self):
        return f"PrivacySettings({self.user})"
