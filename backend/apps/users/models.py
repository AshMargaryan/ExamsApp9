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

    age = models.PositiveSmallIntegerField(null=True, blank=True)
    grade = models.PositiveSmallIntegerField(null=True, blank=True)
    sex = models.CharField(max_length=10, choices=Sex.choices, blank=True, default="")
    marz = models.CharField(max_length=255, blank=True, default="")
    school = models.ForeignKey(School, on_delete=models.SET_NULL, null=True, blank=True, related_name="students")
    university = models.ForeignKey(
        University, on_delete=models.SET_NULL, null=True, blank=True, related_name="applicants"
    )

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
