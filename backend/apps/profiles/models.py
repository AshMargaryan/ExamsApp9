from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from apps.mock_exams.models import MockExamSubject

from .leveling import level_for_xp


def avatar_upload_path(instance, filename):
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    return f"avatars/user_{instance.user_id}.{ext}" if ext else f"avatars/user_{instance.user_id}"


class Profile(models.Model):
    """Extends User with display/gamification data that isn't account/auth data."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile"
    )
    avatar = models.ImageField(upload_to=avatar_upload_path, null=True, blank=True)
    bio = models.TextField(max_length=500, blank=True, default="")

    total_xp = models.PositiveIntegerField(default=0)

    target_exam_date = models.DateField(
        null=True, blank=True, help_text="User-set date of their entrance exam, for the countdown."
    )
    target_major = models.CharField(
        max_length=200, blank=True, default="", help_text="Free-text target major/program, e.g. 'Computer Science'."
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Profile({self.user})"

    @property
    def level(self) -> int:
        return level_for_xp(self.total_xp)


class Rarity(models.TextChoices):
    COMMON = "common", "Common"
    RARE = "rare", "Rare"
    EPIC = "epic", "Epic"
    LEGENDARY = "legendary", "Legendary"


class RequirementType(models.TextChoices):
    """
    What an achievement's progress is measured against. Adding a new kind of
    achievement means adding a choice here plus a matching evaluator in
    engine.REQUIREMENT_EVALUATORS — no schema change needed.
    """

    QUESTIONS_SOLVED = "questions_solved", "Questions solved (lifetime correct answers)"
    PERFECT_SCORE = "perfect_score", "Best practice-tier score reached (0-100)"
    STREAK_DAYS = "streak_days", "Longest learning streak (days)"
    GAMES_PLAYED = "games_played", "Multiplayer games played (lifetime)"
    GAMES_WON = "games_won", "Multiplayer games won (lifetime)"


class Achievement(models.Model):
    """Catalog of unlockable trophies/achievements."""

    key = models.SlugField(max_length=100, unique=True)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    icon = models.CharField(max_length=100, blank=True, default="")
    rarity = models.CharField(max_length=20, choices=Rarity.choices, default=Rarity.COMMON)
    requirement_type = models.CharField(
        max_length=40, choices=RequirementType.choices, default=RequirementType.QUESTIONS_SOLVED
    )
    requirement_value = models.PositiveIntegerField(
        default=0, help_text="Threshold the requirement_type's metric must reach/exceed."
    )
    xp_reward = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class UserAchievement(models.Model):
    """An unlocked achievement for a user."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="unlocked_achievements"
    )
    achievement = models.ForeignKey(Achievement, on_delete=models.CASCADE, related_name="unlocks")
    unlocked_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("user", "achievement")]
        ordering = ["-unlocked_at"]

    def __str__(self):
        return f"{self.user} / {self.achievement}"


