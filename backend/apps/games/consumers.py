import asyncio

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.utils import timezone

from .gameplay import get_room_questions, has_answered, participant_deadline, record_answer
from .models import GameParticipant, GameRoom, GameRoomStatus
from .services import sync_participant_progress


class GameConsumer(AsyncJsonWebsocketConsumer):
    """
    One connection per player per room. The server is authoritative for
    everything gameplay-related — this consumer only ever relays state the
    database already agrees on; it never trusts a client-reported timer or
    "I'm done" claim without re-validating server-side (see gameplay.py).

    Independent per-player pacing (see gameplay.py docstring): this
    connection only ever cares about ITS OWN participant's progress, never
    the room's — there's no shared "everyone's on question 3" broadcast
    anymore. A personal asyncio watchdog task fires at this participant's
    own deadline to auto-advance them if they never answer in time; nothing
    is shared with other connections.

    Reconnection: nothing client-side needs to be preserved. Score and
    "which question am I on" are both derived fresh from the database on
    connect, so a reconnecting client is instantly back in the correct
    state.
    """

    async def connect(self):
        self.room_code = self.scope["url_route"]["kwargs"]["room_code"]
        user = self.scope.get("user")

        if user is None or not user.is_authenticated:
            await self.close(code=4001)
            return

        self.participant_id = await self._get_participant_id(user)
        if self.participant_id is None:
            await self.close(code=4003)
            return

        self.watchdog_task: asyncio.Task | None = None
        await self.accept()

        await self._mark_seen()
        await self._send_personal_state()

    async def disconnect(self, close_code):
        if getattr(self, "watchdog_task", None):
            self.watchdog_task.cancel()

    async def receive_json(self, content, **kwargs):
        action = content.get("action")
        if action == "answer":
            await self._handle_answer(content)
        elif action == "sync":
            await self._send_personal_state()

    async def _handle_answer(self, content):
        try:
            result = await self._record_answer(content)
        except ValueError as e:
            await self.send_json({"type": "error", "detail": str(e)})
            return

        await self.send_json({
            "type": "answer_result",
            "is_correct": result["is_correct"],
            "score": await self._current_score(),
        })
        await self._send_personal_state()

    # -- personal deadline watchdog --------------------------------------

    def _schedule_watchdog(self, delay_seconds: float, question_index: int):
        if self.watchdog_task:
            self.watchdog_task.cancel()
        self.watchdog_task = asyncio.create_task(self._watchdog(delay_seconds, question_index))

    async def _watchdog(self, delay_seconds: float, question_index: int):
        try:
            await asyncio.sleep(max(0.0, delay_seconds))
        except asyncio.CancelledError:
            return
        moved = await self._advance_if_still_on(question_index)
        if moved:
            await self._send_personal_state()

    # -- DB helpers -----------------------------------------------------

    @database_sync_to_async
    def _get_participant_id(self, user):
        return (
            GameParticipant.objects.filter(game__room_code=self.room_code, user=user)
            .values_list("id", flat=True)
            .first()
        )

    @database_sync_to_async
    def _mark_seen(self):
        GameParticipant.objects.filter(id=self.participant_id).update(last_seen_at=timezone.now())

    @database_sync_to_async
    def _current_score(self):
        return GameParticipant.objects.get(id=self.participant_id).score

    @database_sync_to_async
    def _record_answer(self, content):
        room = GameRoom.objects.select_related("settings").get(room_code=self.room_code)
        participant = GameParticipant.objects.get(id=self.participant_id)
        return record_answer(room, participant, content.get("question_id"), content)

    @database_sync_to_async
    def _advance_if_still_on(self, expected_index: int) -> bool:
        room = GameRoom.objects.select_related("settings").get(room_code=self.room_code)
        participant = GameParticipant.objects.get(id=self.participant_id)
        if participant.current_question_index != expected_index or participant.finished_at is not None:
            return False
        sync_participant_progress(room, participant)
        return True

    @database_sync_to_async
    def _build_personal_state(self):
        room = GameRoom.objects.select_related("settings").get(room_code=self.room_code)
        participant = GameParticipant.objects.get(id=self.participant_id)

        if room.status == GameRoomStatus.WAITING:
            return {"type": "waiting"}, None

        participant = sync_participant_progress(room, participant)
        room.refresh_from_db()
        participant.refresh_from_db()

        if participant.finished_at is not None or room.status == GameRoomStatus.FINISHED:
            return {
                "type": "finished",
                "score": participant.score,
                "rank": participant.rank,
                "total_questions": room.game_questions.count(),
            }, None

        questions = get_room_questions(room)
        game_question = questions[participant.current_question_index]
        deadline = participant_deadline(participant, room, questions)
        remaining = max(0, round((deadline - timezone.now()).total_seconds())) if deadline else 0

        from apps.practice.serializers import QuestionPracticeSerializer

        payload = {
            "type": "question",
            "question": QuestionPracticeSerializer(game_question.question).data,
            "question_number": participant.current_question_index + 1,
            "total_questions": len(questions),
            "seconds_remaining": remaining,
            "deadline": deadline.isoformat() if deadline else None,
            "score": participant.score,
            "answered": has_answered(participant, game_question),
        }
        watchdog = (max(0.0, remaining), participant.current_question_index)
        return payload, watchdog

    async def _send_personal_state(self):
        payload, watchdog = await self._build_personal_state()
        await self.send_json(payload)
        if watchdog:
            self._schedule_watchdog(*watchdog)
