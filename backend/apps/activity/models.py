from django.conf import settings
from django.db import models


class StudySession(models.Model):
    """
    One continuous stretch of active studying (practice, mock exams, AI
    tutor, future homework, ...). Sessions are opened/extended/closed by
    apps.activity.services.record_heartbeat based on a client-side activity
    signal, not by page open/close — an idle tab does not keep a session
    running.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="study_sessions"
    )
    started_at = models.DateTimeField(auto_now_add=True)
    last_activity_at = models.DateTimeField()
    ended_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-started_at"]
        indexes = [models.Index(fields=["user", "started_at"])]

    def __str__(self):
        return f"StudySession({self.user}, {self.started_at:%Y-%m-%d %H:%M})"