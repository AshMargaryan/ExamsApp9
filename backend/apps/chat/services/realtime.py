"""
Real-time push for chat — the WebSocket-facing half of message_service /
read_service.

Unlike apps.games (which has a server-authoritative loop driving state
forward on its own), chat has no background process: every broadcast here
is triggered synchronously by whatever just wrote to the database
(ChatConsumer.receive_json, MessageListSendView, or ConversationReadView),
exactly like games.realtime.broadcast_room_state is called right after a
room's state changes. Kept as a thin function module (not a class) to
match that precedent and apps.chat.services' overall style.
"""
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.conf import settings


class _AbsoluteUriContext:
    """
    Stand-in for DRF's `request` context object, for serializing outside an
    actual HTTP request (i.e. every WS broadcast). Nested fields like
    AttachmentSerializer.get_download_url and MiniUserSerializer.get_avatar
    check `context.get("request")` and call `.build_absolute_uri(path)` on
    it to turn a relative path into a full URL — without this, those URLs
    would resolve against the *frontend's* origin instead of the backend's,
    since relative paths in JSON carry no origin of their own.
    """

    def build_absolute_uri(self, path: str) -> str:
        return f"{settings.BACKEND_URL}{path}"


def group_name(conversation_id: int) -> str:
    return f"chat_{conversation_id}"


def _group_send(conversation_id: int, event_type: str, payload: dict) -> None:
    channel_layer = get_channel_layer()
    if channel_layer is None:
        return
    try:
        async_to_sync(channel_layer.group_send)(
            group_name(conversation_id), {"type": event_type, "payload": payload}
        )
    except RuntimeError:
        # No usable event loop in this context (e.g. a management command) — fine to skip.
        pass


def broadcast_message(message) -> None:
    """Sync entry point — call right after a Message is created and committed."""
    from ..serializers import MessageSerializer

    payload = {
        "type": "message",
        "message": MessageSerializer(message, context={"request": _AbsoluteUriContext()}).data,
    }
    _group_send(message.conversation_id, "chat.message", payload)


def broadcast_read(conversation_id: int, user_id: int, last_read_message_id: int) -> None:
    """
    No read-receipt UI yet, but every connected client already gets this
    event — a future "seen by" indicator is a frontend-only addition, not
    another backend round-trip.
    """
    payload = {
        "type": "read",
        "conversation_id": conversation_id,
        "user_id": user_id,
        "last_read_message_id": last_read_message_id,
    }
    _group_send(conversation_id, "chat.read", payload)
