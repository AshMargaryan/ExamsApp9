import random
import string
from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone


def _generate_room_code() -> str:
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=6))


class GameRoomType(models.TextChoices):
    PRIVATE = "private", "Private"
    PUBLIC = "public", "Public"


class GameRoomStatus(models.TextChoices):
    WAITING = "waiting", "Waiting"
    RUNNING = "running", "Running"
    FINISHED = "finished", "Finished"


class GameStartCondition(models.TextChoices):
    MANUAL = "manual", "Manual"
    TIMER = "timer", "Timer"
    PLAYER_COUNT = "player_count", "When enough players join"


class GameRoom(models.Model):
    """
    A multiplayer competition lobby. This is scaffolding only — it holds no
    question/answer state. The live-game engine (question solving, real-time
    scoring) is a separate layer built on top of this room/participant model
    later.
    """

    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="created_game_rooms"
    )
    name = models.CharField(max_length=100)
    room_code = models.CharField(max_length=8, unique=True, editable=False)
    type = models.CharField(max_length=10, choices=GameRoomType.choices, default=GameRoomType.PRIVATE)
    max_players = models.PositiveSmallIntegerField(default=4)
    status = models.CharField(max_length=10, choices=GameRoomStatus.choices, default=GameRoomStatus.WAITING)
    start_time = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    # How the room transitions from waiting -> running. The creator can always
    # force a manual start regardless of this setting (see services.start_room);
    # this only controls automatic promotion (see services.maybe_auto_start).
    start_condition = models.CharField(
        max_length=20, choices=GameStartCondition.choices, default=GameStartCondition.MANUAL
    )
    timer_seconds = models.PositiveIntegerField(null=True, blank=True)
    min_players_to_start = models.PositiveSmallIntegerField(null=True, blank=True)
    scheduled_start_at = models.DateTimeField(null=True, blank=True)

    # Set when this room was spawned by public matchmaking rather than created
    # directly by a user. Null for regular private rooms.
    matchmaking_queue = models.ForeignKey(
        "MatchmakingQueue", null=True, blank=True, on_delete=models.SET_NULL, related_name="rooms"
    )

    # Server-authoritative round state. Every player is on the same question
    # at the same time — there is no per-participant pacing. The WebSocket
    # game loop (realtime.py) is the only thing that ever advances this;
    # clients only ever display it, never control it. See gameplay.py.
    current_question_index = models.PositiveSmallIntegerField(default=0)
    current_question_started_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({self.room_code})"

    def save(self, *args, **kwargs):
        if not self.room_code:
            self.room_code = self._generate_unique_code()
        if (
            self.start_condition == GameStartCondition.TIMER
            and self.timer_seconds
            and not self.scheduled_start_at
        ):
            self.scheduled_start_at = timezone.now() + timedelta(seconds=self.timer_seconds)
        super().save(*args, **kwargs)

    @staticmethod
    def _generate_unique_code() -> str:
        while True:
            code = _generate_room_code()
            if not GameRoom.objects.filter(room_code=code).exists():
                return code


class GameParticipant(models.Model):
    game = models.ForeignKey(GameRoom, on_delete=models.CASCADE, related_name="participants")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="game_participations"
    )
    score = models.PositiveIntegerField(default=0)
    rank = models.PositiveSmallIntegerField(null=True, blank=True)
    joined_at = models.DateTimeField(auto_now_add=True)

    # Reconnection support: last time this participant's socket was seen.
    # Progress itself needs no separate field to "preserve" — it's just
    # score + which GameAnswers already exist, both already persisted.
    last_seen_at = models.DateTimeField(null=True, blank=True)

    # Set once, at settle time (services._settle_room), so the results page
    # can show "what you earned from THIS game" correctly even if it's
    # loaded long after achievements have already been marked unlocked.
    xp_earned = models.PositiveIntegerField(default=0)
    newly_unlocked_achievement_keys = models.JSONField(default=list, blank=True)

    # Finalized once at settle time from this participant's GameAnswer rows
    # (see services._finalize_participant_stats) — a stable per-game summary
    # that future tournament/league standings can read or aggregate without
    # re-deriving it from raw answers each time.
    correct_answers = models.PositiveIntegerField(default=0)
    incorrect_answers = models.PositiveIntegerField(default=0)
    unanswered_questions = models.PositiveIntegerField(default=0)
    average_response_time_seconds = models.FloatField(null=True, blank=True)

    class Meta:
        unique_together = [("game", "user")]
        ordering = ["-score", "joined_at"]

    def __str__(self):
        return f"{self.user} @ {self.game} = {self.score}"


