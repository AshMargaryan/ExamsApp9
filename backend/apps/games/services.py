from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from apps.profiles.engine import evaluate_achievements
from apps.profiles.xp import award_xp

from .models import (
    GameParticipant,
    GameRoom,
    GameRoomStatus,
    GameRoomType,
    GameStartCondition,
    GameStats,
    MatchmakingQueue,
    MatchmakingStartMode,
    MatchmakingTicket,
    MatchmakingTicketStatus,
)
from .gameplay import get_room_questions, maybe_advance_participant_if_expired, time_limit_for_question
from .question_engine import build_default_settings, populate_game_questions
from .trophies import award_speed_bonuses, award_trophies

# How long the creator's manual "Start" click counts down before the room
# actually goes RUNNING — see start_room / GameRoomStatus.STARTING. Every
# client just watches the same room.scheduled_start_at, so they all flip to
# RUNNING together without any one client having to drive it.
COUNTDOWN_SECONDS = 5


@transaction.atomic
def join_room(room: GameRoom, user) -> GameParticipant:
    """
    Row-locked so two simultaneous joins landing at max_players-1 can never
    both succeed and push the room over capacity (e.g. two requests hitting
    a 49/50 public room at once) — the second one re-checks the count under
    the lock and correctly sees 50/50.
    """
    room = GameRoom.objects.select_for_update().get(pk=room.pk)
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


def _start_participants(room: GameRoom) -> None:
    """Puts every participant on question #1 of their own personal
    progression, all starting at the same instant the room goes RUNNING —
    from here on each advances independently (see gameplay.py)."""
    now = timezone.now()
    GameParticipant.objects.filter(game=room).update(
        current_question_index=0, current_question_started_at=now, finished_at=None
    )


def _force_start(room: GameRoom) -> GameRoom:
    """
    The only place a room transitions WAITING -> RUNNING. Requires
    GameSettings (subject/question config) to exist first — this is what
    used to be missing for matchmaking-spawned rooms, which then ran with
    zero questions and immediately looked "finished" the moment a client
    asked for the current question. GameSettings is now created up front,
    at room-creation/spawn time (see GameRoomCreateSerializer.create and
    _spawn_matchmaking_room), so this should never actually fire in normal
    operation — it's a hard stop against ever repeating that bug.

    Row-locked so two concurrent start triggers (e.g. two players' joins
    both crossing min_players_to_start at once, or a manual start racing an
    auto-start) can never both populate questions / both flip the room to
    RUNNING — see callers, all of which must use the returned room (the
    locked, freshly-read instance), not their original one.
    """
    with transaction.atomic():
        room = GameRoom.objects.select_for_update().get(pk=room.pk)
        if room.status not in (GameRoomStatus.WAITING, GameRoomStatus.STARTING):
            # Already started (or finished) by a concurrent call — no-op.
            return room
        if getattr(room, "settings", None) is None:
            raise ValueError("Խաղասենյակը դեռ չունի հարցերի կարգավորումներ։")

        populate_game_questions(room)  # raises ValueError (not enough questions) before touching status
        room.status = GameRoomStatus.RUNNING
        room.start_time = timezone.now()
        room.participant_count_at_start = room.participants.count()
        room.save(update_fields=["status", "start_time", "participant_count_at_start"])
        _start_participants(room)
    return room


def _begin_countdown(room: GameRoom) -> GameRoom:
    """
    WAITING -> STARTING: sets scheduled_start_at COUNTDOWN_SECONDS out
    rather than jumping straight to RUNNING. Used both by the creator's
    manual "Start" click (start_room) AND by matchmaking's automatic
    player_count/timer triggers (maybe_auto_start) — every room, public or
    private, gets the same brief "get ready" countdown that every
    connected client can see and count down together, instead of the game
    just appearing with no warning. maybe_auto_start promotes STARTING ->
    RUNNING once scheduled_start_at elapses.

    Row-locked for the same reason as _force_start: two concurrent
    triggers (e.g. two joins both crossing min_players_to_start at once)
    must never both begin the countdown / race each other.
    """
    with transaction.atomic():
        room = GameRoom.objects.select_for_update().get(pk=room.pk)
        if room.status != GameRoomStatus.WAITING:
            return room
        if getattr(room, "settings", None) is None:
            raise ValueError("Խաղասենյակը դեռ չունի հարցերի կարգավորումներ։")
        room.status = GameRoomStatus.STARTING
        room.scheduled_start_at = timezone.now() + timedelta(seconds=COUNTDOWN_SECONDS)
        room.save(update_fields=["status", "scheduled_start_at"])
    return room


