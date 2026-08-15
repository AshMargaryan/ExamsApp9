import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class School(models.Model):
    name = models.CharField(max_length=255)
    marz = models.CharField(max_length=255, blank=True, default="")

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class University(models.Model):
    name = models.CharField(max_length=255)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Sex(models.TextChoices):
    MALE = "male", "Արական"
    FEMALE = "female", "Իգական"


class AccountRole(models.TextChoices):
    STUDENT = "student", "Աշակերտ"
    TEACHER = "teacher", "Ուսուցիչ"
    PARENT = "parent", "Ծնող"


class User(AbstractUser):
    email = models.EmailField(unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    username_changed_at = models.DateTimeField(null=True, blank=True)

    role = models.CharField(max_length=10, choices=AccountRole.choices, default=AccountRole.STUDENT)

    is_email_verified = models.BooleanField(default=False)
    email_verification_code = models.CharField(max_length=6, blank=True, default="")
    email_verification_expires_at = models.DateTimeField(null=True, blank=True)

    google_id = models.CharField(max_length=255, unique=True, null=True, blank=True)
    apple_id = models.CharField(max_length=255, unique=True, null=True, blank=True)

    age = models.PositiveSmallIntegerField(null=True, blank=True)
    grade = models.PositiveSmallIntegerField(null=True, blank=True)
    sex = models.CharField(max_length=10, choices=Sex.choices, blank=True, default="")
    marz = models.CharField(max_length=255, blank=True, default="")
    school = models.ForeignKey(School, on_delete=models.SET_NULL, null=True, blank=True, related_name="students")
    university = models.ForeignKey(
        University, on_delete=models.SET_NULL, null=True, blank=True, related_name="applicants"
    )

    # Subjects (apps.mock_exams.MockExamSubject keys) this user is willing to
    # tutor others in — empty by default, opted into via profile settings.
    tutor_subjects = models.JSONField(default=list, blank=True)

    USERNAME_FIELD = "username"
    REQUIRED_FIELDS = ["email"]

    def __str__(self):
        return self.username

    def save(self, *args, **kwargs):
        if self.email:
            self.email = self.email.lower()
        super().save(*args, **kwargs)

    def set_email_verification_code(self, code: str, ttl_minutes: int = 15) -> None:
        self.email_verification_code = code
        self.email_verification_expires_at = timezone.now() + timezone.timedelta(minutes=ttl_minutes)


class UserSession(models.Model):
    """One row per logged-in device. session_id is embedded as a custom claim
    in that device's JWTs (see apps/users/utils.py:issue_tokens_for_user) so
    revocation can be checked on every request — see
    apps/users/authentication.py. Used to cap active devices per account
    (apps/users/sessions.py) as subscription-sharing protection."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="sessions")
    session_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    last_activity_at = models.DateTimeField(auto_now_add=True)
    revoked_at = models.DateTimeField(null=True, blank=True)
    platform = models.CharField(max_length=100, blank=True, default="")
    browser = models.CharField(max_length=100, blank=True, default="")
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        ordering = ["-last_activity_at"]

    @property
    def is_active(self) -> bool:
        return self.revoked_at is None

    def revoke(self) -> None:
        self.revoked_at = timezone.now()
        self.save(update_fields=["revoked_at"])
