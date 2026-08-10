from django.contrib import admin

from .models import (
    GameAnswer,
    GameParticipant,
    GameQuestion,
    GameRoom,
    GameSettings,
    GameStats,
    MatchmakingQueue,
    MatchmakingTicket,
    SuspiciousActivityLog,
)


class GameParticipantInline(admin.TabularInline):
    model = GameParticipant
    extra = 0


class GameSettingsInline(admin.StackedInline):
    model = GameSettings
    extra = 0


@admin.register(GameRoom)
class GameRoomAdmin(admin.ModelAdmin):
    list_display = [
        "name", "room_code", "creator", "type", "status",
        "start_condition", "max_players", "created_at",
    ]
    list_filter = ["type", "status", "start_condition"]
    search_fields = ["name", "room_code", "creator__username"]
    inlines = [GameSettingsInline, GameParticipantInline]


@admin.register(GameQuestion)
class GameQuestionAdmin(admin.ModelAdmin):
    list_display = ["room", "order", "question"]
    search_fields = ["room__room_code", "room__name"]


@admin.register(GameAnswer)
class GameAnswerAdmin(admin.ModelAdmin):
    list_display = ["participant", "game_question", "is_correct", "answered_at"]
    list_filter = ["is_correct"]
    search_fields = ["participant__user__username"]


@admin.register(GameStats)
class GameStatsAdmin(admin.ModelAdmin):
    list_display = ["user", "games_played", "wins", "losses", "points_earned"]
    search_fields = ["user__username"]


@admin.register(MatchmakingQueue)
class MatchmakingQueueAdmin(admin.ModelAdmin):
    list_display = ["name", "start_mode", "min_players", "max_players", "timer_seconds", "is_active"]
    list_filter = ["start_mode", "is_active"]


@admin.register(MatchmakingTicket)
class MatchmakingTicketAdmin(admin.ModelAdmin):
    list_display = ["user", "queue", "status", "room", "created_at"]
    list_filter = ["status", "queue"]
    search_fields = ["user__username"]


@admin.register(SuspiciousActivityLog)
class SuspiciousActivityLogAdmin(admin.ModelAdmin):
    list_display = ["user", "event_type", "created_at"]
    list_filter = ["event_type", "created_at"]
    search_fields = ["user__username"]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
