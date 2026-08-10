from django.db import transaction
from django.utils import timezone

from apps.profiles.engine import evaluate_achievements
from apps.profiles.subjects import canonical_key_for_practice_subject
from apps.profiles.xp import award_xp

from .models import (
    GameParticipant,
    GameQuestion,
    GameRoom,
    GameRoomStatus,
    GameRoomType,
    GameStartCondition,
    GameStats,
    MatchmakingQueue,
    MatchmakingStartMode,
    MatchmakingTicket,
    MatchmakingTicketStatus,
    SuspiciousActivityEventType,
    SuspiciousActivityLog,
)

# Anti-farming: games are the one XP source with no natural "pay once per
# unique work unit" cap (unlike practice/daily-problem/mock-exam — see
# apps.profiles.xp module docstring). Diminishing returns per Nth game
# settled *today* preserves legitimate heavy play (never drops to 0) while
# killing the "replay games back-to-back" farming vector. Thresholds are
# defaults, not tuned against a target economy — adjust freely.
GAMES_TODAY_FULL_XP = 5
GAMES_TODAY_HALF_XP = 10
GAMES_TODAY_SUSPICIOUS = 20


def _xp_multiplier_for_nth_game_today(n: int) -> float:
    if n <= GAMES_TODAY_FULL_XP:
        return 1.0
    if n <= GAMES_TODAY_HALF_XP:
        return 0.5
    return 0.1
from .gameplay import question_deadline
from .question_engine import populate_game_questions
from .realtime import broadcast_room_state


def join_room(room: GameRoom, user) -> GameParticipant:
    if room.status != GameRoomStatus.WAITING:
        raise ValueError("Խաղասենյակն այլևս հասանելի չէ միանալու համար։")
    if room.participants.count() >= room.max_players:
        raise ValueError("Խաղասենյակը լրացված է։")
    participant, _ = GameParticipant.objects.get_or_create(game=room, user=user)
    return participant


def leave_room(room: GameRoom, user) -> None:
    if user.id == room.creator_id:
        raise ValueError("Ստեղծողը չի կարող լքել սենյակը։ Փոխարենը՝ չեղարկեք այն։")
    GameParticipant.objects.filter(game=room, user=user).delete()


def kick_participant(room: GameRoom, requester, target_user_id: int) -> None:
    if requester.id != room.creator_id:
        raise ValueError("Միայն սենյակի ստեղծողը կարող է հեռացնել մասնակիցներին։")
    if room.status != GameRoomStatus.WAITING:
        raise ValueError("Մասնակիցներին հնարավոր է հեռացնել միայն սպասման փուլում։")
    if target_user_id == room.creator_id:
        raise ValueError("Հնարավոր չէ հեռացնել սենյակի ստեղծողին։")
    deleted, _ = GameParticipant.objects.filter(game=room, user_id=target_user_id).delete()
    if not deleted:
        raise ValueError("Մասնակիցը չի գտնվել այս սենյակում։")


def _start_game_engine(room: GameRoom) -> None:
    """
    Locks in this room's question set and starts the server-authoritative
    round clock, if it has game settings configured (matchmaking-spawned
    rooms currently don't). Safe to call more than once — only ever
    populates questions / starts the clock the first time.

    The realtime WebSocket loop (realtime.py) picks up from here and drives
    advancement; this just gets round 1 on the board.
    """
    if getattr(room, "settings", None) is None:
        return
    if GameQuestion.objects.filter(room=room).exists():
        return
    populate_game_questions(room)
    room.current_question_index = 0
    room.current_question_started_at = timezone.now()
    room.save(update_fields=["current_question_index", "current_question_started_at"])
    broadcast_room_state(room)


def _force_start(room: GameRoom) -> None:
    room.status = GameRoomStatus.RUNNING
    room.start_time = timezone.now()
    room.save(update_fields=["status", "start_time"])
    _start_game_engine(room)


def maybe_auto_start(room: GameRoom) -> GameRoom:
    """
    Lazily promotes a waiting room to running once its chosen start_condition
    is met. There's no background scheduler yet, so this is checked on the
    read/join paths instead of firing on a timer.
    """
    if room.status != GameRoomStatus.WAITING:
        return room

    count = room.participants.count()

    if room.start_condition == GameStartCondition.PLAYER_COUNT:
        if room.min_players_to_start and count >= room.min_players_to_start:
            _force_start(room)
    elif room.start_condition == GameStartCondition.TIMER:
        if room.scheduled_start_at and count >= 2 and timezone.now() >= room.scheduled_start_at:
            _force_start(room)

    return room


@transaction.atomic
def start_room(room: GameRoom, user) -> GameRoom:
    if user.id != room.creator_id:
        raise ValueError("Միայն սենյակի ստեղծողը կարող է սկսել խաղը։")
    if room.status != GameRoomStatus.WAITING:
        raise ValueError("Խաղն արդեն սկսված է կամ ավարտված է։")
    if room.participants.count() < 2:
        raise ValueError("Անհրաժեշտ է առնվազն 2 մասնակից խաղը սկսելու համար։")

    _force_start(room)
    return room


