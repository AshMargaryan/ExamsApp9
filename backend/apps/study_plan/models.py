from django.conf import settings
from django.db import models


class StudyTaskType(models.TextChoices):
    FLASHCARD_REVIEW = "flashcard_review", "Flashcard Review"
    PRACTICE_WEAK_TOPIC = "practice_weak_topic", "Practice Weak Topic"
    MISTAKE_RETRY = "mistake_retry", "Mistake Retry"
    MOCK_EXAM_RETAKE = "mock_exam_retake", "Mock Exam Retake"


class DailyStudyPlan(models.Model):
    """One generated-on-demand plan per (user, calendar day) — created lazily
    the first time the student opens the study plan page that day, then
    served from the DB for the rest of the day instead of regenerating."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="study_plans"
    )
    date = models.DateField()
    headline = models.TextField(blank=True, default="")
    # Personalized "warm mentor" message written by the LLM alongside the
    # headline (see services._ai_narrate) — references this student's real
    # weak topic/streak/trend. Empty when the provider call failed that day;
    # the frontend falls back to the rule-based apps.profiles.analytics.coach()
    # text in that case, so this is purely additive, never required.
    coach_message = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("user", "date")]
        ordering = ["-date"]

    def __str__(self):
        return f"{self.user} / {self.date}"


class StudyTask(models.Model):
    """One concrete recommended action within a DailyStudyPlan. Completion is
    never stored here — apps.study_plan.services.completion_status() derives
    it live from the relevant app's own activity tables (FlashcardReview,
    PracticeAttempt, MistakeEntry, MockExamAttempt), so it can never go stale
    relative to what the student actually did."""

    plan = models.ForeignKey(DailyStudyPlan, on_delete=models.CASCADE, related_name="tasks")
    order = models.PositiveIntegerField(default=0)
    task_type = models.CharField(max_length=25, choices=StudyTaskType.choices)
    subject_name = models.CharField(max_length=120)
    topic_label = models.CharField(max_length=200, blank=True, default="")
    title = models.CharField(max_length=300)
    blurb = models.TextField(blank=True, default="")
    link_path = models.CharField(max_length=200)

    # The underlying deck/subtopic/mistake/exam id this task points at — used
    # only by completion_status() to look up live activity, never rendered.
    target_id = models.PositiveIntegerField()
    # Type-specific extras needed only for completion lookups (e.g.
    # {"tier": "medium"} for practice_weak_topic, {"entry_ids": [...]} for
    # mistake_retry). Empty for types that don't need any.
    params = models.JSONField(default=dict, blank=True)
    # For flashcard_review: how many cards were due when the plan was
    # generated (the "X/N" progress denominator). Null for other types.
    target_count = models.PositiveIntegerField(null=True, blank=True)
    estimated_minutes = models.PositiveIntegerField(default=10)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return f"[{self.plan}] {self.title}"


class CheckInFeeling(models.TextChoices):
    GREAT = "great", "Great"
    OK = "ok", "OK"
    STRUGGLED = "struggled", "Struggled"


class TaskCheckIn(models.Model):
    """A student's own quick self-rating of how a task went, captured once
    it's done (see views.TaskCheckInView). Feeds build_candidates() so a
    'struggled' rating bumps that topic back up tomorrow even if the raw
    mistake count alone wouldn't have — the plan reacts to how the task
    actually felt, not just whether the answer was right."""

    task = models.OneToOneField(StudyTask, on_delete=models.CASCADE, related_name="check_in")
    feeling = models.CharField(max_length=10, choices=CheckInFeeling.choices)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.task} — {self.feeling}"


class WeeklyCoachReportDelivery(models.Model):
    """Tracks the last AI-written weekly report emailed to this student, so
    it goes out at most once every 7 days. Checked lazily whenever the
    student opens the study plan page (this project has no cron/Celery —
    see apps.rankings.services / apps.parents.services.WeeklyReportDelivery
    for the same lazy pattern). last_report_text is kept so the page can
    keep showing 'your week in review' between sends, not just the moment
    it's generated."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="weekly_coach_report_delivery"
    )
    last_sent_at = models.DateTimeField()
    last_report_text = models.TextField(blank=True, default="")

    def __str__(self):
        return f"{self.user} — {self.last_sent_at:%Y-%m-%d}"
