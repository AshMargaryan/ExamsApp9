from channels.generic.websocket import AsyncJsonWebsocketConsumer


def group_name(user_id: int) -> str:
    return f"notifications_{user_id}"


class NotificationConsumer(AsyncJsonWebsocketConsumer):
    """One group per user. Carries no payload — just tells the client to
    re-fetch its incoming friend/parent-link requests over REST, which stays
    the single source of truth."""

    async def connect(self):
        user = self.scope.get("user")
        if user is None or not user.is_authenticated:
            await self.close(code=4001)
            return
        self.group_name = group_name(user.id)
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def notification_refresh(self, event):
        await self.send_json({"type": "refresh"})
