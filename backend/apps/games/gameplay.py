"""
Server-authoritative gameplay engine for multiplayer competition rooms.

Each participant advances through the room's fixed, locked-in question
order (see question_engine.populate_game_questions) at their OWN pace —
nobody waits mid-game for anyone else. A participant's
current_question_index / current_question_started_at are what's
authoritative for THEM; the client only ever displays what the server says
(see realtime — WebSocket — and views.CurrentQuestionView — REST fallback),
never advances on its own timer. record_answer independently re-checks the
deadline against the server clock before accepting any answer, exactly like
before; the only thing that changed is that this deadline/index is now
per-participant instead of per-room.

Reuses apps.practice's own scoring so multiplayer and solo practice can
never silently disagree on what counts as correct.
"""
from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from apps.practice.scoring import score_answer

from .models import GameAnswer, GameParticipant, GameQuestion, GameRoom, GameRoomStatus
from .scoring import ScoringConfig, compute_score

# Reading-comprehension questions (Question.passage set — currently only
# English's "Տեքստի ընկալում" / reading-comprehension subtopics, but this is
# driven by the data, not a hardcoded subject/topic name, so it applies
# automatically to any future subject that uses passages too) need much
# more time than a plain question of the same tier: the player has to read
# a whole passage first. Modeled as a bonus on top of the room's own
# per-tier time limit, sized to the passage's actual length (~150 words/min
# conservative reading speed, since they're also answering, not just
# reading), clamped so a one-line passage doesn't get a silly bonus and a
# very long one doesn't blow out the round.
PASSAGE_READING_WORDS_PER_MINUTE = 150
PASSAGE_BONUS_MIN_SECONDS = 30
PASSAGE_BONUS_MAX_SECONDS = 180


def _scoring_config(room: GameRoom) -> ScoringConfig:
    settings = room.settings
    return ScoringConfig(
        correctness_weight=settings.correctness_weight,
        speed_weight=settings.speed_weight,
    )


def get_room_questions(room: GameRoom) -> list[GameQuestion]:
    return list(
        room.game_questions.select_related("question")
        .prefetch_related("question__choices", "question__statements")
        .order_by("order")
    )


def _passage_reading_bonus_seconds(passage: str) -> int:
    word_count = len(passage.split())
    bonus = round(word_count / PASSAGE_READING_WORDS_PER_MINUTE * 60)
    return max(PASSAGE_BONUS_MIN_SECONDS, min(PASSAGE_BONUS_MAX_SECONDS, bonus))


def time_limit_for_question(room: GameRoom, game_question: GameQuestion) -> int:
    question = game_question.question
    base = room.settings.time_limit_for_tier(question.tier)
    if question.passage:
        return base + _passage_reading_bonus_seconds(question.passage)
    return base


def participant_deadline(participant: GameParticipant, room: GameRoom, questions: list[GameQuestion] | None = None):
    """This participant's personal deadline for their current question, or
    None if they have no question in progress (finished, or not started)."""
    if participant.current_question_started_at is None or room.settings is None:
        return None
    questions = get_room_questions(room) if questions is None else questions
    if participant.current_question_index >= len(questions):
        return None
    game_question = questions[participant.current_question_index]
    limit = time_limit_for_question(room, game_question)
    return participant.current_question_started_at + timedelta(seconds=limit)


def get_participant_state(
    participant: GameParticipant, room: GameRoom, questions: list[GameQuestion] | None = None
) -> dict:
    """This participant's personal authoritative snapshot: their current
    question + personal deadline, or finished. Two different participants
    in the same room can be (and usually are) at different questions."""
    questions = get_room_questions(room) if questions is None else questions
    total = len(questions)

    if participant.finished_at is not None or participant.current_question_index >= total:
        return {"finished": True, "total_questions": total}

    game_question = questions[participant.current_question_index]
    deadline = participant_deadline(participant, room, questions)
    remaining = (deadline - timezone.now()).total_seconds() if deadline else 0

    return {
        "finished": False,
        "game_question": game_question,
        "question_number": participant.current_question_index + 1,
        "total_questions": total,
        "seconds_remaining": max(0, round(remaining)),
        "deadline": deadline,
    }


def has_answered(participant: GameParticipant, game_question: GameQuestion) -> bool:
    return GameAnswer.objects.filter(participant=participant, game_question=game_question).exists()


