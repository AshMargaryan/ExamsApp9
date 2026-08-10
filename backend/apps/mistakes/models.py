from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models


class MistakeEntrySource(models.TextChoices):
    PRACTICE = "practice", "Practice"
    MOCK_EXAM = "mock_exam", "Mock Exam"
    FLASHCARD = "flashcard", "Flashcard"


class MistakeEntry(models.Model):
    """
    Permanent log of one incorrect answer — the Mistake Notebook. Created
    once per wrong grading event (practice tier/daily problem, mock exam
    finish, or a flashcard graded "again") and never updated or deduped, so
    a student's mistake history persists even after they later answer the
    same question correctly elsewhere.

    Question/card content is snapshotted onto this row (question_text,
    render_data, correct_answer_text, ...) so the entry stays intact even if
    the source row is later edited or deleted. `content_object` is kept only
    to support the "Retry" action (re-grading against the live question) —
    if the source row is gone, retry is simply unavailable; the log entry
    itself is unaffected.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="mistake_entries"
    )
    source = models.CharField(max_length=12, choices=MistakeEntrySource.choices, db_index=True)
    subject_name = models.CharField(max_length=120)
    topic_label = models.CharField(max_length=200, blank=True, default="")

    # Mirrors the source app's question_type string (multiple_choice,
    # short_answer, true_false, single_choice, free_response,
    # multi_statement, matching, flashcard).
    question_type = models.CharField(max_length=20)
    question_text = models.TextField()
    # Safe (non-revealing) interactive shape for the retry widget — choice/
    # statement lists with real DB ids, or flashcard back/translation.
    render_data = models.JSONField(default=dict, blank=True)

    your_answer_text = models.TextField()
    correct_answer_text = models.TextField()
    explanation = models.TextField(blank=True, default="")
    hint = models.TextField(blank=True, default="")

    content_type = models.ForeignKey(ContentType, null=True, blank=True, on_delete=models.SET_NULL)
    object_id = models.PositiveIntegerField(null=True, blank=True)
    content_object = GenericForeignKey("content_type", "object_id")

    created_at = models.DateTimeField(auto_now_add=True)

    # Retry stats — set only by MistakeRetryView; the log entry above never
    # changes, so these are purely a running tally of retry attempts.
    retry_count = models.PositiveIntegerField(default=0)
    last_retried_at = models.DateTimeField(null=True, blank=True)
    last_retry_correct = models.BooleanField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "created_at"]),
            models.Index(fields=["user", "source"]),
        ]

    def __str__(self):
        return f"{self.user} / {self.subject_name} / {self.question_text[:50]}"
