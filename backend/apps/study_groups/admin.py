from django.contrib import admin

from .models import StudyGroup, StudyGroupMembership


class StudyGroupMembershipInline(admin.TabularInline):
    model = StudyGroupMembership
    extra = 0


@admin.register(StudyGroup)
class StudyGroupAdmin(admin.ModelAdmin):
    list_display = ["title", "subject", "type", "leader", "max_members", "created_at"]
    list_filter = ["subject", "type"]
    search_fields = ["title", "leader__username"]
    inlines = [StudyGroupMembershipInline]
