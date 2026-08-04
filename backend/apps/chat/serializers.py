from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.friends.serializers import MiniUserSerializer

from .models import Conversation, ConversationParticipant, ConversationType, Message
from .services import conversation_service

User = get_user_model()


class ConversationParticipantSerializer(serializers.ModelSerializer):
    user = MiniUserSerializer(read_only=True)

    class Meta:
        model = ConversationParticipant
        fields = ["id", "user", "role", "joined_at", "active"]


class LastMessagePreviewSerializer(serializers.ModelSerializer):
    sender = MiniUserSerializer(read_only=True)

    class Meta:
        model = Message
        fields = ["id", "message_type", "text", "sender", "created_at"]


class ConversationSerializer(serializers.ModelSerializer):
    """
    Read serializer for both the conversation list and a single
    conversation's header. `last_message`/`unread_count` are populated by
    conversation_service (see _attach_last_messages/_attach_unread_counts)
    — deliberately NOT SerializerMethodFields hitting the DB per row, since
    that would reintroduce the N+1 the service function exists to avoid.
    """

    other_participant = serializers.SerializerMethodField()
    participants = ConversationParticipantSerializer(source="memberships", many=True, read_only=True)
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = [
            "id", "type", "name", "image", "other_participant", "participants",
            "last_message", "unread_count", "created_at", "updated_at",
        ]

    def get_other_participant(self, obj):
        if obj.type != ConversationType.PRIVATE:
            return None
        user = self.context["request"].user
        other = conversation_service.other_participant(obj, user)
        return MiniUserSerializer(other, context=self.context).data if other else None

    def get_last_message(self, obj):
        last_message = getattr(obj, "_last_message", None)
        return LastMessagePreviewSerializer(last_message, context=self.context).data if last_message else None

    def get_unread_count(self, obj) -> int:
        return getattr(obj, "_unread_count", 0)


class CreatePrivateConversationSerializer(serializers.Serializer):
    user_id = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())

    def validate_user_id(self, value):
        request_user = self.context["request"].user
        if value.id == request_user.id:
            raise serializers.ValidationError("Չեք կարող զրույց սկսել ինքներդ ձեզ հետ։")
        return value


class CreateGroupConversationSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=150, trim_whitespace=True)
    participant_ids = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), many=True, allow_empty=True,
    )

    def validate_participant_ids(self, value):
        return [u.id for u in value]


class AddParticipantsSerializer(serializers.Serializer):
    user_ids = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), many=True)

    def validate_user_ids(self, value):
        return [u.id for u in value]


class GroupSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Conversation
        fields = ["name", "image"]
        extra_kwargs = {"name": {"required": False}, "image": {"required": False}}