def _finalize_participant_stats(participant: GameParticipant, total_questions: int) -> None:
    """Computes this game's summary stats from the participant's raw
    GameAnswer rows, once, at settle time — see GameParticipant's stat
    fields for why these are stored rather than re-derived on every read."""
    answers = list(participant.answers.all())
    correct = sum(1 for a in answers if a.is_correct)
    times = [a.time_taken_seconds for a in answers if a.time_taken_seconds is not None]

    participant.correct_answers = correct
    participant.incorrect_answers = len(answers) - correct
    participant.unanswered_questions = max(0, total_questions - len(answers))
    participant.average_response_time_seconds = (
        round(sum(times) / len(times), 2) if times else None
    )


def _settle_room(room: GameRoom) -> GameRoom:
    """
    Assigns final ranks + lifetime stats from whatever score each
    participant ended with, marks the room finished, and credits each
    participant's profile XP + any newly-unlocked achievements — recorded
    onto the participant row itself so the results page can show "what you
    earned from THIS game" correctly no matter when it's actually loaded.
    No permission check — callers decide who/what may trigger this.
    """
    today = timezone.localdate()
    total_questions = room.game_questions.count()
    participants = list(
        room.participants.select_related("user").prefetch_related("answers").order_by("-score", "joined_at")
    )
    game_settings = getattr(room, "settings", None)
    subject_key = canonical_key_for_practice_subject(game_settings.subject) if game_settings else None
    for index, participant in enumerate(participants, start=1):
        participant.rank = index
        _finalize_participant_stats(participant, total_questions)

        stats, _ = GameStats.objects.get_or_create(user=participant.user)
        stats.games_played += 1
        stats.points_earned += participant.score
        if index == 1:
            stats.wins += 1
        else:
            stats.losses += 1
        stats.save(update_fields=["games_played", "wins", "losses", "points_earned"])

        # finished_at isn't set on `room` until after this loop, so this
        # correctly counts only games settled *before* this one today.
        games_today_before = GameParticipant.objects.filter(
            user=participant.user, game__status=GameRoomStatus.FINISHED, game__finished_at__date=today,
        ).count()
        nth_game_today = games_today_before + 1
        multiplier = _xp_multiplier_for_nth_game_today(nth_game_today)
        xp_gained = round(participant.score * multiplier)
        if xp_gained:
            award_xp(participant.user, xp_gained, subject=subject_key)
        if nth_game_today > GAMES_TODAY_SUSPICIOUS:
            SuspiciousActivityLog.objects.create(
                user=participant.user, event_type=SuspiciousActivityEventType.GAME_XP_VOLUME,
                detail={"games_today": nth_game_today, "raw_score": participant.score, "awarded_xp": xp_gained},
            )
        newly_unlocked = evaluate_achievements(participant.user)

        participant.xp_earned = xp_gained
        participant.newly_unlocked_achievement_keys = [a.key for a in newly_unlocked]
        participant.save(
            update_fields=[
                "rank", "xp_earned", "newly_unlocked_achievement_keys",
                "correct_answers", "incorrect_answers", "unanswered_questions",
                "average_response_time_seconds",
            ]
        )

    # Additive-only branch: a 1v1 challenge room gets a winner bonus on top
    # of (never instead of) the per-participant award_xp calls above. Every
    # non-challenge room (type=public/private) has no `.challenge` relation
    # and is completely unaffected by this block.
    challenge = getattr(room, "challenge", None)
    if challenge is not None:
        # Local import: avoids a load-order coupling between games and
        # challenges, which both depend on each other (challenges builds
        # GameRoom/GameSettings; games needs to know about the challenge
        # relation at settle time) — same convention used elsewhere in this
        # codebase for cross-app calls.
        from apps.challenges.services import CHALLENGE_WINNER_BONUS_XP, notify_challenge_result

        winner = next((p for p in participants if p.rank == 1), None)
        if winner is not None:
            award_xp(winner.user, CHALLENGE_WINNER_BONUS_XP, subject=subject_key)
            winner.xp_earned += CHALLENGE_WINNER_BONUS_XP
            winner.save(update_fields=["xp_earned"])
        notify_challenge_result(challenge, winner.user_id if winner else None)

    room.status = GameRoomStatus.FINISHED
    room.finished_at = timezone.now()
    room.save(update_fields=["status", "finished_at"])
    return room


@transaction.atomic
def finish_room(room: GameRoom, user) -> GameRoom:
    """Creator-triggered finish — the manual "end the game" control."""
    if user.id != room.creator_id:
        raise ValueError("Միայն սենյակի ստեղծողը կարող է ավարտել խաղը։")
    if room.status != GameRoomStatus.RUNNING:
        raise ValueError("Խաղն ընթացքի մեջ չէ։")
    return _settle_room(room)


