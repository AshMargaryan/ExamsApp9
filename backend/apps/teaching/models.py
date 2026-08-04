from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


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


class AssignmentType(models.TextChoices):
    MOCK_EXAM = "mock_exam", "Mock Exam"
    TOPIC = "topic", "Topic"
    SUBTOPIC = "subtopic", "Subtopic"


class AssignmentStatus(models.TextChoices):
    ASSIGNED = "assigned", "Assigned"
    IN_PROGRESS = "in_progress", "In Progress"
    SUBMITTED = "submitted", "Submitted"
    COMPLETED = "completed", "Completed"


class Assignment(models.Model):
    """
    Work a teacher assigns a student, referencing existing learning content
    instead of duplicating it. Exactly one of mock_exam/topic/subtopic is
    set, matching `assignment_type` — three explicit FKs rather than a
    generic relation since there are only ever these three target kinds.

    Lifecycle: assigned -> in_progress (student opens it) -> submitted
    (student has finished the underlying problems and writes `explanation`
    of what they learned) -> completed (teacher approves) or back to
    in_progress (teacher rejects, `teacher_feedback` says why — student
    edits the explanation and/or redoes problems, then resubmits). Only the
    latest submission is kept (explanation/teacher_feedback are overwritten
    on resubmit) — no submission history table for now.

    "Overdue" is deliberately not a stored status: it's derived from
    due_date vs. now (and doesn't apply once submitted/completed) so it can
    never drift out of sync.
    """

    teacher = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="assignments_given"
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="assignments_received"
    )
    assignment_type = models.CharField(max_length=10, choices=AssignmentType.choices)

    mock_exam = models.ForeignKey(
        "mock_exams.MockExam", on_delete=models.CASCADE, null=True, blank=True, related_name="assignments"
    )
    topic = models.ForeignKey(
        "practice.Topic", on_delete=models.CASCADE, null=True, blank=True, related_name="assignments"
    )
    subtopic = models.ForeignKey(
        "practice.Subtopic", on_delete=models.CASCADE, null=True, blank=True, related_name="assignments"
    )

    title = models.CharField(max_length=255, blank=True, default="")
    instructions = models.TextField(blank=True, default="")
    due_date = models.DateTimeField(null=True, blank=True)
    status = models.CharField(
        max_length=15, choices=AssignmentStatus.choices, default=AssignmentStatus.ASSIGNED
    )

    learning_progress = models.FloatField(
        default=0.0,
        help_text="Fraction (0-1) of the subtopic's learning material the student has scrolled through. "
        "Only meaningful for assignment_type=subtopic.",
    )
    progress_reset_at = models.DateTimeField(
        null=True, blank=True,
        help_text="Progress/completion only counts practice attempts made after this (falls back to "
        "created_at). Bumped to now() when the student redoes a rejected assignment, so old completions "
        "from before the redo stop counting without touching the underlying practice data.",
    )
    seen_by_student = models.BooleanField(
        default=False,
        help_text="False right after creation or after a teacher review — drives the student's notification bell.",
    )
    seen_by_teacher = models.BooleanField(
        default=True,
        help_text="False right after a student submission — drives the teacher's notification bell.",
    )

    explanation = models.TextField(
        blank=True, default="", help_text="Student's write-up of what they learned, sent with submission."
    )
    teacher_feedback = models.TextField(
        blank=True, default="", help_text="Optional note from the teacher when rejecting a submission."
    )
    submitted_at = models.DateTimeField(null=True, blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Assignment({self.title} -> {self.student})"

    @property
    def is_overdue(self) -> bool:
        return (
            self.due_date is not None
            and self.status not in (AssignmentStatus.SUBMITTED, AssignmentStatus.COMPLETED)
            and self.due_date < timezone.now()
        )

    def clean(self):
        target_field = {
            AssignmentType.MOCK_EXAM: "mock_exam",
            AssignmentType.TOPIC: "topic",
            AssignmentType.SUBTOPIC: "subtopic",
        }.get(self.assignment_type)
        if target_field is None:
            raise ValidationError({"assignment_type": "Անվավեր առաջադրանքի տեսակ։"})

        others = {"mock_exam", "topic", "subtopic"} - {target_field}
        if getattr(self, f"{target_field}_id") is None:
            raise ValidationError({target_field: "Այս դաշտը պարտադիր է ընտրված տեսակի համար։"})
        for other in others:
            if getattr(self, f"{other}_id") is not None:
                raise ValidationError({other: "Այս դաշտը պետք է դատարկ լինի ընտրված տեսակի համար։"})