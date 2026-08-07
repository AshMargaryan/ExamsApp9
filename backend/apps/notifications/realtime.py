from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from .consumers import group_name


def push_notification_refresh(user_id: int) -> None:
    """Tells `user_id`'s connected notification socket(s), if any, to
    re-fetch incoming requests right now instead of waiting for the next
    poll. No-op if the channel layer or an event loop isn't available
    (e.g. a management command) — the 30s poll still covers it."""
    channel_layer = get_channel_layer()
    if channel_layer is None:
        return
    try:
        async_to_sync(channel_layer.group_send)(
            group_name(user_id), {"type": "notification.refresh"}
        )
    except RuntimeError:
        pass
