from django.contrib import admin

from .models import LearningStreak


@admin.register(LearningStreak)
class LearningStreakAdmin(admin.ModelAdmin):
    list_display = ["user", "current_streak", "longest_streak", "last_activity_date"]
    search_fields = ["user__username"]
