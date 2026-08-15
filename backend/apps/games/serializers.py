from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import serializers

from apps.practice.models import QuestionType

from .models import (
    GameParticipant,
    GameRoom,
    GameSettings,
    GameStartCondition,
    GameStats,
    MatchmakingQueue,
    MatchmakingTicket,
)
from .question_engine import available_question_counts

User = get_user_model()


class MiniUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name"]


class GameParticipantSerializer(serializers.ModelSerializer):
    user = MiniUserSerializer(read_only=True)

    class Meta:
        model = GameParticipant
        fields = ["id", "user", "score", "rank", "joined_at", "finished_at"]


class GameSettingsSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    topic_name = serializers.SerializerMethodField()
    question_types = serializers.JSONField(required=False)

    class Meta:
        model = GameSettings
        fields = [
            "subject", "subject_name", "topic", "topic_name", "question_count",
            "easy_count", "medium_count", "hard_count",
            "easy_time_limit", "medium_time_limit", "hard_time_limit", "total_game_time",
            "allow_mixed_question_types", "question_types",
            "correctness_weight", "speed_weight",
        ]

    def get_topic_name(self, obj):
        return obj.topic.name if obj.topic else None

    def _validate_tier_time_limit(self, value):
        if not (5 <= value <= 300):
            raise serializers.ValidationError(
                "Հարցի ժամանակաչափը պետք է լինի 5-ից 300 վայրկյանի սահմաններում։"
            )
        return value

    def validate_easy_time_limit(self, value):
        return self._validate_tier_time_limit(value)

    def validate_medium_time_limit(self, value):
        return self._validate_tier_time_limit(value)

    def validate_hard_time_limit(self, value):
        return self._validate_tier_time_limit(value)

    def validate_total_game_time(self, value):
        if value is not None and not (30 <= value <= 14400):
            raise serializers.ValidationError(
                "Խաղի ընդհանուր տևողությունը պետք է լինի 30-ից 14400 վայրկյանի սահմաններում։"
            )
        return value

    def validate_question_types(self, value):
        valid = set(QuestionType.values)
        invalid = set(value) - valid
        if invalid:
            raise serializers.ValidationError(f"Անվավեր հարցի տեսակ(ներ)՝ {', '.join(invalid)}։")
        return value

    def validate(self, attrs):
        correctness_weight = attrs.get("correctness_weight", 0.8)
        speed_weight = attrs.get("speed_weight", 0.2)
        if not (0 <= correctness_weight <= 1) or not (0 <= speed_weight <= 1):
            raise serializers.ValidationError(
                {"correctness_weight": "Կշիռները պետք է լինեն 0-ից 1-ի սահմաններում։"}
            )
        if abs((correctness_weight + speed_weight) - 1.0) > 0.001:
            raise serializers.ValidationError(
                {"speed_weight": "Ճշգրտության և արագության կշիռների գումարը պետք է հավասար լինի 1-ի։"}
            )
        easy = attrs.get("easy_count", 0)
        medium = attrs.get("medium_count", 0)
        hard = attrs.get("hard_count", 0)
        question_count = attrs.get("question_count")

        if easy + medium + hard != question_count:
            raise serializers.ValidationError(
                {
                    "question_count": (
                        "Հեշտ/միջին/դժվար հարցերի գումարը պետք է հավասար լինի հարցերի ընդհանուր քանակին։"
                    )
                }
            )

        subject = attrs.get("subject")
        topic = attrs.get("topic")
        if topic and topic.domain.subject_id != subject.id:
            raise serializers.ValidationError({"topic": "Ընտրված թեման չի պատկանում ընտրված առարկային։"})

        question_types = attrs.get("question_types") or list(QuestionType.values)
        if not attrs.get("allow_mixed_question_types", True) and len(question_types) != 1:
            raise serializers.ValidationError(
                {"question_types": "Երբ խառը տեսակներն անթույլատրելի են, պետք է ընտրել ուղիղ մեկ տեսակ։"}
            )
        attrs["question_types"] = question_types

        counts = available_question_counts(subject, topic, question_types)
        for tier_key, requested in (("easy", easy), ("medium", medium), ("hard", hard)):
            if requested and counts.get(tier_key, 0) < requested:
                raise serializers.ValidationError(
                    {
                        "question_count": (
                            f"Բավարար հարցեր չկան ընտրված պայմաններով ({tier_key}՝ հասանելի "
                            f"{counts.get(tier_key, 0)}, պահանջվում է {requested})։"
                        )
                    }
                )
        return attrs


