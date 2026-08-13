from rest_framework import serializers

from .models import Attachment, Conversation, Message
from .validators import validate_attachment_file


# ---------------------------------------------------------------------------
# Conversations
# ---------------------------------------------------------------------------

class ConversationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Conversation
        fields = [
            "id", "title", "is_archived", "is_pinned",
            "created_at", "updated_at", "last_message_at",
        ]
        read_only_fields = fields


class ConversationRenameSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255, allow_blank=False, trim_whitespace=True)


# ---------------------------------------------------------------------------
# Educational context
# ---------------------------------------------------------------------------

class EducationalContextSerializer(serializers.Serializer):
    question_id = serializers.IntegerField(required=False, allow_null=True)
    subject = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    topic = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    subtopic = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    difficulty = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    lesson_id = serializers.IntegerField(required=False, allow_null=True)
    conversation_mode = serializers.ChoiceField(
        choices=["general_chat", "solving_question", "learning", "revision", "homework_solver"],
        required=False, allow_null=True,
    )


# ---------------------------------------------------------------------------
# Attachments
# ---------------------------------------------------------------------------

class AttachmentSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = Attachment
        fields = [
            "id", "original_filename", "mime_type", "size",
            "attachment_type", "uploaded_at", "url",
        ]
        read_only_fields = fields

    def get_url(self, obj):
        request = self.context.get("request")
        if not obj.file:
            return None
        return request.build_absolute_uri(obj.file.url) if request else obj.file.url


class AttachmentUploadSerializer(serializers.Serializer):
    conversation = serializers.PrimaryKeyRelatedField(queryset=Conversation.objects.all())
    file = serializers.FileField()

    def validate(self, attrs):
        attachment_type, mime_type = validate_attachment_file(attrs["file"])
        attrs["attachment_type"] = attachment_type
        attrs["mime_type"] = mime_type
        return attrs


# ---------------------------------------------------------------------------
# Messages
# ---------------------------------------------------------------------------

class MessageSerializer(serializers.ModelSerializer):
    attachments = AttachmentSerializer(many=True, read_only=True)

    class Meta:
        model = Message
        fields = [
            "id", "conversation", "role", "content", "status", "error_message",
            "created_at", "edited_at", "model_used", "provider",
            "response_time_ms", "token_usage", "educational_context",
            "is_active_response", "attachments",
        ]
        read_only_fields = fields


class SendMessageSerializer(serializers.Serializer):
    content = serializers.CharField(allow_blank=False, trim_whitespace=True)
    attachment_ids = serializers.ListField(
        child=serializers.IntegerField(), required=False, default=list
    )
    educational_context = EducationalContextSerializer(required=False)


class EditMessageSerializer(serializers.Serializer):
    content = serializers.CharField(allow_blank=False, trim_whitespace=True)


class SendMessageResponseSerializer(serializers.Serializer):
    """Response envelope for POST .../messages/ — both turns of the exchange."""

    user_message = MessageSerializer()
    assistant_message = MessageSerializer()


# ---------------------------------------------------------------------------
# Voice
# ---------------------------------------------------------------------------

class VoiceSynthesizeSerializer(serializers.Serializer):
    text = serializers.CharField(allow_blank=False, trim_whitespace=True, max_length=4000)
    voice = serializers.ChoiceField(
        choices=["hy-AM-AnahitNeural", "hy-AM-HaykNeural"],
        required=False, default="hy-AM-AnahitNeural",
    )
