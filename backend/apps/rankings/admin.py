from django.contrib import admin

from .models import MonthlyXP, RankHistory, RankingAward, SubjectXP


@admin.register(MonthlyXP)
class MonthlyXPAdmin(admin.ModelAdmin):
    list_display = ["user", "year", "month", "xp", "updated_at"]
    list_filter = ["year", "month"]
    search_fields = ["user__username", "user__email"]


@admin.register(RankingAward)
class RankingAwardAdmin(admin.ModelAdmin):
    list_display = ["user", "scope", "school", "year", "month", "rank", "xp", "awarded_at"]
    list_filter = ["scope", "year", "month", "rank"]
    search_fields = ["user__username", "user__email", "title"]


@admin.register(SubjectXP)
class SubjectXPAdmin(admin.ModelAdmin):
    list_display = ["user", "subject_key", "year", "month", "xp", "updated_at"]
    list_filter = ["subject_key", "year", "month"]
    search_fields = ["user__username", "user__email"]


@admin.register(RankHistory)
class RankHistoryAdmin(admin.ModelAdmin):
    list_display = ["user", "scope_key", "date", "rank", "xp"]
    list_filter = ["scope", "date"]
    search_fields = ["user__username", "user__email", "scope_key"]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
