from django.contrib import admin

from .models import Achievement, Profile, UserAchievement


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ["user", "total_xp", "level", "updated_at"]
    search_fields = ["user__username", "user__email"]


@admin.register(Achievement)
class AchievementAdmin(admin.ModelAdmin):
    list_display = ["key", "name", "xp_reward"]
    search_fields = ["key", "name"]


@admin.register(UserAchievement)
class UserAchievementAdmin(admin.ModelAdmin):
    list_display = ["user", "achievement", "unlocked_at"]
    search_fields = ["user__username", "achievement__key"]
