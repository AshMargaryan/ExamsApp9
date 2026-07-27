from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.utils import timezone

from . import realtime
from .gameplay import get_room_state, has_answered, record_answer
from .models import GameParticipant, GameRoom, GameRoomStatus
from .realtime import group_name, signal_advance
from .services import maybe_advance_room


class GameConsumer(AsyncJsonWebsocketConsumer):
    """
    One connection per player per room. The server is authoritative for
    everything gameplay-related — this consumer only ever relays state the
    database already agrees on; it never trusts a client-reported timer or
    "I'm done" claim without re-validating server-side (see gameplay.py).

    Reconnection: nothing client-side needs to be preserved. Score and
    "have I answered this question" are both derived fresh from the
    database on connect, so a reconnecting client is instantly back in
    the correct state.
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

        self.group_name = group_name(self.room_code)
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        await self._mark_seen()
        realtime.ensure_loop_running(self.room_code)
        await self._send_personal_state()

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

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

        if result["all_answered"]:
            signal_advance(self.room_code)
        await self._maybe_advance()

    # -- group event handlers (invoked via channel_layer.group_send) --------

    async def game_update(self, event):
        realtime.ensure_loop_running(self.room_code)
        payload = event["payload"]
        if payload.get("type") == "finished":
            # The room-wide broadcast has no per-player score/rank — swap in
            # this connection's own personalized view instead of relaying it.
            payload = await self._build_personal_state()
        await self.send_json(payload)

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
    def _maybe_advance(self):
        room = GameRoom.objects.select_related("settings").get(room_code=self.room_code)
        maybe_advance_room(room)

    @database_sync_to_async
    def _build_personal_state(self):
        room = GameRoom.objects.select_related("settings").prefetch_related("participants").get(
            room_code=self.room_code
        )
        participant = GameParticipant.objects.get(id=self.participant_id)

        if room.status == GameRoomStatus.WAITING:
            return {"type": "waiting"}

        maybe_advance_room(room)
        room.refresh_from_db()

        if room.status == GameRoomStatus.FINISHED:
            participant.refresh_from_db(fields=["rank"])
            return {
                "type": "finished",
                "score": participant.score,
                "rank": participant.rank,
                "total_questions": room.game_questions.count(),
            }

        state = get_room_state(room)
        if state["finished"]:
            return {"type": "finished", "score": participant.score, "rank": None,
                    "total_questions": state["total_questions"]}

        game_question = state["game_question"]
        from apps.practice.serializers import QuestionPracticeSerializer

        return {
            "type": "question",
            "question": QuestionPracticeSerializer(game_question.question).data,
            "question_number": state["question_number"],
            "total_questions": state["total_questions"],
            "seconds_remaining": state["seconds_remaining"],
            "deadline": state["deadline"].isoformat() if state["deadline"] else None,
            "score": participant.score,
            "answered": has_answered(participant, game_question),
        }

    async def _send_personal_state(self):
        payload = await self._build_personal_state()
        await self.send_json(payload)
