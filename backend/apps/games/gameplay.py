"""
Server-authoritative round engine for multiplayer competition rooms.

Every player is on the same question at the same time — there is no
per-participant pacing. The server (GameRoom.current_question_index /
current_question_started_at) is the single source of truth for which
question is current and how much time is left; clients only ever display
what the server tells them (see realtime.py for the WebSocket loop that
broadcasts it). This is what makes client-side timer tampering pointless:
a modified client can *display* whatever it wants, but record_answer()
independently re-checks the deadline against the server clock before
accepting any answer, and only the server ever decides to advance the
round.

Reuses apps.practice's own scoring so multiplayer and solo practice can
never silently disagree on what counts as correct.
"""
from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from apps.practice.scoring import score_answer

from .models import GameAnswer, GameParticipant, GameQuestion, GameRoom, GameRoomStatus
from .scoring import ScoringConfig, compute_score


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


def question_deadline(room: GameRoom):
    settings = getattr(room, "settings", None)
    if room.current_question_started_at is None or settings is None:
        return None
    return room.current_question_started_at + timedelta(seconds=settings.time_limit_per_question)


def get_room_state(room: GameRoom, questions: list[GameQuestion] | None = None) -> dict:
    """Room-wide authoritative snapshot: current question + deadline, or finished."""
    questions = get_room_questions(room) if questions is None else questions
    total = len(questions)

    if room.status == GameRoomStatus.FINISHED or room.current_question_index >= total:
        return {"finished": True, "total_questions": total}

    game_question = questions[room.current_question_index]
    deadline = question_deadline(room)
    remaining = (deadline - timezone.now()).total_seconds() if deadline else 0

    return {
        "finished": False,
        "game_question": game_question,
        "question_number": room.current_question_index + 1,
        "total_questions": total,
        "seconds_remaining": max(0, round(remaining)),
        "deadline": deadline,
    }


def has_answered(participant: GameParticipant, game_question: GameQuestion) -> bool:
    return GameAnswer.objects.filter(participant=participant, game_question=game_question).exists()


def all_participants_answered(room: GameRoom, game_question: GameQuestion) -> bool:
    """True once every current participant has answered this question — the
    early-advance condition ("wait until everyone finishes or time runs out")."""
    participant_ids = set(room.participants.values_list("id", flat=True))
    if not participant_ids:
        return False
    answered_ids = set(
        GameAnswer.objects.filter(
            game_question=game_question, participant_id__in=participant_ids
        ).values_list("participant_id", flat=True)
    )
    return participant_ids <= answered_ids


def answer_progress(room: GameRoom, game_question: GameQuestion) -> tuple[int, int]:
    """(answered_count, total_participants) — purely informational, shown as
    e.g. "3/5 answered" while waiting on slower players."""
    total = room.participants.count()
    answered = GameAnswer.objects.filter(
        game_question=game_question, participant__game=room
    ).count()
    return answered, total


@transaction.atomic
def record_answer(room: GameRoom, participant: GameParticipant, question_id: int, answer_data: dict) -> dict:
    """
    Scores and stores one participant's answer to the room's CURRENT
    question. Never advances the round itself — the realtime loop (or the
    HTTP fallback's maybe_advance_room) decides when everyone moves on.
    """
    if room.status != GameRoomStatus.RUNNING:
        raise ValueError("Խաղն ընթացքի մեջ չէ։")

    questions = get_room_questions(room)
    total = len(questions)
    if room.current_question_index >= total:
        raise ValueError("Հարցերն ավարտվել են։")

    game_question = questions[room.current_question_index]
    if game_question.question_id != question_id:
        raise ValueError("Այս հարցն այլևս ընթացիկը չէ։")

    deadline = question_deadline(room)
    if deadline and timezone.now() > deadline:
        raise ValueError("Ժամանակը սպառված է այս հարցի համար։")

    if has_answered(participant, game_question):
        raise ValueError("Այս հարցին արդեն պատասխանել եք։")

    time_taken = None
    if room.current_question_started_at:
        time_taken = (timezone.now() - room.current_question_started_at).total_seconds()

    result = score_answer(game_question.question, answer_data)
    GameAnswer.objects.create(
        participant=participant, game_question=game_question, time_taken_seconds=time_taken, **result
    )

    if result["is_correct"]:
        points = compute_score(
            tier=game_question.question.tier,
            is_correct=True,
            time_taken_seconds=time_taken,
            time_limit_seconds=room.settings.time_limit_per_question,
            config=_scoring_config(room),
        )
        participant.score += points
        participant.save(update_fields=["score"])

    return {
        "is_correct": result["is_correct"],
        "all_answered": all_participants_answered(room, game_question),
    }
