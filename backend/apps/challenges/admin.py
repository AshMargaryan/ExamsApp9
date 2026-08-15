from django.contrib import admin

from .models import ChallengeInvite


@admin.register(ChallengeInvite)
class ChallengeInviteAdmin(admin.ModelAdmin):
    list_display = ["sender", "receiver", "subject", "status", "created_at", "expires_at"]
    list_filter = ["status", "subject"]
    search_fields = ["sender__username", "receiver__username"]