class GameRoomSerializer(serializers.ModelSerializer):
    creator = MiniUserSerializer(read_only=True)
    participants = GameParticipantSerializer(many=True, read_only=True)
    participant_count = serializers.SerializerMethodField()
    settings = GameSettingsSerializer(read_only=True)

    class Meta:
        model = GameRoom
        fields = [
            "id", "creator", "name", "room_code", "type", "max_players",
            "status", "start_time", "created_at", "participants", "participant_count",
            "start_condition", "timer_seconds", "min_players_to_start", "scheduled_start_at",
            "settings",
        ]
        read_only_fields = [
            "room_code", "status", "start_time", "created_at", "scheduled_start_at",
        ]

    def get_participant_count(self, obj) -> int:
        return len(obj.participants.all())


class GameRoomCreateSerializer(serializers.ModelSerializer):
    settings = GameSettingsSerializer()

    class Meta:
        model = GameRoom
        fields = [
            "name", "max_players", "start_condition", "timer_seconds",
            "min_players_to_start", "settings",
        ]

    def validate_max_players(self, value):
        if not (2 <= value <= 20):
            raise serializers.ValidationError(
                "Խաղացողների առավելագույն քանակը պետք է լինի 2-ից 20-ի սահմաններում։"
            )
        return value

    def validate(self, attrs):
        condition = attrs.get("start_condition", GameStartCondition.MANUAL)
        max_players = attrs.get("max_players", 4)

        if condition == GameStartCondition.TIMER:
            timer_seconds = attrs.get("timer_seconds")
            if not timer_seconds or not (10 <= timer_seconds <= 3600):
                raise serializers.ValidationError(
                    {"timer_seconds": "Ժամանակաչափը պետք է լինի 10-ից 3600 վայրկյանի սահմաններում։"}
                )
        elif condition == GameStartCondition.PLAYER_COUNT:
            min_players = attrs.get("min_players_to_start")
            if not min_players or not (2 <= min_players <= max_players):
                raise serializers.ValidationError(
                    {
                        "min_players_to_start": (
                            "Նվազագույն խաղացողների քանակը պետք է լինի 2-ից առավելագույն քանակի սահմաններում։"
                        )
                    }
                )
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        settings_data = validated_data.pop("settings")
        room = GameRoom.objects.create(**validated_data)
        GameSettings.objects.create(room=room, **settings_data)
        return room


class GameStatsSerializer(serializers.ModelSerializer):
    class Meta:
        model = GameStats
        fields = ["games_played", "wins", "losses", "points_earned", "trophies"]


class MatchmakingQueueSerializer(serializers.ModelSerializer):
    class Meta:
        model = MatchmakingQueue
        fields = ["id", "name", "start_mode", "min_players", "max_players", "timer_seconds"]


class MatchmakingTicketSerializer(serializers.ModelSerializer):
    queue = MatchmakingQueueSerializer(read_only=True)
    room_code = serializers.SerializerMethodField()
    room_status = serializers.SerializerMethodField()
    players_waiting = serializers.SerializerMethodField()
    scheduled_start_at = serializers.SerializerMethodField()
    subject_name = serializers.SerializerMethodField()

    class Meta:
        model = MatchmakingTicket
        fields = [
            "id", "queue", "status", "room_code", "room_status",
            "players_waiting", "scheduled_start_at", "created_at", "subject_name",
        ]

    def get_room_code(self, obj):
        return obj.room.room_code if obj.room else None

    def get_room_status(self, obj):
        return obj.room.status if obj.room else None

    def get_players_waiting(self, obj) -> int:
        return obj.room.participants.count() if obj.room else 0

    def get_scheduled_start_at(self, obj):
        return obj.room.scheduled_start_at if obj.room else None

    def get_subject_name(self, obj):
        settings = getattr(obj.room, "settings", None) if obj.room else None
        return settings.subject.name if settings else None
