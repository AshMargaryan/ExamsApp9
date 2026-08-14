from django.db import transaction
from django.utils import timezone

from ..models import Attachment, AttachmentType, Conversation, ConversationParticipant, Message, MessageType
from . import realtime

DEFAULT_PAGE_SIZE = 30
MAX_PAGE_SIZE = 100


def list_messages(
    conversation: Conversation, before_id: int | None = None, limit: int = DEFAULT_PAGE_SIZE,
) -> tuple[list[Message], bool]:
    """
    Cursor pagination for "load newest, then infinite-scroll upward" — NOT
    PageNumberPagination, which breaks under a live-inserting list (page 2
    shifts every time someone sends a message). `before_id` excludes
    everything at or after that message id; omit it for the newest page.
    Returns (messages, has_more) with messages already in chronological
    (oldest-first) order, ready to prepend/render directly.
    """
    limit = max(1, min(limit, MAX_PAGE_SIZE))

    qs = (
        conversation.messages.select_related("sender", "reply_to", "reply_to__sender")
        .prefetch_related("attachments", "reactions__user")
        .order_by("-id")
    )
    if before_id is not None:
        qs = qs.filter(id__lt=before_id)

    page = list(qs[: limit + 1])
    has_more = len(page) > limit
    page = page[:limit]
    page.reverse()
    return page, has_more


def _resolve_message_type(attachments: list[Attachment]) -> str:
    if not attachments:
        return MessageType.TEXT
    if all(a.file_type == AttachmentType.IMAGE for a in attachments):
        return MessageType.IMAGE
    if all(a.file_type == AttachmentType.AUDIO for a in attachments):
        return MessageType.VOICE
    return MessageType.FILE


def send_message(
    conversation: Conversation, sender, text: str = "", attachment_ids: list[int] | None = None,
    reply_to_id: int | None = None,
) -> Message:
    """
    The single place a chat Message gets created — called by both
    ChatConsumer (WebSocket "message" action) and MessageSendView (REST
    fallback / the request right after a file upload), so validation and
    real-time broadcast never drift between the two paths. See
    realtime.broadcast_message for the "however it's created, every
    connected participant sees it instantly" part.
    """
    text = (text or "").strip()
    attachment_ids = attachment_ids or []

    with transaction.atomic():
        # Locking to this sender + not-yet-attached avoids one user's
        # in-flight upload getting silently claimed by a racing second
        # send_message call for the same conversation.
        attachments = list(
            Attachment.objects.select_for_update().filter(
                id__in=attachment_ids, conversation=conversation, uploaded_by=sender, message__isnull=True,
            )
        )
        if not text and not attachments:
            raise ValueError("Հաղորդագրությունը դատարկ է։")

        # Only honored if the target is actually in this conversation —
        # otherwise silently ignored rather than erroring, same as an
        # attachment_id that doesn't resolve to anything claimable above.
        reply_to = None
        if reply_to_id is not None:
            reply_to = Message.objects.filter(id=reply_to_id, conversation=conversation).first()

        message = Message.objects.create(
            conversation=conversation, sender=sender, text=text,
            message_type=_resolve_message_type(attachments), reply_to=reply_to,
        )
        if attachments:
            Attachment.objects.filter(id__in=[a.id for a in attachments]).update(message=message)

        Conversation.objects.filter(pk=conversation.pk).update(updated_at=timezone.now())
        # Sending implicitly reads your own message — without this the
        # sender would see their own conversation as having unread
        # messages right after they wrote them.
        ConversationParticipant.objects.filter(conversation=conversation, user=sender).update(
            last_read_message=message
        )

    message.refresh_from_db()
    realtime.broadcast_message(message)
    return message


def forward_message(original: Message, target_conversation: Conversation, sender) -> Message:
    """
    Sends a copy of `original` (text + attachments, verbatim) into
    `target_conversation` as a new Message from `sender` — not a reply, and
    not linked back to the original (a forward is a fresh message that
    happens to start out identical). Attachments are duplicated as new
    Attachment rows pointing at the same underlying file (no byte copy):
    the original row's (conversation, message, uploaded_by) can't just be
    reused since a forward can land in a conversation/sender the original
    attachment has nothing to do with, and Attachment.conversation is what
    ChatAttachmentDownloadView's permission check keys off of.
    """
    with transaction.atomic():
        message = Message.objects.create(
            conversation=target_conversation, sender=sender, text=original.text,
            message_type=original.message_type,
        )
        new_attachments = [
            Attachment(
                conversation=target_conversation, uploaded_by=sender, message=message,
                file=att.file.name, file_type=att.file_type, original_filename=att.original_filename,
                mime_type=att.mime_type, file_size=att.file_size, metadata=att.metadata,
            )
            for att in original.attachments.all()
        ]
        if new_attachments:
            Attachment.objects.bulk_create(new_attachments)

        Conversation.objects.filter(pk=target_conversation.pk).update(updated_at=timezone.now())
        ConversationParticipant.objects.filter(conversation=target_conversation, user=sender).update(
            last_read_message=message
        )

    message.refresh_from_db()
    realtime.broadcast_message(message)
    return message