def advance_room(room: GameRoom) -> GameRoom:
    """
    Moves the room to the next question, or settles it if that was the last
    one. This is the ONLY function that changes current_question_index —
    called exclusively by the server (the realtime loop, or the lazy HTTP
    fallback below), never in response to a client claiming its own timer
    ran out.
    """
    total = room.game_questions.count()
    room.current_question_index += 1
    if room.current_question_index >= total:
        room.current_question_started_at = None
        room.save(update_fields=["current_question_index", "current_question_started_at"])
        _settle_room(room)
    else:
        room.current_question_started_at = timezone.now()
        room.save(update_fields=["current_question_index", "current_question_started_at"])
    broadcast_room_state(room)
    return room


def maybe_advance_room(room: GameRoom) -> GameRoom:
    """
    Lazy HTTP-polling fallback for when nothing is driving the realtime
    WebSocket loop for this room (e.g. a client using only REST): advances
    the room once its current question's deadline has passed, or once the
    optional total_game_time cap has elapsed. The WebSocket loop should
    normally get there first — this only guarantees forward progress
    either way, using the same server clock, never the client's.
    """
    if room.status != GameRoomStatus.RUNNING:
        return room

    game_settings = getattr(room, "settings", None)
    if game_settings and game_settings.total_game_time and room.start_time:
        if (timezone.now() - room.start_time).total_seconds() >= game_settings.total_game_time:
            _settle_room(room)
            return room

    deadline = question_deadline(room)
    while room.status == GameRoomStatus.RUNNING and deadline and timezone.now() >= deadline:
        advance_room(room)
        deadline = question_deadline(room)
    return room


# ---------------------------------------------------------------------------
# Public matchmaking — spawns/fills GameRoom instances behind a simple queue,
# reusing maybe_auto_start for the actual waiting -> running transition.
# ---------------------------------------------------------------------------

def _find_open_matchmaking_room(queue: MatchmakingQueue) -> GameRoom | None:
    candidates = GameRoom.objects.filter(
        matchmaking_queue=queue, status=GameRoomStatus.WAITING
    ).order_by("created_at")
    for room in candidates:
        if room.participants.count() < room.max_players:
            return room
    return None


def _spawn_matchmaking_room(queue: MatchmakingQueue, first_user) -> GameRoom:
    return GameRoom.objects.create(
        creator=first_user,
        name=queue.name,
        type=GameRoomType.PUBLIC,
        max_players=queue.max_players,
        start_condition=queue.start_mode,
        timer_seconds=queue.timer_seconds if queue.start_mode == MatchmakingStartMode.TIMER else None,
        min_players_to_start=(
            queue.min_players if queue.start_mode == MatchmakingStartMode.PLAYER_COUNT else None
        ),
        matchmaking_queue=queue,
    )


def _sync_ticket_with_room(ticket: MatchmakingTicket) -> MatchmakingTicket:
    if ticket.room and ticket.room.status == GameRoomStatus.RUNNING:
        ticket.status = MatchmakingTicketStatus.MATCHED
        ticket.save(update_fields=["status"])
    return ticket


@transaction.atomic
def find_game(user, queue: MatchmakingQueue) -> MatchmakingTicket:
    """Joins the user to an open room for this queue (or spawns one), and
    returns their ticket. Safe to call repeatedly — returns the existing
    ticket if the user is already waiting in this queue."""
    existing = (
        MatchmakingTicket.objects.filter(
            user=user, queue=queue, status=MatchmakingTicketStatus.WAITING
        )
        .select_related("room")
        .first()
    )
    if existing:
        if existing.room:
            maybe_auto_start(existing.room)
        return _sync_ticket_with_room(existing)

    room = _find_open_matchmaking_room(queue) or _spawn_matchmaking_room(queue, user)
    join_room(room, user)
    ticket = MatchmakingTicket.objects.create(user=user, queue=queue, room=room)

    maybe_auto_start(room)
    return _sync_ticket_with_room(ticket)


def refresh_ticket(ticket: MatchmakingTicket) -> MatchmakingTicket:
    """Called on each status poll to lazily promote the room + sync the ticket."""
    if ticket.status != MatchmakingTicketStatus.WAITING or ticket.room is None:
        return ticket
    maybe_auto_start(ticket.room)
    return _sync_ticket_with_room(ticket)


def cancel_ticket(user, queue: MatchmakingQueue) -> None:
    ticket = (
        MatchmakingTicket.objects.filter(
            user=user, queue=queue, status=MatchmakingTicketStatus.WAITING
        )
        .select_related("room")
        .first()
    )
    if ticket is None:
        raise ValueError("Ակտիվ հերթագրում չի գտնվել այս ընտրանքում։")

    ticket.status = MatchmakingTicketStatus.CANCELLED
    ticket.save(update_fields=["status"])

    room = ticket.room
    if room and room.status == GameRoomStatus.WAITING:
        GameParticipant.objects.filter(game=room, user=user).delete()
        if room.participants.count() == 0:
            room.delete()
