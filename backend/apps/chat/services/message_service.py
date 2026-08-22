import re

from django.db import transaction
from django.utils import timezone

from apps.friends.services import is_blocked
from apps.notifications.models import NotificationType
from apps.notifications.services import create_notification

from ..models import (
    Attachment, AttachmentType, Conversation, ConversationParticipant, ConversationType, Message, MessageType,
)
from . import context_service, realtime

DEFAULT_PAGE_SIZE = 30
MAX_PAGE_SIZE = 100

MENTION_PATTERN = re.compile(r"@(\w+)")


def _notify_mentions(message: Message) -> None:
    usernames = set(MENTION_PATTERN.findall(message.text))
    if not usernames or message.sender_id is None:
        return
    mentioned = (
        ConversationParticipant.objects.filter(
            conversation=message.conversation, active=True, user__username__in=usernames,
        )
        .exclude(user_id=message.sender_id)
        .select_related("user")
    )
    sender_name = message.sender.first_name or message.sender.username
    for participant in mentioned:
        create_notification(
            participant.user, NotificationType.MENTION, f"{sender_name} նշեց քեզ չաթում", link="/chat",
        )


def list_messages(
    conversation: Conversation, user, before_id: int | None = None, limit: int = DEFAULT_PAGE_SIZE,
) -> tuple[list[Message], bool]:
    """
    Cursor pagination for "load newest, then infinite-scroll upward" — NOT
    PageNumberPagination, which breaks under a live-inserting list (page 2
    shifts every time someone sends a message). `before_id` excludes
    everything at or after that message id; omit it for the newest page.
    Returns (messages, has_more) with messages already in chronological
    (oldest-first) order, ready to prepend/render directly.

    Excludes messages `user` chose "delete for me" on (Message.hidden_for)
    — a per-viewer filter, so this can't be cached/shared across users the
    way the rest of the conversation's history effectively is.
    """
    limit = max(1, min(limit, MAX_PAGE_SIZE))

    qs = (
        conversation.messages.exclude(hidden_for=user)
        .select_related("sender", "reply_to", "reply_to__sender")
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
    reply_to_id: int | None = None, context_type: str | None = None, context_id: int | None = None,
) -> Message:
    """
    The single place a chat Message gets created — called by both
    ChatConsumer (WebSocket "message" action) and MessageSendView (REST
    fallback / the request right after a file upload), so validation and
    real-time broadcast never drift between the two paths. See
    realtime.broadcast_message for the "however it's created, every
    connected participant sees it instantly" part.

    context_type/context_id (a shared question/result/achievement/profile
    card) is resolved to a snapshot via context_service *before* anything
    is written — a bad reference raises ValueError and nothing is created,
    same failure mode as an empty message.
    """
    text = (text or "").strip()
    attachment_ids = attachment_ids or []

    # A block created *after* a private conversation already exists must
    # still stop messages both ways — get_or_create_private only guards
    # the door at creation time, so this is the other half of "blocked
    # users cannot bypass it through alternate chat routes."  Groups are
    # exempt: leaving/removing a blocked member from a shared group is a
    # moderation action, not something a 1:1 block should silently do.
    if conversation.type == ConversationType.PRIVATE:
        other = (
            ConversationParticipant.objects.filter(conversation=conversation, active=True)
            .exclude(user=sender)
            .select_related("user")
            .first()
        )
        if other is not None and is_blocked(sender, other.user):
            raise ValueError("Հնարավոր չէ հաղորդագրություն ուղարկել այս օգտատիրոջը։")

    context_data = None
    if context_type is not None:
        context_data = context_service.build_context_data(context_type, context_id, sender)

    with transaction.atomic():
        # Locking to this sender + not-yet-attached avoids one user's
        # in-flight upload getting silently claimed by a racing second
        # send_message call for the same conversation.
        attachments = list(
            Attachment.objects.select_for_update().filter(
                id__in=attachment_ids, conversation=conversation, uploaded_by=sender, message__isnull=True,
            )
        )
        if not text and not attachments and not context_data:
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
            context_type=context_type, context_id=context_id, context_data=context_data,
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
    _notify_mentions(message)
    return message


def edit_message(message: Message, user, text: str) -> Message:
    if message.sender_id != user.id:
        raise ValueError("Կարող ես խմբագրել միայն սեփական հաղորդագրությունները։")
    if message.deleted_at is not None:
        raise ValueError("Ջնջված հաղորդագրությունը հնարավոր չէ խմբագրել։")
    text = (text or "").strip()
    if not text:
        raise ValueError("Հաղորդագրությունը դատարկ է։")

    message.text = text
    message.edited_at = timezone.now()
    message.save(update_fields=["text", "edited_at"])
    realtime.broadcast_message(message)
    return message


def delete_message_for_everyone(message: Message, user) -> Message:
    if message.sender_id != user.id:
        raise ValueError("Կարող ես ջնջել միայն սեփական հաղորդագրությունները։")
    if message.deleted_at is None:
        message.text = ""
        message.deleted_at = timezone.now()
        message.save(update_fields=["text", "deleted_at"])
        realtime.broadcast_message(message)
    return message


def hide_message_for_me(message: Message, user) -> None:
    """"Delete for me" — no broadcast, since nothing changed for anyone else."""
    message.hidden_for.add(user)


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
