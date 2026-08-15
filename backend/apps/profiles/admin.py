from django.contrib import admin

from .models import (
    Achievement,
    LearningEvent,
    LearningPreferences,
    PersonalGoal,
    Profile,
    ProfilePrivacySettings,
    ShowcaseSlot,
    StudentExam,
    StudentSubject,
    StudyAvailability,
    UserAchievement,
)


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
    list_display = ["user", "goal_type", "target_value", "priority", "deadline", "completed_at"]
    list_filter = ["goal_type", "priority"]
    search_fields = ["user__username"]


@admin.register(ProfilePrivacySettings)
class ProfilePrivacySettingsAdmin(admin.ModelAdmin):
    list_display = ["user", "show_school", "show_age", "show_stats", "show_ranking"]
    search_fields = ["user__username"]


@admin.register(StudentExam)
class StudentExamAdmin(admin.ModelAdmin):
    list_display = ["user", "name", "subject_key", "exam_date", "importance", "status"]
    list_filter = ["subject_key", "importance", "status"]
    search_fields = ["user__username", "name"]


@admin.register(StudentSubject)
class StudentSubjectAdmin(admin.ModelAdmin):
    list_display = ["user", "subject_key", "is_active", "priority", "start_date"]
    list_filter = ["subject_key", "is_active", "priority"]
    search_fields = ["user__username"]


@admin.register(StudyAvailability)
class StudyAvailabilityAdmin(admin.ModelAdmin):
    list_display = ["user", "typical_session_minutes", "min_daily_minutes", "max_daily_minutes", "updated_at"]
    search_fields = ["user__username"]


@admin.register(LearningPreferences)
class LearningPreferencesAdmin(admin.ModelAdmin):
    list_display = ["user", "explanation_style", "hints_before_answers", "preferred_language", "updated_at"]
    list_filter = ["explanation_style", "hints_before_answers"]
    search_fields = ["user__username"]


@admin.register(LearningEvent)
class LearningEventAdmin(admin.ModelAdmin):
    list_display = ["user", "event_type", "subject_key", "source", "result", "occurred_at"]
    list_filter = ["event_type", "subject_key", "source"]
    search_fields = ["user__username"]
    date_hierarchy = "occurred_at"
