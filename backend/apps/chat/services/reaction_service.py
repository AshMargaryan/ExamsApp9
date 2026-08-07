from django.db import transaction

from ..models import Message, MessageReaction
from . import realtime


def set_reaction(message: Message, user, emoji: str) -> Message:
    """
    One reaction per (message, user) — picking a new emoji replaces the
    old one, re-picking the same one removes it (a toggle, same as every
    reference chat UI). Broadcasts the whole updated message afterward so
    every connected participant's reaction badges stay in sync live.
    """
    with transaction.atomic():
        existing = MessageReaction.objects.filter(message=message, user=user).first()
        if existing and existing.emoji == emoji:
            existing.delete()
        elif existing:
            existing.emoji = emoji
            existing.save(update_fields=["emoji"])
        else:
            MessageReaction.objects.create(message=message, user=user, emoji=emoji)

    message.refresh_from_db()
    realtime.broadcast_message(message)
    return message
