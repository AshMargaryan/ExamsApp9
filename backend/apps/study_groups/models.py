from django.conf import settings
from django.db import models

from apps.mock_exams.models import MockExamSubject

# Defaults applied by GroupCreateSerializer when the client omits max_members
# — a tutoring offer is normally one tutor + one student, a study group
# is meant to hold a small cohort. Both are just starting points the
# leader can override within TUTORING_MAX_MEMBERS_CAP below.
TUTORING_DEFAULT_MAX_MEMBERS = 2
STUDY_GROUP_DEFAULT_MAX_MEMBERS = 10
MAX_MEMBERS_CAP = 100


class GroupType(models.TextChoices):
    STUDY_GROUP = "study_group", "Study group"
    TUTORING = "tutoring", "Tutoring"


class Weekday(models.IntegerChoices):
    MONDAY = 0, "Monday"
    TUESDAY = 1, "Tuesday"
    WEDNESDAY = 2, "Wednesday"
    THURSDAY = 3, "Thursday"
    FRIDAY = 4, "Friday"
    SATURDAY = 5, "Saturday"
    SUNDAY = 6, "Sunday"


class StudyGroup(models.Model):
    title = models.CharField(max_length=150)
    subject = models.CharField(max_length=20, choices=MockExamSubject.choices)
    type = models.CharField(max_length=20, choices=GroupType.choices)
    description = models.TextField(blank=True, default="")

    # A single weekly recurring slot — no multi-day recurrence or
    # exception dates in this phase.
    schedule_day = models.PositiveSmallIntegerField(choices=Weekday.choices)
    schedule_start_time = models.TimeField()
    schedule_end_time = models.TimeField()

    max_members = models.PositiveSmallIntegerField()
    leader = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="led_study_groups"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["subject", "type"]),
        ]

    def __str__(self):
        return self.title


class MembershipRole(models.TextChoices):
    LEADER = "leader", "Leader"
    MEMBER = "member", "Member"


class StudyGroupMembership(models.Model):
    group = models.ForeignKey(StudyGroup, on_delete=models.CASCADE, related_name="memberships")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="study_group_memberships"
    )
    role = models.CharField(max_length=10, choices=MembershipRole.choices, default=MembershipRole.MEMBER)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["joined_at"]
        constraints = [
            models.UniqueConstraint(fields=["group", "user"], name="unique_study_group_membership"),
        ]

    def __str__(self):
        return f"{self.user} in {self.group} ({self.role})"
