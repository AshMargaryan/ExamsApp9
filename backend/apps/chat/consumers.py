from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer

from .models import Conversation, Message
from .permissions import is_participant
from .services import message_service, reaction_service, read_service, realtime


class ChatConsumer(AsyncJsonWebsocketConsumer):
    """
    One connection per user per open conversation. Real-time send path:
    receive_json({"action": "message", ...}) -> message_service.send_message
    (the same function MessageSendView calls) -> broadcast to every
    connected participant via the channel group, including the sender's
    own other tabs/devices.

    Connecting counts as "opened the conversation" — requirement #6 says
    unread messages should be marked read when that happens, so connect()
    does it automatically. A client can also send {"action": "read", ...}
    explicitly later (e.g. only once actually scrolled to the bottom)
    without that being the only way it happens.
    """

    async def connect(self):
        self.conversation_id = int(self.scope["url_route"]["kwargs"]["conversation_id"])
        user = self.scope.get("user")

        if user is None or not user.is_authenticated:
            await self.close(code=4001)
            return
        self.user = user

        if not await self._is_participant():
            await self.close(code=4003)
            return

        self.group_name = realtime.group_name(self.conversation_id)
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        await self._mark_read(None)

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive_json(self, content, **kwargs):
        action = content.get("action")
        if action == "message":
            await self._handle_message(content)
        elif action == "read":
            await self._mark_read(content.get("message_id"))
        elif action == "react":
            await self._set_reaction(content.get("message_id"), content.get("emoji"))

    async def _handle_message(self, content):
        try:
            await self._send_message(content)
        except ValueError as e:
            await self.send_json({"type": "error", "detail": str(e)})

    # -- group event handlers (invoked via channel_layer.group_send) --------

    async def chat_message(self, event):
        await self.send_json(event["payload"])

    async def chat_read(self, event):
        await self.send_json(event["payload"])

    # -- DB helpers -----------------------------------------------------

    @database_sync_to_async
    def _is_participant(self) -> bool:
        return is_participant(self.conversation_id, self.user)

    @database_sync_to_async
    def _send_message(self, content):
        conversation = Conversation.objects.get(pk=self.conversation_id)
        message_service.send_message(
            conversation, self.user,
            text=content.get("text", ""),
            attachment_ids=content.get("attachment_ids"),
            reply_to_id=content.get("reply_to_id"),
        )

    @database_sync_to_async
    def _mark_read(self, message_id):
        conversation = Conversation.objects.get(pk=self.conversation_id)
        read_service.mark_read(conversation, self.user, up_to_message_id=message_id)

    @database_sync_to_async
    def _set_reaction(self, message_id, emoji):
        if not message_id or not emoji:
            return
        # Scoped to this connection's conversation — connect() already
        # verified participation in it, so this is the only conversation a
        # message id from this socket is allowed to touch.
        message = Message.objects.filter(pk=message_id, conversation_id=self.conversation_id).first()
        if message is None:
            return
        reaction_service.set_reaction(message, self.user, emoji)