class ShowcaseSlot(models.Model):
    """A student-chosen achievement pinned to one of 3 hero slots. When a
    user has no slots set, ProfileSerializer falls back to auto-picking the
    rarest unlocked achievements — this only overrides that default."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="showcase_slots"
    )
    achievement = models.ForeignKey(Achievement, on_delete=models.CASCADE, related_name="showcased_in")
    position = models.PositiveSmallIntegerField(help_text="0, 1, or 2 — display order.")

    class Meta:
        unique_together = [("user", "position"), ("user", "achievement")]
        ordering = ["position"]

    def __str__(self):
        return f"{self.user} showcase[{self.position}] = {self.achievement}"


class GoalType(models.TextChoices):
    """What a PersonalGoal's progress is measured against. Mirrors
    apps.parents.GoalType but self-authored by the student rather than set
    by a parent, with a couple of extra student-relevant types."""

    SUBJECT_ACCURACY = "subject_accuracy", "Accuracy in a subject (%)"
    TESTS_THIS_WEEK = "tests_this_week", "Mock exams completed this week"
    STREAK_DAYS = "streak_days", "Learning streak (days)"
    STUDY_HOURS_MONTH = "study_hours_month", "Study hours this month"
    XP_THIS_MONTH = "xp_this_month", "XP earned this month"
    CUSTOM = "custom", "Custom (self-reported)"


class GoalPriority(models.TextChoices):
    LOW = "low", "Low"
    MEDIUM = "medium", "Medium"
    HIGH = "high", "High"


class PersonalGoal(models.Model):
    """A target a student sets for themself. Progress for every typed goal
    is computed live in analytics.goal_progress — never stored, so it can't
    go stale. CUSTOM goals have no computable metric and are marked done by
    the student directly (completed_at set on completion, not derived)."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="personal_goals"
    )
    goal_type = models.CharField(max_length=20, choices=GoalType.choices)
    target_value = models.PositiveIntegerField(
        default=0, help_text="Tests, streak days, study hours, XP, or accuracy % depending on goal_type. Unused for custom goals."
    )
    subject = models.ForeignKey(
        "practice.Subject", on_delete=models.CASCADE, null=True, blank=True,
        help_text="Required for subject_accuracy goals; ignored otherwise.",
    )
    custom_title = models.CharField(
        max_length=200, blank=True, default="", help_text="Required for custom goals; ignored otherwise."
    )
    priority = models.CharField(max_length=10, choices=GoalPriority.choices, default=GoalPriority.MEDIUM)
    metadata = models.JSONField(
        default=dict, blank=True,
        help_text="Free-form structured extras for consuming systems (e.g. future AI context/study-planner). Not read or interpreted here.",
    )
    deadline = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        label = self.custom_title if self.goal_type == GoalType.CUSTOM else self.get_goal_type_display()
        return f"{self.user} / {label}"


class ProfilePrivacySettings(models.Model):
    """Per-user visibility toggles for what other users (friends, public
    profile viewers) can see. Owner always sees everything on their own
    profile — these only gate the *other-user* view. Safe defaults: age is
    off by default, everything else on."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="privacy_settings"
    )
    show_school = models.BooleanField(default=True)
    show_age = models.BooleanField(default=False)
    show_university = models.BooleanField(default=True)
    show_stats = models.BooleanField(default=True)
    show_ranking = models.BooleanField(
        default=True, help_text="Show this user's ranking medals/trophy case on their profile."
    )
    show_achievements = models.BooleanField(default=True)
    show_friends = models.BooleanField(default=True)
    show_activity = models.BooleanField(default=True)
    show_on_leaderboard = models.BooleanField(
        default=True,
        help_text=(
            "Whether this user appears in other users' global/school/class/friends "
            "leaderboards at all. Distinct from show_ranking, which only gates the "
            "medals/trophy case shown on their own profile — this one opts them out "
            "of the leaderboard lists themselves. They can always still see their own "
            "position privately even when this is off."
        ),
    )

    def __str__(self):
        return f"PrivacySettings({self.user})"


class StudentExam(models.Model):
    """An exam a student is preparing for — distinct from
    apps.mock_exams.MockExamAttempt (a record of a completed/in-progress
    practice sitting). This is forward-looking metadata only: this app does
    not compute urgency/readiness/priority from it, that belongs to a future
    Exam Engine (see docs/ai-learning-system/ARCHITECTURE.md)."""

    class Status(models.TextChoices):
        UPCOMING = "upcoming", "Upcoming"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="upcoming_exams"
    )
    name = models.CharField(max_length=200, help_text="e.g. 'Bakalavriat mathematics', 'SAT'.")
    subject_key = models.CharField(
        max_length=20, choices=MockExamSubject.choices, blank=True, default="",
        help_text="Canonical subject key (see apps.profiles.subjects.SUBJECT_LABELS). Blank for multi-subject exams.",
    )
    exam_date = models.DateField()
    target_score = models.PositiveIntegerField(null=True, blank=True)
    importance = models.CharField(max_length=10, choices=GoalPriority.choices, default=GoalPriority.MEDIUM)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.UPCOMING)
    topics_note = models.TextField(blank=True, default="", help_text="Freeform note on which topics this exam covers.")
    notes = models.TextField(blank=True, default="")
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["exam_date"]

    def __str__(self):
        return f"{self.user} / {self.name} ({self.exam_date})"


class StudentSubject(models.Model):
    """A subject a student is actively (or was previously) studying. Keyed
    by the canonical 5-value subject taxonomy (apps.profiles.subjects),
    not a FK to apps.practice.Subject, since practice content only covers
    2 of the 5 subjects today — same reasoning as apps.rankings.SubjectXP.
    Does not compute mastery; that belongs to the future Knowledge Engine."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="subject_interests"
    )
    subject_key = models.CharField(max_length=20, choices=MockExamSubject.choices)
    is_active = models.BooleanField(default=True)
    priority = models.CharField(max_length=10, choices=GoalPriority.choices, default=GoalPriority.MEDIUM)
    target_note = models.CharField(
        max_length=200, blank=True, default="", help_text="Freeform target, e.g. 'score 90+ on entrance exam'."
    )
    exam = models.ForeignKey(
        StudentExam, on_delete=models.SET_NULL, null=True, blank=True, related_name="related_subjects",
        help_text="The upcoming exam this subject is being studied for, if any.",
    )
    start_date = models.DateField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "subject_key"], name="unique_student_subject_per_user"),
        ]
        ordering = ["-is_active", "-created_at"]

    def clean(self):
        if self.exam_id and self.exam.subject_key and self.exam.subject_key != self.subject_key:
            raise ValidationError({"exam": "Linked exam is for a different subject."})

    def __str__(self):
        return f"{self.user} / {self.get_subject_key_display()}"


