from django.conf import settings
from django.db import models


# ---------------------------------------------------------------------------
# Content hierarchy: Subject -> Domain -> Topic -> Subtopic (always 3 levels
# deep, matching data_scripts/source/math/topics.txt and the generation
# pipeline's domain/topic/subtopic fields).
# ---------------------------------------------------------------------------

class Subject(models.Model):
    name = models.CharField(max_length=120, unique=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "name"]

    def __str__(self):
        return self.name


class Domain(models.Model):
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name="domains")
    name = models.CharField(max_length=200)
    order = models.PositiveIntegerField(default=0)
    intro_text = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["order", "name"]
        unique_together = [("subject", "name")]

    def __str__(self):
        return f"{self.subject} / {self.name}"


class Topic(models.Model):
    domain = models.ForeignKey(Domain, on_delete=models.CASCADE, related_name="topics")
    name = models.CharField(max_length=200)
    order = models.PositiveIntegerField(default=0)
    intro_text = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["order", "name"]
        unique_together = [("domain", "name")]

    def __str__(self):
        return f"{self.domain} / {self.name}"


class Subtopic(models.Model):
    topic = models.ForeignKey(Topic, on_delete=models.CASCADE, related_name="subtopics")
    name = models.CharField(max_length=200)
    order = models.PositiveIntegerField(default=0)
    intro_text = models.TextField(blank=True, default="")
    learning_material = models.TextField(
        blank=True, default="", help_text="Populated later — not built yet."
    )

    class Meta:
        ordering = ["order", "name"]
        unique_together = [("topic", "name")]

    def __str__(self):
        return f"{self.topic} / {self.name}"


# ---------------------------------------------------------------------------
# Questions
# ---------------------------------------------------------------------------

class Tier(models.TextChoices):
    EASY = "easy", "Easy"
    MEDIUM = "medium", "Medium"
    HARD = "hard", "Hard"


class QuestionType(models.TextChoices):
    MULTIPLE_CHOICE = "multiple_choice", "Multiple Choice"
    SHORT_ANSWER = "short_answer", "Short Answer"
    TRUE_FALSE = "true_false", "True/False Group"


class Question(models.Model):
    subtopic = models.ForeignKey(Subtopic, on_delete=models.CASCADE, related_name="questions")
    tier = models.CharField(max_length=10, choices=Tier.choices)
    question_type = models.CharField(max_length=20, choices=QuestionType.choices)

    # For multiple_choice/short_answer: the question text.
    # For true_false: the shared exercise_text all statements refer to.
    text = models.TextField()

    # Reading-comprehension passage shown above the question, if any
    # (English reading subtopics; unused by math/other subjects).
    passage = models.TextField(blank=True, default="")

    hint = models.TextField(blank=True, default="")
    explanation = models.TextField(blank=True, default="")
    video_url = models.URLField(blank=True, default="")

    # short_answer only
    correct_answer_text = models.TextField(blank=True, default="")

    # Ties back to the pipeline's dataset_id (or the group's dataset_id for
    # true_false) so re-running the importer upserts instead of duplicating.
    dataset_id = models.CharField(max_length=100, unique=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["subtopic", "tier", "id"]

    def __str__(self):
        return f"[{self.question_type}/{self.tier}] {self.text[:60]}"


class Choice(models.Model):
    """Options for multiple_choice questions. Exactly one is_correct=True."""
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name="choices")
    text = models.CharField(max_length=500)
    is_correct = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return self.text


class Statement(models.Model):
    """One statement within a true_false Question's group."""
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name="statements")
    label = models.CharField(max_length=10, help_text="e.g. 'I', 'II', ...")
    text = models.TextField()
    is_true = models.BooleanField()
    hint = models.TextField(blank=True, default="")
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return f"{self.label}: {self.text[:50]}"


# ---------------------------------------------------------------------------
# Practice attempts
# ---------------------------------------------------------------------------

class PracticeAttempt(models.Model):
    """
    One user's attempt at one subtopic+tier (4 questions). Upserted every
    time the user submits answers for that tier. revealed_answers=True means
    the attempt doesn't count as a completed/scored attempt for progress
    purposes (the user peeked before finishing).
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="practice_attempts"
    )
    subtopic = models.ForeignKey(Subtopic, on_delete=models.CASCADE, related_name="attempts")
    tier = models.CharField(max_length=10, choices=Tier.choices)
    score = models.FloatField(null=True, blank=True)
    revealed_answers = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [("user", "subtopic", "tier")]

    def __str__(self):
        return f"{self.user} / {self.subtopic} / {self.tier} = {self.score}"


class AttemptAnswer(models.Model):
    attempt = models.ForeignKey(PracticeAttempt, on_delete=models.CASCADE, related_name="answers")
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    is_correct = models.BooleanField()

    selected_choice = models.ForeignKey(Choice, null=True, blank=True, on_delete=models.SET_NULL)
    answer_text = models.TextField(blank=True, default="")
    selected_statement_ids = models.JSONField(default=list, blank=True)

    answered_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("attempt", "question")]


# ---------------------------------------------------------------------------
# Daily problem — one deterministically-picked question per calendar day,
# the same for every user, answered at most once.
# ---------------------------------------------------------------------------

class DailyProblemAttempt(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="daily_problem_attempts"
    )
    date = models.DateField()
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name="daily_attempts")
    is_correct = models.BooleanField()

    selected_choice = models.ForeignKey(Choice, null=True, blank=True, on_delete=models.SET_NULL)
    answer_text = models.TextField(blank=True, default="")
    selected_statement_ids = models.JSONField(default=list, blank=True)

    answered_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("user", "date")]
        ordering = ["-date"]

    def __str__(self):
        return f"{self.user} / {self.date} = {'✓' if self.is_correct else '✗'}"


# ---------------------------------------------------------------------------
# Weakness tracking — running per-student wrong-answer counts per topic, fed
# by both this app (subtopic-linked) and apps.mock_exams (free-text topic;
# mock exams use their own subject/topic taxonomy that doesn't map onto the
# Subject/Subtopic hierarchy above). Drives the "Recommended Exercises" rank.
# ---------------------------------------------------------------------------

class MistakeSource(models.TextChoices):
    PRACTICE = "practice", "Practice"
    MOCK_EXAM = "mock_exam", "Mock Exam"


class TopicMistake(models.Model):
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="topic_mistakes"
    )
    source = models.CharField(max_length=10, choices=MistakeSource.choices)
    subject_name = models.CharField(max_length=120)
    topic_label = models.CharField(max_length=200)
    # Only set for source=practice, where the topic is an actual Subtopic row.
    # Mock exam mistakes have no equivalent row to point at (see module docstring).
    subtopic = models.ForeignKey(
        Subtopic, null=True, blank=True, on_delete=models.SET_NULL, related_name="mistakes"
    )
    incorrect_count = models.PositiveIntegerField(default=0)
    last_incorrect_at = models.DateTimeField()

    class Meta:
        unique_together = [("student", "source", "subject_name", "topic_label")]
        ordering = ["-incorrect_count", "-last_incorrect_at"]

    def __str__(self):
        return f"{self.student} / {self.topic_label} = {self.incorrect_count}"
