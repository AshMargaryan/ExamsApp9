from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework.reverse import reverse

from apps.friends.serializers import MiniUserSerializer

from .models import Attachment, Conversation, ConversationParticipant, ConversationType, Message, MessageReaction
from .services import conversation_service
from .validators import validate_attachment_file

User = get_user_model()


class ConversationParticipantSerializer(serializers.ModelSerializer):
    user = MiniUserSerializer(read_only=True)

    class Meta:
        model = ConversationParticipant
        fields = ["id", "user", "role", "joined_at", "active"]


class AttachmentSerializer(serializers.ModelSerializer):
    # Points at the authenticated download view, never at storage directly —
    # keeps the frontend decoupled from where files actually live (local
    # disk today, S3/R2 later) and lets us enforce "participants only" on
    # every download instead of relying on an unguessable path.
    download_url = serializers.SerializerMethodField()

    class Meta:
        model = Attachment
        fields = [
            "id", "file_type", "original_filename", "mime_type", "file_size", "download_url", "uploaded_at",
        ]

    def get_download_url(self, obj) -> str:
        # No request in context when this serializer runs inside a
        # WebSocket broadcast (see services.realtime.broadcast_message) —
        # fall back to BACKEND_URL so a live-pushed message's attachment
        # link is still absolute, not resolved against the frontend's own
        # origin (which has no /api/chat/... route of its own).
        request = self.context.get("request")
        path = reverse("chat_attachment_download", kwargs={"pk": obj.pk})
        return request.build_absolute_uri(path) if request else f"{settings.BACKEND_URL}{path}"


class AttachmentUploadSerializer(serializers.Serializer):
    conversation = serializers.PrimaryKeyRelatedField(queryset=Conversation.objects.all())
    file = serializers.FileField()

    def validate(self, attrs):
        attachment_type, mime_type = validate_attachment_file(attrs["file"])
        attrs["file_type"] = attachment_type
        attrs["mime_type"] = mime_type
        return attrs


class ReplyPreviewSerializer(serializers.ModelSerializer):
    """
    Trimmed-down quote of a replied-to message — just enough for the
    frontend's "reply bar" (sender + text, or a message_type-based label
    like "Նկար" when there's no text). Deliberately not the full
    MessageSerializer: nesting attachments here would mean a reply-to-a-
    reply-to-a-reply chain pulls in unbounded data, and the UI never shows
    the quoted message's own attachments anyway (see ChatPage's
    ReplyPreviewBar/ReplyQuote — clicking it jumps to the original instead).
    """

    sender = MiniUserSerializer(read_only=True)

    class Meta:
        model = Message
        fields = ["id", "text", "sender", "message_type"]


class MessageReactionSerializer(serializers.ModelSerializer):
    # Flat rows (one per user), not grouped/counted server-side — grouping
    # would need "does the viewer's own reaction show as active," which is
    # per-viewer state a single WS broadcast payload can't carry (it goes
    # to every participant identically). The frontend groups these by
    # emoji and checks its own user id locally instead.
    user = MiniUserSerializer(read_only=True)

    class Meta:
        model = MessageReaction
        fields = ["id", "emoji", "user"]


class MessageSerializer(serializers.ModelSerializer):
    sender = MiniUserSerializer(read_only=True)
    attachments = AttachmentSerializer(many=True, read_only=True)
    reply_to = ReplyPreviewSerializer(read_only=True)
    reactions = MessageReactionSerializer(many=True, read_only=True)

    class Meta:
        model = Message
        fields = [
            "id", "conversation", "sender", "message_type", "text",
            "attachments", "reply_to", "reactions", "created_at", "edited_at", "deleted_at",
        ]


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


class SendMessageSerializer(serializers.Serializer):
    text = serializers.CharField(required=False, allow_blank=True, default="")
    attachment_ids = serializers.ListField(child=serializers.IntegerField(), required=False, default=list)
    reply_to_id = serializers.IntegerField(required=False, allow_null=True, default=None)


class GroupSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Conversation
        fields = ["name", "image"]
        extra_kwargs = {"name": {"required": False}, "image": {"required": False}}
