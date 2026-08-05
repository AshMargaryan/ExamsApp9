import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone


# ---------------------------------------------------------------------------
# Conversations
# ---------------------------------------------------------------------------
#
# One unified model backs both direct messages and group chats — a DM is
# just a ConversationType.PRIVATE conversation with exactly two
# participants. This is deliberate: every future feature this needs to
# support (teacher<->student, student<->student, study groups, org chats,
# AI tutor threads) is "some set of participants exchange messages," so
# there's no reason to fork the schema by audience. Scoping a conversation
# to a particular context (e.g. "this is a homework-discussion thread") is
# left for a later `context_type`/`context_id` pair rather than guessed at
# now.

class ConversationType(models.TextChoices):
    PRIVATE = "private", "Private"
    GROUP = "group", "Group"


def conversation_image_upload_path(instance, filename):
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    unique_name = f"{uuid.uuid4().hex}.{ext}" if ext else uuid.uuid4().hex
    return f"chat/conversation_images/{instance.pk or 'new'}/{unique_name}"


class Conversation(models.Model):
    type = models.CharField(max_length=10, choices=ConversationType.choices)
    name = models.CharField(
        max_length=150, blank=True, default="", help_text="Group display name. Unused for private conversations."
    )
    image = models.ImageField(
        upload_to=conversation_image_upload_path, null=True, blank=True,
        help_text="Group photo. Unused for private conversations (the frontend shows the other user's avatar).",
    )

    # Canonical "user_a_id_user_b_id" (smaller id first) for type=private —
    # NULL for groups. The unique constraint below is what actually
    # guarantees "only one conversation between the same two users," not
    # application-level get-or-create logic (which is race-prone under
    # concurrent requests). See services.conversation_service.get_or_create_private.
    private_key = models.CharField(max_length=41, unique=True, null=True, blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="created_conversations",
    )

    participants = models.ManyToManyField(
        settings.AUTH_USER_MODEL, through="ConversationParticipant", related_name="chat_conversations"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    # Explicitly bumped by services.message_service whenever a new message
    # is sent — deliberately NOT auto_now (which would also bump it on
    # unrelated edits like a rename) — so the conversation list can sort by
    # "most recent activity" with a plain index instead of a subquery over
    # messages every time.
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-updated_at"]
        indexes = [
            models.Index(fields=["-updated_at"]),
        ]

    def __str__(self):
        return self.name or f"Conversation {self.pk}"

    @staticmethod
    def build_private_key(user_id_a: int, user_id_b: int) -> str:
        lo, hi = sorted((user_id_a, user_id_b))
        return f"{lo}_{hi}"


class ParticipantRole(models.TextChoices):
    OWNER = "owner", "Owner"
    ADMIN = "admin", "Admin"
    MEMBER = "member", "Member"


class ConversationParticipant(models.Model):
    """
    Membership row + per-user read cursor. `last_read_message` (rather than
    a raw timestamp) is what unread counts and read-status are derived
    from — see services.read_service. `active=False` marks someone as
    removed/left without losing message history attribution (their past
    Messages keep `sender` pointing here regardless).
    """

    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="memberships")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="chat_memberships"
    )
    role = models.CharField(max_length=10, choices=ParticipantRole.choices, default=ParticipantRole.MEMBER)

    joined_at = models.DateTimeField(auto_now_add=True)
    last_read_message = models.ForeignKey(
        "Message", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    active = models.BooleanField(default=True)

    class Meta:
        ordering = ["joined_at"]
        constraints = [
            models.UniqueConstraint(fields=["conversation", "user"], name="unique_conversation_participant"),
        ]
        indexes = [
            models.Index(fields=["user", "active"]),
        ]

    def __str__(self):
        return f"{self.user} in {self.conversation} ({self.role})"


# ---------------------------------------------------------------------------
# Messages
# ---------------------------------------------------------------------------

class MessageType(models.TextChoices):
    TEXT = "text", "Text"
    IMAGE = "image", "Image"
    FILE = "file", "File"


class Message(models.Model):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="messages")
    # SET_NULL (not CASCADE): a group conversation's history shouldn't
    # disappear because one participant's account was deleted.
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="chat_messages"
    )
    message_type = models.CharField(max_length=10, choices=MessageType.choices, default=MessageType.TEXT)
    # SET_NULL rather than CASCADE: deleting the original message shouldn't
    # take every reply to it down too — the reply just loses its quoted
    # preview (frontend already has to handle reply_to being null for
    # "no reply" anyway, so this reuses the same code path).
    reply_to = models.ForeignKey(
        "self", on_delete=models.SET_NULL, null=True, blank=True, related_name="replies"
    )

    # Body text for TEXT messages; optional caption for IMAGE/FILE messages.
    text = models.TextField(blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    # Not used yet (no edit/delete endpoints in this phase) — included now
    # per the target schema so those features are a pure service+view
    # addition later, not a migration.
    edited_at = models.DateTimeField(null=True, blank=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["id"]
        indexes = [
            # Backs both "give me the newest N messages" and the
            # before-cursor pagination query (see services.message_service).
            models.Index(fields=["conversation", "id"]),
        ]

    def __str__(self):
        return f"[{self.message_type}] {self.sender}: {self.text[:50]}"


class MessageReaction(models.Model):
    """
    One emoji per (message, user) — the unique constraint is what makes
    "changeable" free: setting a new emoji is just an update, not a second
    row. services.reaction_service also treats re-picking the same emoji as
    "remove it" (a toggle), same as every reference chat UI does.
    """

    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name="reactions")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="chat_message_reactions"
    )
    emoji = models.CharField(max_length=8)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["message", "user"], name="unique_message_reaction_per_user"),
        ]

    def __str__(self):
        return f"{self.user} reacted {self.emoji} to message {self.message_id}"


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
    return f"chat/attachments/{instance.conversation_id}/{unique_name}"


class Attachment(models.Model):
    """
    Uploaded independently of a Message (POST /chat/attachments/ returns
    this row), then referenced by id when the message is actually sent —
    same "upload first, attach on send" flow as apps.ai_assistant.Attachment,
    which lets the frontend show upload progress before the user hits send.

    Only `file`'s *path* and this row's metadata live in Postgres; the byte
    content goes through Django's storage backend (MEDIA_ROOT today). See
    ChatAttachmentDownloadView for why the frontend never links to `file`
    directly.
    """

    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="attachments")
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="chat_attachments"
    )
    message = models.ForeignKey(
        Message, on_delete=models.CASCADE, null=True, blank=True, related_name="attachments"
    )

    file = models.FileField(upload_to=attachment_upload_path)
    file_type = models.CharField(max_length=10, choices=AttachmentType.choices)
    original_filename = models.CharField(max_length=255)
    mime_type = models.CharField(max_length=150)
    file_size = models.PositiveIntegerField(help_text="Bytes.")
    # Room for e.g. image width/height or a generated thumbnail path later,
    # without a migration.
    metadata = models.JSONField(null=True, blank=True)

    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["uploaded_at", "id"]
        indexes = [
            models.Index(fields=["conversation", "message"]),
        ]

    def __str__(self):
        return self.original_filename
