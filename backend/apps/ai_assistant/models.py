import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


# ---------------------------------------------------------------------------
# Conversations
# ---------------------------------------------------------------------------

class ConversationQuerySet(models.QuerySet):
    def alive(self):
        return self.filter(deleted_at__isnull=True)


class ConversationManager(models.Manager.from_queryset(ConversationQuerySet)):
    """Default manager excludes soft-deleted conversations everywhere."""

    def get_queryset(self):
        return super().get_queryset().alive()


class Conversation(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="conversations"
    )
    title = models.CharField(max_length=255, blank=True, default="")

    is_archived = models.BooleanField(default=False)
    is_pinned = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    last_message_at = models.DateTimeField(null=True, blank=True)

    objects = ConversationManager()
    all_objects = models.Manager.from_queryset(ConversationQuerySet)()

    class Meta:
        ordering = ["-is_pinned", "-last_message_at", "-created_at"]
        indexes = [
            models.Index(fields=["owner", "deleted_at", "is_pinned", "last_message_at"]),
            models.Index(fields=["owner", "title"]),
        ]

    def __str__(self):
        return self.title or f"Conversation {self.pk}"

    @property
    def is_deleted(self):
        return self.deleted_at is not None

    def soft_delete(self):
        self.deleted_at = timezone.now()
        self.save(update_fields=["deleted_at", "updated_at"])

    def restore(self):
        self.deleted_at = None
        self.save(update_fields=["deleted_at", "updated_at"])


# ---------------------------------------------------------------------------
# Messages
# ---------------------------------------------------------------------------

class MessageRole(models.TextChoices):
    SYSTEM = "system", "System"
    USER = "user", "User"
    ASSISTANT = "assistant", "Assistant"
    TOOL = "tool", "Tool"


class MessageStatus(models.TextChoices):
    SENDING = "sending", "Sending"
    SENT = "sent", "Sent"
    FAILED = "failed", "Failed"


class Message(models.Model):
    conversation = models.ForeignKey(
        Conversation, on_delete=models.CASCADE, related_name="messages"
    )
    role = models.CharField(max_length=10, choices=MessageRole.choices)
    content = models.TextField(blank=True, default="")

    status = models.CharField(
        max_length=10, choices=MessageStatus.choices, default=MessageStatus.SENT
    )
    error_message = models.CharField(max_length=500, blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    edited_at = models.DateTimeField(null=True, blank=True)

    # Populated for assistant messages only.
    model_used = models.CharField(max_length=100, blank=True, default="")
    provider = models.CharField(max_length=50, blank=True, default="")
    response_time_ms = models.PositiveIntegerField(null=True, blank=True)
    token_usage = models.JSONField(null=True, blank=True)

    # Snapshot of the frontend's optional educational-context payload at the
    # time this message was sent (question_id, subject, topic, subtopic,
    # difficulty, lesson_id, conversation_mode). Kept as JSON so new context
    # fields never require a migration.
    educational_context = models.JSONField(null=True, blank=True)

    # Regeneration history: regenerating an assistant response creates a new
    # Message row pointing back at the one it replaces, instead of mutating
    # it in place, so every attempt stays auditable.
    regenerated_from = models.ForeignKey(
        "self", on_delete=models.SET_NULL, null=True, blank=True, related_name="regenerations"
    )
    is_active_response = models.BooleanField(default=True)

    class Meta:
        ordering = ["created_at", "id"]
        indexes = [
            models.Index(fields=["conversation", "created_at"]),
            models.Index(fields=["conversation", "is_active_response"]),
        ]

    def __str__(self):
        return f"[{self.role}] {self.content[:50]}"


# ---------------------------------------------------------------------------
# Attachments
# ---------------------------------------------------------------------------

class AttachmentType(models.TextChoices):
    IMAGE = "image", "Image"
    PDF = "pdf", "PDF"
    DOCUMENT = "document", "Document"
    TEXT = "text", "Text"
    OTHER = "other", "Other"


def attachment_upload_path(instance, filename):
    unique_name = f"{uuid.uuid4().hex}_{filename}"
    return f"assistant_attachments/{instance.owner_id}/{instance.conversation_id}/{unique_name}"


class Attachment(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="assistant_attachments"
    )
    conversation = models.ForeignKey(
        Conversation, on_delete=models.CASCADE, related_name="attachments"
    )
    # Null until the message that carries it is actually created (files can
    # be dropped/uploaded before the user hits send).
    message = models.ForeignKey(
        Message, on_delete=models.CASCADE, null=True, blank=True, related_name="attachments"
    )

    file = models.FileField(upload_to=attachment_upload_path)
    original_filename = models.CharField(max_length=255)
    mime_type = models.CharField(max_length=150)
    size = models.PositiveIntegerField()
    attachment_type = models.CharField(max_length=10, choices=AttachmentType.choices)

    uploaded_at = models.DateTimeField(auto_now_add=True)

    # Future-proofing hooks: a later OCR/vision pipeline fills these in and
    # PromptBuilder starts including them, with no schema change needed.
    is_processed_for_ai = models.BooleanField(default=False)
    extracted_text = models.TextField(null=True, blank=True)
    extracted_metadata = models.JSONField(null=True, blank=True)

    class Meta:
        ordering = ["uploaded_at", "id"]
        indexes = [
            models.Index(fields=["conversation", "message"]),
        ]

    def __str__(self):
        return self.original_filename


# ---------------------------------------------------------------------------
# Tool calls (future tool-calling support — unused by MockProvider today)
# ---------------------------------------------------------------------------

class ToolCallStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    SUCCESS = "success", "Success"
    ERROR = "error", "Error"


class ToolCall(models.Model):
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name="tool_calls")
    tool_name = models.CharField(max_length=100)
    arguments = models.JSONField(default=dict, blank=True)
    result = models.JSONField(null=True, blank=True)
    status = models.CharField(
        max_length=10, choices=ToolCallStatus.choices, default=ToolCallStatus.PENDING
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at", "id"]

    def __str__(self):
        return f"{self.tool_name} ({self.status})"
