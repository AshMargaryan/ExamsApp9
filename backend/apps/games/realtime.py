"""
Real-time WebSocket layer for multiplayer competition rooms.

The server-authoritative game loop lives here: for each running room, one
background asyncio task waits until either every participant has answered
the current question or its deadline passes, then advances the round and
broadcasts the new state to every connected client. Clients never decide
this themselves — they only ever display what's broadcast (see
consumers.GameConsumer and the frontend WebSocket handler). Whichever
function actually mutates GameRoom.current_question_index
(services.advance_room / services._start_game_engine) is also the only
thing that broadcasts, so WebSocket and REST-polling clients can never see
divergent state.

Single-process design: the loop registry below lives in this process's
memory, matching CHANNEL_LAYERS' InMemoryChannelLayer (see settings.py). A
multi-process deployment would need a Redis channel layer *and* a way to
agree on which process owns each room's loop (e.g. a DB/cache lock) —
out of scope for this app's current single-instance deployment.
"""
import asyncio

from asgiref.sync import async_to_sync, sync_to_async
from channels.layers import get_channel_layer

_running_loops: dict[str, "asyncio.Task"] = {}
_advance_events: dict[str, asyncio.Event] = {}


def group_name(room_code: str) -> str:
    return f"game_{room_code}"


def _advance_event(room_code: str) -> asyncio.Event:
    event = _advance_events.get(room_code)
    if event is None:
        event = asyncio.Event()
        _advance_events[room_code] = event
    return event


def signal_advance(room_code: str) -> None:
    """Wakes the room's loop immediately instead of waiting out the full
    deadline — used once every participant has answered. A no-op if no loop
    is currently running for this room (e.g. no one is connected via
    WebSocket yet); the REST deadline-based fallback still applies."""
    event = _advance_events.get(room_code)
    if event is not None:
        event.set()


def _serialize_state(state: dict) -> dict:
    from apps.practice.serializers import QuestionPracticeSerializer

    if state["finished"]:
        return {"type": "finished", "total_questions": state["total_questions"]}

    game_question = state["game_question"]
    deadline = state["deadline"]
    return {
        "type": "question",
        "question": QuestionPracticeSerializer(game_question.question).data,
        "question_number": state["question_number"],
        "total_questions": state["total_questions"],
        "seconds_remaining": state["seconds_remaining"],
        "deadline": deadline.isoformat() if deadline else None,
    }


def broadcast_room_state(room) -> None:
    """
    Sync entry point — call this right after mutating a room's round state
    (see services._start_game_engine / services.advance_room / services._settle_room).
    Safe to call even with no channel layer configured or no one connected.
    """
    from .gameplay import get_room_state

    channel_layer = get_channel_layer()
    if channel_layer is None:
        return
    state = get_room_state(room)
    payload = _serialize_state(state)
    try:
        async_to_sync(channel_layer.group_send)(
            group_name(room.room_code), {"type": "game.update", "payload": payload}
        )
    except RuntimeError:
        # No usable event loop in this context (e.g. management command) — fine to skip.
        pass


def ensure_loop_running(room_code: str) -> None:
    """Starts this room's authoritative game loop if one isn't already
    running. Must be called from inside the async event loop (i.e. from a
    consumer) — that's the only place with a loop to schedule onto."""
    existing = _running_loops.get(room_code)
    if existing is not None and not existing.done():
        return
    _running_loops[room_code] = asyncio.create_task(_run_room_loop(room_code))


@sync_to_async
def _load_state(room_code: str):
    from .gameplay import get_room_state
    from .models import GameRoom, GameRoomStatus

    room = GameRoom.objects.select_related("settings").get(room_code=room_code)
    if room.status != GameRoomStatus.RUNNING:
        return None
    return get_room_state(room)


@sync_to_async
def _advance(room_code: str) -> None:
    from .models import GameRoom
    from .services import advance_room

    room = GameRoom.objects.select_related("settings").get(room_code=room_code)
    advance_room(room)  # broadcasts internally via broadcast_room_state


async def _run_room_loop(room_code: str) -> None:
    try:
        while True:
            state = await _load_state(room_code)
            if state is None or state["finished"]:
                break

            event = _advance_event(room_code)
            event.clear()
            try:
                await asyncio.wait_for(event.wait(), timeout=max(0.1, state["seconds_remaining"]))
            except asyncio.TimeoutError:
                pass

            await _advance(room_code)
    finally:
        _running_loops.pop(room_code, None)
        _advance_events.pop(room_code, None)
