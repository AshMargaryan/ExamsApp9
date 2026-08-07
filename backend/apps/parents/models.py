from django.conf import settings
from django.db import models


class ParentChildLink(models.Model):
    """A parent's view into one child's account, created when the child
    accepts a ParentChildRequest."""

    parent = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="child_links"
    )
    child = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="parent_links"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("parent", "child")]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.parent} watches {self.child}"


class ParentChildRequestStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    ACCEPTED = "accepted", "Accepted"
    REJECTED = "rejected", "Rejected"


class ParentChildRequest(models.Model):
    """A parent's request to link a specific child, found by username —
    mirrors apps.friends.FriendRequest exactly, so it shows up the same way
    in the child's notification bell with inline accept/reject."""

    parent = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sent_child_requests"
    )
    child = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="received_parent_requests"
    )
    status = models.CharField(
        max_length=10, choices=ParentChildRequestStatus.choices, default=ParentChildRequestStatus.PENDING
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.parent} -> {self.child} ({self.status})"


class GoalType(models.TextChoices):
    LESSONS_PER_WEEK = "lessons_per_week", "Lessons completed per week"
    XP_PER_MONTH = "xp_per_month", "XP earned per month"
    SUBJECT_ACCURACY = "subject_accuracy", "Accuracy in a subject"


class LearningGoal(models.Model):
    """A target a parent sets for a linked child. Progress is always computed
    live from real practice/XP data — never stored, so it can't go stale."""

    child = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="learning_goals"
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="goals_created"
    )
    goal_type = models.CharField(max_length=20, choices=GoalType.choices)
    target_value = models.PositiveIntegerField(help_text="Lessons, XP, or accuracy % depending on goal_type.")
    subject = models.ForeignKey(
        "practice.Subject", on_delete=models.CASCADE, null=True, blank=True,
        help_text="Required for subject_accuracy goals; ignored otherwise.",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.child} / {self.get_goal_type_display()} >= {self.target_value}"


class NotificationType(models.TextChoices):
    LESSON_COMPLETED = "lesson_completed", "Lesson completed"
    BADGE_EARNED = "badge_earned", "Badge earned"
    STREAK_BROKEN = "streak_broken", "Streak broken"
    STRUGGLING_TOPIC = "struggling_topic", "Struggling with a topic"


class Notification(models.Model):
    """A parent-facing alert about a linked child's activity."""

    parent = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="child_notifications"
    )
    child = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications_about_me"
    )
    notification_type = models.CharField(max_length=20, choices=NotificationType.choices)
    message = models.CharField(max_length=300)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.notification_type}] {self.child} -> {self.parent}: {self.message}"


class WeeklyReportDelivery(models.Model):
    """Tracks the last time a parent was emailed a weekly AI report for a
    given child, so it's sent at most once every 7 days. Checked lazily
    whenever the parent opens their dashboard (this project has no
    cron/Celery — see apps.rankings.services for the same lazy pattern)."""

    parent = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="weekly_report_deliveries"
    )
    child = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="weekly_reports_sent_about_me"
    )
    last_sent_at = models.DateTimeField()

    class Meta:
        unique_together = [("parent", "child")]

    def __str__(self):
        return f"{self.parent} <- {self.child} weekly report @ {self.last_sent_at}"
