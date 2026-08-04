from django.db import transaction
from django.utils import timezone

from ..models import Attachment, AttachmentType, Conversation, Message, MessageType
from . import realtime


def _resolve_message_type(attachments: list[Attachment]) -> str:
    if not attachments:
        return MessageType.TEXT
    if all(a.file_type == AttachmentType.IMAGE for a in attachments):
        return MessageType.IMAGE
    return MessageType.FILE


def send_message(
    conversation: Conversation, sender, text: str = "", attachment_ids: list[int] | None = None,
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

        message = Message.objects.create(
            conversation=conversation, sender=sender, text=text,
            message_type=_resolve_message_type(attachments),
        )
        if attachments:
            Attachment.objects.filter(id__in=[a.id for a in attachments]).update(message=message)

        Conversation.objects.filter(pk=conversation.pk).update(updated_at=timezone.now())

    message.refresh_from_db()
    realtime.broadcast_message(message)
    return message
