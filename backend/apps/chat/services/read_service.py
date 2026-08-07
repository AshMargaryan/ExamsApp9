from ..models import Conversation, ConversationParticipant, Message
from . import realtime


def mark_read(conversation: Conversation, user, up_to_message_id: int | None = None) -> ConversationParticipant | None:
    """
    Advances `user`'s read cursor for this conversation up to a specific
    message (or the newest one, if omitted — "opened the conversation").
    Never regresses it (a stale "mark read" call for an older message than
    what's already read is a no-op) and no-ops entirely if there's nothing
    to advance to (empty conversation, or the target message doesn't
    exist/belong here).

    Broadcasts to the conversation's group either way something changed,
    so other participants' UIs can reflect it later (no read-receipt UI
    yet, but the event already carries what one would need).
    """
    membership = ConversationParticipant.objects.filter(
        conversation=conversation, user=user, active=True
    ).first()
    if membership is None:
        return None

    if up_to_message_id is None:
        target_id = conversation.messages.order_by("-id").values_list("id", flat=True).first()
    else:
        target_id = Message.objects.filter(
            id=up_to_message_id, conversation=conversation
        ).values_list("id", flat=True).first()

    if target_id is None:
        return membership
    if membership.last_read_message_id is not None and target_id <= membership.last_read_message_id:
        return membership

    membership.last_read_message_id = target_id
    membership.save(update_fields=["last_read_message"])

    realtime.broadcast_read(conversation.id, user.id, target_id)
    return membership
