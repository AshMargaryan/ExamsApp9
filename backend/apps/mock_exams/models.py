from django.conf import settings
from django.db import models


# ---------------------------------------------------------------------------
# Content: a MockExam is one of the 50 imported entrance-exam JSON files —
# a flat list of 65 questions, independent of apps.practice's hierarchy.
# ---------------------------------------------------------------------------

class MockExamSubject(models.TextChoices):
    MATH = "math", "Mathematics"
    PHYSICS = "physics", "Physics"
    BIOLOGY = "biology", "Biology"
    CHEMISTRY = "chemistry", "Chemistry"
    ENGLISH = "english", "English"


class MockExam(models.Model):
    exam_id = models.CharField(max_length=50, unique=True)
    title = models.CharField(max_length=300)
    question_count = models.PositiveIntegerField()
    order = models.PositiveIntegerField(default=0)
    subject = models.CharField(
        max_length=20, choices=MockExamSubject.choices, default=MockExamSubject.MATH,
        db_index=True,
    )

    class Meta:
        ordering = ["subject", "order", "exam_id"]

    def __str__(self):
        return self.title


class MockExamQuestionType(models.TextChoices):
    SINGLE_CHOICE = "single_choice", "Single Choice"
    FREE_RESPONSE = "free_response", "Free Response"
    MULTI_STATEMENT = "multi_statement", "Multi Statement"
    MATCHING = "matching", "Matching"


class MockExamDifficulty(models.TextChoices):
    EASY = "easy", "Easy"
    MEDIUM = "medium", "Medium"
    HARD = "hard", "Hard"


class MockExamQuestion(models.Model):
    exam = models.ForeignKey(MockExam, on_delete=models.CASCADE, related_name="questions")
    number = models.PositiveIntegerField(help_text="Display order within the exam (1-65).")
    topic = models.CharField(max_length=200, blank=True, default="")
    group = models.CharField(
        max_length=100, blank=True, default="",
        help_text="Informational clustering key from the source JSON; not rendered specially.",
    )
    question_type = models.CharField(max_length=20, choices=MockExamQuestionType.choices)
    text = models.TextField()
    difficulty = models.CharField(max_length=10, choices=MockExamDifficulty.choices)

    hint = models.TextField(blank=True, default="")
    solution_steps = models.JSONField(default=list, blank=True)

    # Optional inline SVG figure (e.g. physics diagrams). Trusted content from
    # the imported dataset; rendered as-is by the frontend.
    figure_svg = models.TextField(blank=True, default="")

    # free_response only
    correct_answer_text = models.TextField(blank=True, default="")

    # f"{exam.exam_id}-{number}" — ties back to the source file for idempotent re-import.
    dataset_id = models.CharField(max_length=100, unique=True)

    class Meta:
        ordering = ["exam", "number"]

    def __str__(self):
        return f"[{self.exam.exam_id} #{self.number}] {self.text[:60]}"


class MockExamChoice(models.Model):
    """Options for single_choice questions. Exactly one is_correct=True."""
    question = models.ForeignKey(MockExamQuestion, on_delete=models.CASCADE, related_name="choices")
    text = models.CharField(max_length=500)
    is_correct = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return self.text


class MockExamStatement(models.Model):
    """A statement within a multi_statement question, OR a LEFT-column item of a
    matching question (label = 'A','B',...; match_target = the correct right-column
    number). For matching items is_true is unused (stored False)."""
    question = models.ForeignKey(MockExamQuestion, on_delete=models.CASCADE, related_name="statements")
    label = models.CharField(max_length=10, help_text="Armenian letter, e.g. 'Ա', 'Բ', ...")
    text = models.TextField()
    is_true = models.BooleanField()
    order = models.PositiveIntegerField(default=0)
    # matching only: the 1-based number of the correct right-column item.
    match_target = models.PositiveSmallIntegerField(null=True, blank=True)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return f"{self.label}: {self.text[:50]}"


# ---------------------------------------------------------------------------
# Attempts
# ---------------------------------------------------------------------------

class MockExamAttemptStatus(models.TextChoices):
    IN_PROGRESS = "in_progress", "In Progress"
    COMPLETED = "completed", "Completed"


class MockExamAttempt(models.Model):
    """
    One timed sitting of a MockExam. Unlike PracticeAttempt this is NOT a
    singleton per (user, exam) — every finish creates a new completed row so
    users can retake an exam and keep a history. A user may have at most one
    in_progress attempt per exam at a time (enforced in the view, not the DB,
    since "at most one" isn't expressible as a simple unique_together once
    completed rows for the same exam also exist).
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="mock_exam_attempts"
    )
    exam = models.ForeignKey(MockExam, on_delete=models.CASCADE, related_name="attempts")
    status = models.CharField(
        max_length=15, choices=MockExamAttemptStatus.choices, default=MockExamAttemptStatus.IN_PROGRESS
    )

    duration_minutes = models.PositiveIntegerField(null=True, blank=True, help_text="None = untimed.")
    hints_enabled = models.BooleanField(default=True)

    started_at = models.DateTimeField(auto_now_add=True)
    time_remaining_seconds = models.IntegerField(
        null=True, blank=True, help_text="Snapshot of remaining time as of the last draft save."
    )
    completed_at = models.DateTimeField(null=True, blank=True)

    raw_score = models.PositiveIntegerField(null=True, blank=True)
    scaled_score = models.FloatField(null=True, blank=True)
    percent_answered = models.FloatField(null=True, blank=True)

    easy_correct = models.PositiveIntegerField(default=0)
    easy_total = models.PositiveIntegerField(default=0)
    medium_correct = models.PositiveIntegerField(default=0)
    medium_total = models.PositiveIntegerField(default=0)
    hard_correct = models.PositiveIntegerField(default=0)
    hard_total = models.PositiveIntegerField(default=0)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-started_at"]

    def __str__(self):
        return f"{self.user} / {self.exam.exam_id} [{self.status}] = {self.scaled_score}"


class MockExamAnswer(models.Model):
    attempt = models.ForeignKey(MockExamAttempt, on_delete=models.CASCADE, related_name="answers")
    question = models.ForeignKey(MockExamQuestion, on_delete=models.CASCADE)
    is_correct = models.BooleanField(null=True, blank=True, help_text="Null until the attempt is finished.")

    selected_choice = models.ForeignKey(
        MockExamChoice, null=True, blank=True, on_delete=models.SET_NULL
    )
    answer_text = models.TextField(blank=True, default="")
    selected_statement_ids = models.JSONField(default=list, blank=True)
    # matching only: {statement_id (str): choice_id (int)} — the student's connections.
    match_pairs = models.JSONField(default=dict, blank=True)

    answered_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("attempt", "question")]