def maybe_auto_start(room: GameRoom) -> GameRoom:
    """
    Lazily promotes a room once its start trigger has fired. There's no
    background scheduler yet, so this is checked on the read/join paths
    instead of firing on a timer:

    - STARTING: a countdown (creator's manual start, or matchmaking's own
      player_count/timer trigger below) has ended (room.scheduled_start_at
      reached) -> promote to RUNNING. Every client polling the room sees
      the same status/scheduled_start_at, so they all flip over together
      with no one client driving it.
    - WAITING: the room's own start_condition (player_count / timer, used
      by matchmaking and by rooms the host configured that way) is met ->
      begin the same countdown (_begin_countdown), not an instant start.

    Swallows _force_start's/_begin_countdown's ValueError (missing
    settings / not enough questions) rather than raising — this runs on
    ordinary read/join GET paths with no error UI, so a misconfigured room
    just stays where it is instead of 500ing every page load; the creator
    still sees the room and can act on it. A user-triggered manual start
    (services.start_room) does NOT swallow this — that one surfaces the
    error directly.
    """
    try:
        if room.status == GameRoomStatus.STARTING:
            if room.scheduled_start_at and timezone.now() >= room.scheduled_start_at:
                room = _force_start(room)
            return room

        if room.status != GameRoomStatus.WAITING:
            return room

        count = room.participants.count()
        if room.start_condition == GameStartCondition.PLAYER_COUNT:
            if room.min_players_to_start and count >= room.min_players_to_start:
                room = _begin_countdown(room)
        elif room.start_condition == GameStartCondition.TIMER:
            if room.scheduled_start_at and count >= 2 and timezone.now() >= room.scheduled_start_at:
                room = _begin_countdown(room)
    except ValueError:
        pass

    return room


@transaction.atomic
def start_room(room: GameRoom, user) -> GameRoom:
    """
    Creator-triggered start: begins a COUNTDOWN_SECONDS countdown (room
    goes WAITING -> STARTING with scheduled_start_at set) rather than
    starting immediately. maybe_auto_start (checked on every room read —
    see views.GameRoomDetailView) promotes it to RUNNING once that elapses,
    so every connected client — not just the creator's — ends up starting
    at the same moment without any client having to trigger it itself.
    """
    if user.id != room.creator_id:
        raise ValueError("Միայն սենյակի ստեղծողը կարող է սկսել խաղը։")
    room = GameRoom.objects.select_for_update().get(pk=room.pk)
    if room.status != GameRoomStatus.WAITING:
        raise ValueError("Խաղն արդեն սկսված է կամ ավարտված է։")
    if room.participants.count() < 2:
        raise ValueError("Անհրաժեշտ է առնվազն 2 մասնակից խաղը սկսելու համար։")
    return _begin_countdown(room)


def effective_total_game_time(room: GameRoom) -> int:
    """
    The wall-clock cap (seconds from room.start_time) after which any
    still-in-progress participant gets force-finished — see
    maybe_close_by_time_cap. If the host didn't set an explicit
    total_game_time, falls back to the sum of every locked-in question's own
    tier time limit: this guarantees the room can ALWAYS eventually settle
    for everyone else even if one participant goes completely AFK on
    question 1 and never opens the app again — independent pacing means
    nothing else forces their progress forward otherwise.
    """
    settings = room.settings
    if settings.total_game_time:
        return settings.total_game_time
    questions = get_room_questions(room)
    return sum(time_limit_for_question(room, gq) for gq in questions) or 1


def _finalize_participant_stats(participant: GameParticipant, room: GameRoom, total_questions: int) -> None:
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
    participant.time_taken_to_finish_seconds = (
        round((participant.finished_at - room.start_time).total_seconds(), 2)
        if participant.finished_at and room.start_time
        else None
    )


