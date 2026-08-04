from django.contrib import admin

from .models import StudySession


@admin.register(StudySession)
class StudySessionAdmin(admin.ModelAdmin):
    list_display = ["user", "started_at", "last_activity_at", "ended_at"]
    list_filter = ["started_at"]
    search_fields = ["user__username"]