class StudyAvailability(models.Model):
    """Student-DECLARED study-time preferences — deliberately separate from
    system-observed behavior (apps.activity.StudySession timestamps,
    apps.streaks.LearningStreak counters). Never merge the two: a student
    saying 'I prefer studying at 7pm' is a different fact from historical
    data showing they usually study at 8pm, and future systems (Study
    Planner, Schedule Adaptation) need to reason about the gap between them."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="study_availability"
    )
    preferred_days = models.JSONField(
        default=list, blank=True,
        help_text="List of ISO weekday ints the student prefers to study, 0=Monday..6=Sunday.",
    )
    preferred_start_time = models.TimeField(
        null=True, blank=True, help_text="Student-declared preferred time of day to start studying."
    )
    typical_session_minutes = models.PositiveIntegerField(
        null=True, blank=True, help_text="Student-declared typical/preferred single-session length."
    )
    min_daily_minutes = models.PositiveIntegerField(null=True, blank=True)
    max_daily_minutes = models.PositiveIntegerField(null=True, blank=True)
    timezone = models.CharField(max_length=50, blank=True, default="")
    updated_at = models.DateTimeField(auto_now=True)

    def clean(self):
        if any(d < 0 or d > 6 for d in self.preferred_days):
            raise ValidationError({"preferred_days": "Weekday values must be between 0 and 6."})
        if (
            self.min_daily_minutes is not None
            and self.max_daily_minutes is not None
            and self.min_daily_minutes > self.max_daily_minutes
        ):
            raise ValidationError({"min_daily_minutes": "Cannot exceed max_daily_minutes."})

    def __str__(self):
        return f"StudyAvailability({self.user})"


class ExplanationStyle(models.TextChoices):
    DIRECT = "direct", "Direct — explain fully, no back-and-forth"
    SOCRATIC = "socratic", "Socratic — guided questions before the answer"
    MIXED = "mixed", "Mixed — let the AI Tutor choose per situation"


class LearningPreferences(models.Model):
    """Student-declared pedagogical preferences for the AI Tutor, distinct
    from apps.ai_assistant's per-message conversation_mode (an explicit
    override for one exchange) — these are the *default* the Tutor falls
    back to when the student hasn't picked a mode. Kept separate from
    StudyAvailability (time preferences) and Profile (identity/gamification)
    per the data-separation rule: this is about *how* the student wants to
    be taught, not *when* or *who* they are."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="learning_preferences"
    )
    explanation_style = models.CharField(
        max_length=20, choices=ExplanationStyle.choices, default=ExplanationStyle.MIXED,
    )
    hints_before_answers = models.BooleanField(
        default=True, help_text="Whether the AI Tutor should nudge with hints before revealing full solutions.",
    )
    preferred_language = models.CharField(
        max_length=10, blank=True, default="",
        help_text="ISO language code the student wants the AI Tutor to respond in, e.g. 'hy', 'en'. Blank = no preference.",
    )
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"LearningPreferences({self.user})"


