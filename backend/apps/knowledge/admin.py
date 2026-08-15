from django.contrib import admin

from .models import SubjectMastery, TopicMastery


@admin.register(SubjectMastery)
class SubjectMasteryAdmin(admin.ModelAdmin):
    list_display = ["user", "subject_key", "mastery_score", "attempts_count", "data_sufficiency", "updated_at"]
    list_filter = ["subject_key", "data_sufficiency"]
    search_fields = ["user__username"]


@admin.register(TopicMastery)
class TopicMasteryAdmin(admin.ModelAdmin):
    list_display = ["user", "subtopic", "mastery_score", "attempts_count", "data_sufficiency", "updated_at"]
    list_filter = ["data_sufficiency"]
    search_fields = ["user__username", "subtopic__name"]
