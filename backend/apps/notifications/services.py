from .models import StudentNotification
from .realtime import push_notification_refresh


def create_notification(user, notification_type, message, context=None, link="") -> StudentNotification:
    """Inserts a persisted notification and nudges the user's connected
    WebSocket bell (if any) to refetch immediately, instead of waiting for
    its 30s poll fallback."""
    notification = StudentNotification.objects.create(
        user=user, notification_type=notification_type, message=message,
        context=context, link=link or "",
    )
    push_notification_refresh(user.id)
    return notification
