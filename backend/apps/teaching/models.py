from django.conf import settings
from django.db import models


def default_student_limit() -> int:
    return settings.TEACHER_DEFAULT_STUDENT_LIMIT


class TeacherProfile(models.Model):
    """
    Teacher-only extension data. Deliberately separate from
    apps.profiles.Profile (shared display/gamification data every user has)
    — this only exists for users with role=teacher.
    """

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="teacher_profile"
    )

    student_limit = models.PositiveIntegerField(
        default=default_student_limit,
        help_text="Max accepted students. Overridable per-teacher; will become "
        "plan-driven once subscriptions exist.",
    )

    # Placeholders for future statistics — no computation logic yet, filled
    # in once enough graded assignment/attempt history exists to derive them.
    avg_student_accuracy_improvement = models.FloatField(null=True, blank=True)
    avg_student_test_improvement = models.FloatField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"TeacherProfile({self.user})"


class ConnectionStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    ACCEPTED = "accepted", "Accepted"
    DECLINED = "declined", "Declined"


class TeacherStudentConnection(models.Model):
    """
    One relationship between a teacher and a student. Teachers initiate
    (status=pending); the student accepts or declines. `active` lets a
    connection be soft-retired later (e.g. removed by either side) without
    losing invitation history, independent of `status`.
    """

    teacher = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="student_connections"
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="teacher_connections"
    )
    status = models.CharField(
        max_length=10, choices=ConnectionStatus.choices, default=ConnectionStatus.PENDING
    )
    invited_at = models.DateTimeField(auto_now_add=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True, default="")
    active = models.BooleanField(default=True)

    class Meta:
        ordering = ["-invited_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["teacher", "student"],
                condition=models.Q(active=True),
                name="unique_active_teacher_student_connection",
            )
        ]

    def __str__(self):
        return f"TeacherStudentConnection({self.teacher} -> {self.student}, {self.status})"