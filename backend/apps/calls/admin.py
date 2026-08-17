from django.contrib import admin

from .models import CallParticipant, CallRoom


class CallParticipantInline(admin.TabularInline):
    model = CallParticipant
    extra = 0


@admin.register(CallRoom)
class CallRoomAdmin(admin.ModelAdmin):
    list_display = ["id", "study_group", "creator", "capacity", "status", "created_at"]
    list_filter = ["status"]
    search_fields = ["study_group__title", "creator__username"]
    inlines = [CallParticipantInline]