def _force_finish_all_participants(room: GameRoom) -> None:
    """Marks every still-in-progress participant as finished right now —
    used by the creator's manual "end game" button and by the
    total_game_time cap. Participants who already finished on their own are
    untouched (their real finish time is preserved)."""
    now = timezone.now()
    GameParticipant.objects.filter(game=room, finished_at__isnull=True).update(
        finished_at=now, current_question_started_at=None
    )


def _settle_room(room: GameRoom) -> GameRoom:
    """
    Assigns final ranks + lifetime stats from whatever score each
    participant ended with, marks the room finished, and credits each
    participant's profile XP + any newly-unlocked achievements + a speed
    bonus (fastest full completions) + (public rooms only) trophies —
    recorded onto the participant row itself so the results page can show
    "what you earned from THIS game" correctly no matter when it's actually
    loaded.

    MUST be called only from inside a transaction that holds a row lock on
    `room` (select_for_update) and has just confirmed room.status ==
    RUNNING — see finish_room / check_room_completion /
    maybe_close_by_time_cap, its only callers. That's what makes
    XP/achievement/trophy awarding idempotent: a duplicate settle trigger
    re-reads status as already FINISHED (or gets blocked on the lock until
    the first settle commits, then sees FINISHED) and never reaches this
    function twice for the same room.
    """
    total_questions = room.game_questions.count()
    participants = list(
        room.participants.select_related("user").prefetch_related("answers")
        .order_by("-score", "finished_at", "joined_at")
    )
    for index, participant in enumerate(participants, start=1):
        participant.rank = index
        _finalize_participant_stats(participant, room, total_questions)

        stats, _ = GameStats.objects.get_or_create(user=participant.user)
        stats.games_played += 1
        stats.points_earned += participant.score
        if index == 1:
            stats.wins += 1
        else:
            stats.losses += 1
        stats.save(update_fields=["games_played", "wins", "losses", "points_earned"])

        newly_unlocked = evaluate_achievements(participant.user)
        participant.newly_unlocked_achievement_keys = [a.key for a in newly_unlocked]

    # Speed bonus (both room types) + trophies (public rooms only, never
    # trusts any client-supplied flag — see trophies.award_trophies).
    # Mutates speed_bonus_xp / trophies_earned / room.trophies_awarded in
    # place; xp_earned + save happen below, after both have run.
    award_speed_bonuses(participants)
    award_trophies(room, participants)

    for participant in participants:
        xp_gained = participant.score + participant.speed_bonus_xp
        if xp_gained:
            award_xp(participant.user, xp_gained)
        participant.xp_earned = xp_gained
        participant.save(
            update_fields=[
                "rank", "xp_earned", "newly_unlocked_achievement_keys", "trophies_earned",
                "speed_bonus_xp", "correct_answers", "incorrect_answers", "unanswered_questions",
                "average_response_time_seconds", "time_taken_to_finish_seconds",
            ]
        )

    room.status = GameRoomStatus.FINISHED
    room.save(update_fields=["status", "trophies_awarded"])
    return room


@transaction.atomic
def finish_room(room: GameRoom, user) -> GameRoom:
    """Creator-triggered finish — the manual "end the game" control. Force-
    finishes anyone still in progress (their partial answers still count)
    before settling."""
    if user.id != room.creator_id:
        raise ValueError("Միայն սենյակի ստեղծողը կարող է ավարտել խաղը։")
    room = GameRoom.objects.select_for_update().get(pk=room.pk)
    if room.status != GameRoomStatus.RUNNING:
        raise ValueError("Խաղն ընթացքի մեջ չէ։")
    _force_finish_all_participants(room)
    return _settle_room(room)


@transaction.atomic
def check_room_completion(room: GameRoom) -> GameRoom:
    """
    Called right after any single participant finishes their last question
    (see gameplay._advance_participant) — settles the room the moment
    EVERY participant has finished_at set, without anyone having had to
    wait on anyone else mid-game. Row-locked + re-checks status == RUNNING
    so two participants finishing at nearly the same instant can never both
    trigger a settle.
    """
    room = GameRoom.objects.select_for_update().get(pk=room.pk)
    if room.status != GameRoomStatus.RUNNING:
        return room
    if room.participants.filter(finished_at__isnull=True).exists():
        return room
    return _settle_room(room)


