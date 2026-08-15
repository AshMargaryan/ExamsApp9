from django.conf import settings
from django.db import models


class NotificationType(models.TextChoices):
    RANK_UP = "rank_up", "Rank improved"
    OVERTAKEN = "overtaken", "Overtaken in ranking"
    SEASON_ENDING = "season_ending", "Season ending soon"
    SEASON_RESULT = "season_result", "Season result"
    CHALLENGE_RECEIVED = "challenge_received", "Challenge received"
    CHALLENGE_RESULT = "challenge_result", "Challenge result"
    FRIEND_ADDED = "friend_added", "New friend"
    PARENT_LINK_ACCEPTED = "parent_link_accepted", "Child accepted parent link request"
    MESSAGE_REQUEST = "message_request", "New message request"
    MENTION = "mention", "Mentioned in chat"
    GROUP_INVITE = "group_invite", "Added to a group"
    TODO_REMINDER = "todo_reminder", "To-do reminder"


class StudentNotification(models.Model):
    """A persisted, student-facing notification — distinct from
    apps.parents.Notification (parent-facing only) and from this app's own
    WebSocket "refresh" signal (transport only, no storage — see
    realtime.push_notification_refresh). REST is the source of truth here
    too; the WS push just tells a connected client to refetch sooner than
    its next poll."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications"
    )
    notification_type = models.CharField(max_length=30, choices=NotificationType.choices)
    message = models.TextField()
    context = models.JSONField(null=True, blank=True)
    link = models.CharField(max_length=200, blank=True, default="")
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.get_notification_type_display()} — {self.user}"
