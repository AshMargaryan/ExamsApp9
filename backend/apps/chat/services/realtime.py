"""
Real-time push for chat — the WebSocket-facing half of message_service.

Unlike apps.games (which has a server-authoritative loop driving state
forward on its own), chat has no background process: every broadcast here
is triggered synchronously by whatever just wrote to the database
(ChatConsumer.receive_json or MessageSendView), exactly like
games.realtime.broadcast_room_state is called right after a room's state
changes. Kept as a thin function module (not a class) to match that
precedent and apps.chat.services' overall style.
"""
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


def group_name(conversation_id: int) -> str:
    return f"chat_{conversation_id}"


def broadcast_message(message) -> None:
    """Sync entry point — call right after a Message is created and committed."""
    from ..serializers import MessageSerializer

    channel_layer = get_channel_layer()
    if channel_layer is None:
        return
    payload = {"type": "message", "message": MessageSerializer(message).data}
    try:
        async_to_sync(channel_layer.group_send)(
            group_name(message.conversation_id), {"type": "chat.message", "payload": payload}
        )
    except RuntimeError:
        # No usable event loop in this context (e.g. a management command) — fine to skip.
        pass
