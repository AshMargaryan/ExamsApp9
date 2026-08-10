from django.contrib import admin

from .models import Achievement, PersonalGoal, Profile, ProfilePrivacySettings, ShowcaseSlot, UserAchievement


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ["user", "total_xp", "level", "updated_at"]
    search_fields = ["user__username", "user__email"]


@admin.register(Achievement)
class AchievementAdmin(admin.ModelAdmin):
    list_display = ["key", "name", "rarity", "requirement_type", "requirement_value", "xp_reward"]
    list_filter = ["rarity", "requirement_type"]
    search_fields = ["key", "name"]


@admin.register(UserAchievement)
class UserAchievementAdmin(admin.ModelAdmin):
    list_display = ["user", "achievement", "unlocked_at"]
    search_fields = ["user__username", "achievement__key"]


@admin.register(ShowcaseSlot)
class ShowcaseSlotAdmin(admin.ModelAdmin):
    list_display = ["user", "position", "achievement"]
    search_fields = ["user__username"]


@admin.register(PersonalGoal)
class PersonalGoalAdmin(admin.ModelAdmin):
    list_display = ["user", "goal_type", "target_value", "deadline", "completed_at"]
    list_filter = ["goal_type"]
    search_fields = ["user__username"]


@admin.register(ProfilePrivacySettings)
class ProfilePrivacySettingsAdmin(admin.ModelAdmin):
    list_display = ["user", "show_school", "show_age", "show_stats", "show_ranking"]
    search_fields = ["user__username"]
