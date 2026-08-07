from django.contrib import admin

from .models import MonthlyXP, RankingAward


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