class LearningEventType(models.TextChoices):
    TOPIC_STUDIED = "topic_studied", "Topic studied"
    LESSON_STARTED = "lesson_started", "Lesson started"
    LESSON_COMPLETED = "lesson_completed", "Lesson completed"
    QUESTION_ATTEMPTED = "question_attempted", "Question attempted"
    QUESTION_ANSWERED = "question_answered", "Question answered"
    TEST_COMPLETED = "test_completed", "Test completed"
    STUDY_SESSION_STARTED = "study_session_started", "Study session started"
    STUDY_SESSION_COMPLETED = "study_session_completed", "Study session completed"
    EXPLANATION_REQUESTED = "explanation_requested", "Explanation requested"
    HINT_REQUESTED = "hint_requested", "Hint requested"
    CONCEPT_REVIEWED = "concept_reviewed", "Concept reviewed"
    EXAM_COMPLETED = "exam_completed", "Exam completed"


class LearningEvent(models.Model):
    """Append-only log of discrete learning activity, for future systems
    (Memory Engine, AI Tutor, Confidence Engine, Study Planner, ...) that
    need to know *when* and *how* something happened, not just current
    aggregate state — the kind of history a live-computed view can't
    reconstruct after the fact. Domain apps (practice, mock_exams,
    flashcards, mistakes) remain the source of truth for their own
    attempt/result rows; this does not duplicate them. It exists for event
    types with no other home today (hint/explanation requests, lesson/
    session lifecycle) and as a normalized cross-domain timeline future
    systems can read without knowing every domain app's schema.

    Written via apps.profiles.services.record_event — not exposed for
    students to write directly (see LearningEventListView), since a
    self-reported 'test_completed' event would be meaningless/fakeable."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="learning_events"
    )
    event_type = models.CharField(max_length=30, choices=LearningEventType.choices)
    subject_key = models.CharField(max_length=20, choices=MockExamSubject.choices, blank=True, default="")
    topic_label = models.CharField(max_length=200, blank=True, default="")
    source = models.CharField(
        max_length=30, blank=True, default="",
        help_text="Which app/system recorded this, e.g. 'practice', 'ai_assistant', 'mock_exams'.",
    )
    session = models.ForeignKey(
        "activity.StudySession", on_delete=models.SET_NULL, null=True, blank=True, related_name="learning_events",
    )
    target_id = models.PositiveIntegerField(
        null=True, blank=True,
        help_text="Id of the referenced row in its own app's table (e.g. a PracticeAttempt id), if any.",
    )
    result = models.CharField(
        max_length=30, blank=True, default="", help_text="Short outcome label, e.g. 'correct', 'incorrect', 'completed'."
    )
    metadata = models.JSONField(default=dict, blank=True)
    occurred_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-occurred_at"]
        indexes = [
            models.Index(fields=["user", "-occurred_at"]),
            models.Index(fields=["user", "event_type", "-occurred_at"]),
            models.Index(fields=["user", "subject_key"]),
        ]

    def __str__(self):
        return f"{self.user} / {self.get_event_type_display()} @ {self.occurred_at:%Y-%m-%d %H:%M}"