def _advance_participant(participant: GameParticipant, room: GameRoom, questions: list[GameQuestion]) -> None:
    """Moves this participant to their next question, or marks them
    finished if that was their last one. The ONLY place
    current_question_index/finished_at change for a participant."""
    total = len(questions)
    participant.current_question_index += 1
    if participant.current_question_index >= total:
        participant.current_question_started_at = None
        participant.finished_at = timezone.now()
        participant.save(
            update_fields=["current_question_index", "current_question_started_at", "finished_at"]
        )
        from .services import check_room_completion  # local import: avoid gameplay<->services cycle

        check_room_completion(room)
    else:
        participant.current_question_started_at = timezone.now()
        participant.save(update_fields=["current_question_index", "current_question_started_at"])


@transaction.atomic
def record_answer(room: GameRoom, participant: GameParticipant, question_id: int, answer_data: dict) -> dict:
    """
    Scores and stores one participant's answer to THEIR current question,
    then immediately advances them to their next one (or finishes them) —
    nobody else's progress gates this.

    Lock order is always ROOM then PARTICIPANT, matching
    services.maybe_close_by_time_cap / _force_finish_all_participants (room
    lock, then a bulk UPDATE that row-locks participants) and
    check_room_completion (room lock only). Never acquire these in the
    opposite order anywhere — that's what would make a deadlock possible
    between a participant answering and the time-cap closer racing on the
    same room.
    """
    # select_for_update can't be combined with select_related("settings")
    # here — settings is a nullable reverse one-to-one, which Postgres
    # rejects locking across ("FOR UPDATE cannot be applied to the nullable
    # side of an outer join"). Fetched separately below where needed.
    room = GameRoom.objects.select_for_update().get(pk=room.pk)
    if room.status != GameRoomStatus.RUNNING:
        raise ValueError("Խաղն ընթացքի մեջ չէ։")

    participant = GameParticipant.objects.select_for_update().get(pk=participant.pk)
    if participant.finished_at is not None:
        raise ValueError("Արդեն ավարտել ես հարցերը։")

    questions = get_room_questions(room)
    total = len(questions)
    if participant.current_question_index >= total:
        raise ValueError("Հարցերն ավարտվել են։")

    game_question = questions[participant.current_question_index]
    if game_question.question_id != question_id:
        raise ValueError("Այս հարցն այլևս ընթացիկը չէ։")

    deadline = participant_deadline(participant, room, questions)
    if deadline and timezone.now() > deadline:
        raise ValueError("Ժամանակը սպառված է այս հարցի համար։")

    if has_answered(participant, game_question):
        raise ValueError("Այս հարցին արդեն պատասխանել եք։")

    time_taken = None
    if participant.current_question_started_at:
        time_taken = (timezone.now() - participant.current_question_started_at).total_seconds()

    result = score_answer(game_question.question, answer_data)
    GameAnswer.objects.create(
        participant=participant, game_question=game_question, time_taken_seconds=time_taken, **result
    )

    if result["is_correct"]:
        points = compute_score(
            tier=game_question.question.tier,
            is_correct=True,
            time_taken_seconds=time_taken,
            time_limit_seconds=time_limit_for_question(room, game_question),
            config=_scoring_config(room),
        )
        participant.score += points
        participant.save(update_fields=["score"])

    _advance_participant(participant, room, questions)

    return {"is_correct": result["is_correct"]}


def maybe_advance_participant_if_expired(room: GameRoom, participant: GameParticipant) -> GameParticipant:
    """
    Lazy fallback for a participant who let their personal deadline pass
    without answering (AFK, slow REST polling, closed tab): skips them
    forward — possibly through several unanswered questions at once if
    they've been away a while — using the same server clock as
    record_answer, never trusting the client. Idempotent / cheap to call
    on every read. Lock order is always ROOM then PARTICIPANT (see
    record_answer's docstring) — never the reverse.
    """
    if room.status != GameRoomStatus.RUNNING or participant.finished_at is not None:
        return participant

    questions = get_room_questions(room)
    deadline = participant_deadline(participant, room, questions)
    while deadline and timezone.now() >= deadline:
        with transaction.atomic():
            locked_room = GameRoom.objects.select_for_update().get(pk=room.pk)
            if locked_room.status != GameRoomStatus.RUNNING:
                return participant
            locked = GameParticipant.objects.select_for_update().get(pk=participant.pk)
            if locked.finished_at is not None or locked.current_question_index != participant.current_question_index:
                # Someone else already advanced this participant (e.g. a
                # concurrent request) — resync and stop.
                participant = locked
                break
            _advance_participant(locked, locked_room, questions)
            participant = locked
        deadline = participant_deadline(participant, room, questions)
    return participant