@transaction.atomic
def maybe_close_by_time_cap(room: GameRoom) -> GameRoom:
    """
    Lazy safety net, checked on read (views/consumer): force-finishes and
    settles a room whose total_game_time (explicit or implicit — see
    effective_total_game_time) has elapsed, even if some participant never
    comes back to trigger check_room_completion themselves. Row-locked +
    re-checks status == RUNNING, same idempotency pattern as
    check_room_completion.
    """
    room = GameRoom.objects.select_for_update().get(pk=room.pk)
    if room.status != GameRoomStatus.RUNNING or not room.start_time:
        return room
    cap = effective_total_game_time(room)
    if (timezone.now() - room.start_time).total_seconds() < cap:
        return room
    _force_finish_all_participants(room)
    return _settle_room(room)


def sync_participant_progress(room: GameRoom, participant: GameParticipant) -> GameParticipant:
    """Call before reading a participant's state (REST poll or WebSocket
    connect/sync): skips them forward past any personal deadline they let
    pass, then closes out the room if its time cap has elapsed. Guarantees
    forward progress the same way the old room-wide loop used to, just
    per-participant instead of room-wide."""
    maybe_close_by_time_cap(room)
    room.refresh_from_db()
    if room.status != GameRoomStatus.RUNNING:
        return participant
    return maybe_advance_participant_if_expired(room, participant)


# ---------------------------------------------------------------------------
# Public matchmaking — spawns/fills GameRoom instances behind a simple queue,
# reusing maybe_auto_start for the actual waiting -> running transition.
# ---------------------------------------------------------------------------

def _find_open_matchmaking_room(queue: MatchmakingQueue, subject) -> GameRoom | None:
    """
    Only ever matches rooms for the SAME subject — public games must never
    silently mix questions from unrelated subjects (see
    question_engine.select_questions, which locks a room to one subject at
    populate time). Excludes rooms that are already at max_players so a
    join can never push a room over capacity.
    """
    candidates = GameRoom.objects.filter(
        matchmaking_queue=queue, status=GameRoomStatus.WAITING, settings__subject=subject
    ).order_by("created_at")
    for room in candidates:
        if room.participants.count() < room.max_players:
            return room
    return None


def _spawn_matchmaking_room(queue: MatchmakingQueue, first_user, subject) -> GameRoom:
    """
    Creates the room AND its GameSettings together (see
    question_engine.build_default_settings) — a matchmaking room used to be
    spawned with no GameSettings at all, so it could never actually get
    questions and looked instantly "finished" the moment someone started it.
    build_default_settings raises ValueError if this subject doesn't have
    enough practice questions, which propagates out of this (transaction.
    atomic-wrapped) call and rolls the room creation back — the user gets a
    clear error instead of a room stuck forever with no questions.
    """
    room = GameRoom.objects.create(
        creator=first_user,
        name=f"{queue.name} — {subject.name}",
        type=GameRoomType.PUBLIC,
        max_players=queue.max_players,
        start_condition=queue.start_mode,
        timer_seconds=queue.timer_seconds if queue.start_mode == MatchmakingStartMode.TIMER else None,
        min_players_to_start=(
            queue.min_players if queue.start_mode == MatchmakingStartMode.PLAYER_COUNT else None
        ),
        matchmaking_queue=queue,
    )
    build_default_settings(room, subject)
    return room


def _sync_ticket_with_room(ticket: MatchmakingTicket) -> MatchmakingTicket:
    """Flips the ticket to MATCHED once its room has locked in and begun
    starting — STARTING counts too (not just RUNNING) so the player gets
    navigated to the room page in time to see the same countdown everyone
    else does, rather than only arriving once it's already running."""
    if ticket.room and ticket.room.status in (GameRoomStatus.STARTING, GameRoomStatus.RUNNING):
        ticket.status = MatchmakingTicketStatus.MATCHED
        ticket.save(update_fields=["status"])
    return ticket


@transaction.atomic
def find_game(user, queue: MatchmakingQueue, subject) -> MatchmakingTicket:
    """Joins the user to an open room for this queue+subject (or spawns
    one), and returns their ticket. Safe to call repeatedly — returns the
    existing ticket if the user is already waiting in this queue."""
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

    room = _find_open_matchmaking_room(queue, subject) or _spawn_matchmaking_room(queue, user, subject)
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
