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