class GameSettings(models.Model):
    """
    Per-room competition configuration, set by the host at room creation.
    Points at apps.practice's existing content hierarchy (Subject/Topic/
    Question) rather than duplicating it, so adding a new subject there makes
    it selectable here with no code change. The actual question picks happen
    later, once — see question_engine.populate_game_questions, triggered when
    the room transitions to running (services._start_game_engine).
    """

    room = models.OneToOneField(GameRoom, on_delete=models.CASCADE, related_name="settings")

    subject = models.ForeignKey("practice.Subject", on_delete=models.PROTECT, related_name="+")
    topic = models.ForeignKey(
        "practice.Topic", null=True, blank=True, on_delete=models.PROTECT, related_name="+"
    )

    question_count = models.PositiveSmallIntegerField()
    easy_count = models.PositiveSmallIntegerField(default=0)
    medium_count = models.PositiveSmallIntegerField(default=0)
    hard_count = models.PositiveSmallIntegerField(default=0)

    time_limit_per_question = models.PositiveIntegerField(help_text="Seconds")
    total_game_time = models.PositiveIntegerField(
        null=True, blank=True, help_text="Seconds; optional overall cap"
    )

    allow_mixed_question_types = models.BooleanField(default=True)
    question_types = models.JSONField(
        default=list, blank=True,
        help_text="Subset of practice.QuestionType values allowed in this game.",
    )

    # Scoring weighting for this room — see games.scoring.ScoringConfig. Must
    # sum to 1.0 (enforced in GameSettingsSerializer). Defaults to the
    # suggested ~80% correctness / 20% speed split.
    correctness_weight = models.FloatField(default=0.8)
    speed_weight = models.FloatField(default=0.2)

    def __str__(self):
        return f"Settings({self.room})"


class GameQuestion(models.Model):
    """
    One question locked into a specific room's game, in play order. Populated
    once at room-start time so the set is stable and non-repeating —
    see question_engine.populate_game_questions.
    """

    room = models.ForeignKey(GameRoom, on_delete=models.CASCADE, related_name="game_questions")
    question = models.ForeignKey("practice.Question", on_delete=models.CASCADE, related_name="+")
    order = models.PositiveSmallIntegerField()

    class Meta:
        unique_together = [("room", "question"), ("room", "order")]
        ordering = ["order"]

    def __str__(self):
        return f"{self.room} #{self.order} -> question {self.question_id}"


class GameAnswer(models.Model):
    """One participant's answer to one of their room's GameQuestions."""

    participant = models.ForeignKey(GameParticipant, on_delete=models.CASCADE, related_name="answers")
    game_question = models.ForeignKey(GameQuestion, on_delete=models.CASCADE, related_name="answers")
    is_correct = models.BooleanField()

    selected_choice = models.ForeignKey(
        "practice.Choice", null=True, blank=True, on_delete=models.SET_NULL
    )
    answer_text = models.TextField(blank=True, default="")
    selected_statement_ids = models.JSONField(default=list, blank=True)

    # Seconds between the room's round clock starting this question and this
    # answer landing — computed server-side in gameplay.record_answer, never
    # trusted from the client. Powers the results page's "average time".
    time_taken_seconds = models.FloatField(null=True, blank=True)

    answered_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("participant", "game_question")]

    def __str__(self):
        return f"{self.participant} -> {self.game_question} = {self.is_correct}"


class GameStats(models.Model):
    """
    Lifetime multiplayer stats per user. Standalone (no FKs out to
    achievements/streaks/friends) — same independence pattern as
    LearningStreak, so other features can read it later without this app
    knowing about them.
    """

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="game_stats"
    )
    games_played = models.PositiveIntegerField(default=0)
    wins = models.PositiveIntegerField(default=0)
    losses = models.PositiveIntegerField(default=0)
    points_earned = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"GameStats({self.user})"


class MatchmakingStartMode(models.TextChoices):
    PLAYER_COUNT = "player_count", "Start after X players join"
    TIMER = "timer", "Start after a timer"


class MatchmakingQueue(models.Model):
    """
    A configured public matchmaking pool. "Find Game" joins whichever active
    queue the user picks; the queue's own rules decide when a match forms.
    Admin-managed so new pools/rules can be added without a code change.
    """

    name = models.CharField(max_length=100, unique=True)
    start_mode = models.CharField(max_length=20, choices=MatchmakingStartMode.choices)
    min_players = models.PositiveSmallIntegerField(default=10)
    max_players = models.PositiveSmallIntegerField(default=50)
    timer_seconds = models.PositiveIntegerField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class MatchmakingTicketStatus(models.TextChoices):
    WAITING = "waiting", "Waiting"
    MATCHED = "matched", "Matched"
    CANCELLED = "cancelled", "Cancelled"


class MatchmakingTicket(models.Model):
    """One user's place in a matchmaking queue's line."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="matchmaking_tickets"
    )
    queue = models.ForeignKey(MatchmakingQueue, on_delete=models.CASCADE, related_name="tickets")
    room = models.ForeignKey(
        GameRoom, null=True, blank=True, on_delete=models.SET_NULL, related_name="matchmaking_tickets"
    )
    status = models.CharField(
        max_length=10, choices=MatchmakingTicketStatus.choices, default=MatchmakingTicketStatus.WAITING
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "queue"],
                condition=models.Q(status="waiting"),
                name="unique_waiting_ticket_per_user_queue",
            )
        ]

    def __str__(self):
        return f"{self.user} in {self.queue} ({self.status})"
