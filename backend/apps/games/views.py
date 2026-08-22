from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.practice.models import Subject
from apps.practice.serializers import QuestionPracticeSerializer
from apps.profiles.models import Achievement
from apps.profiles.serializers import AchievementSerializer

from .gameplay import get_participant_state, has_answered, record_answer, time_limit_for_question
from .models import (
    GameParticipant,
    GameRoom,
    GameRoomStatus,
    GameRoomType,
    GameStats,
    MatchmakingQueue,
    MatchmakingTicket,
    MatchmakingTicketStatus,
)
from .serializers import (
    GameRoomCreateSerializer,
    GameRoomSerializer,
    GameStatsSerializer,
    MatchmakingQueueSerializer,
    MatchmakingTicketSerializer,
)
from .services import (
    cancel_ticket,
    finish_room,
    find_game,
    join_room,
    kick_participant,
    leave_room,
    maybe_auto_start,
    refresh_ticket,
    start_room,
    sync_participant_progress,
)


def _room_queryset():
    return (
        GameRoom.objects.select_related("creator", "settings__subject", "settings__topic")
        .prefetch_related("participants__user")
    )


# Rooms tables are never purged — cap a single response instead of
# serializing every open/joined room ever created. Plain slicing (not
# pagination_class) keeps the response a flat array, matching every
# existing caller's expectations.
MAX_ROOMS_RETURNED = 100


class GameRoomListCreateView(generics.ListCreateAPIView):
    """GET /api/games/rooms/ — open public rooms. POST — create a room (creator auto-joins)."""

    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_serializer_class(self):
        return GameRoomCreateSerializer if self.request.method == "POST" else GameRoomSerializer

    def get_queryset(self):
        return _room_queryset().filter(
            type=GameRoomType.PUBLIC, status=GameRoomStatus.WAITING,
        )[:MAX_ROOMS_RETURNED]

    def create(self, request, *args, **kwargs):
        serializer = GameRoomCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        room = serializer.save(creator=request.user)
        GameParticipant.objects.create(game=room, user=request.user)
        return Response(GameRoomSerializer(room).data, status=status.HTTP_201_CREATED)


class MyGameRoomsView(generics.ListAPIView):
    """GET /api/games/rooms/mine/ — rooms the user created or joined that aren't finished."""

    serializer_class = GameRoomSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        me = self.request.user
        return (
            _room_queryset()
            .filter(Q(creator=me) | Q(participants__user=me))
            .exclude(status=GameRoomStatus.FINISHED)
            .distinct()
        )[:MAX_ROOMS_RETURNED]


class GameRoomDetailView(generics.RetrieveAPIView):
    """GET /api/games/rooms/<room_code>/"""

    serializer_class = GameRoomSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = "room_code"
    lookup_url_kwarg = "room_code"
    queryset = _room_queryset()

    def get_object(self):
        room = super().get_object()
        maybe_auto_start(room)
        return room


class JoinGameRoomView(APIView):
    """POST /api/games/rooms/<room_code>/join/"""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, room_code):
        room = get_object_or_404(GameRoom, room_code=room_code)
        try:
            join_room(room, request.user)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        maybe_auto_start(room)
        return Response(GameRoomSerializer(room).data)


class LeaveGameRoomView(APIView):
    """POST /api/games/rooms/<room_code>/leave/"""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, room_code):
        room = get_object_or_404(GameRoom, room_code=room_code)
        try:
            leave_room(room, request.user)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(status=status.HTTP_204_NO_CONTENT)


class KickParticipantView(APIView):
    """DELETE /api/games/rooms/<room_code>/participants/<user_id>/ — creator only."""

    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, room_code, user_id):
        room = get_object_or_404(GameRoom, room_code=room_code)
        try:
            kick_participant(room, request.user, user_id)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(status=status.HTTP_204_NO_CONTENT)


class StartGameRoomView(APIView):
    """POST /api/games/rooms/<room_code>/start/ — creator only."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, room_code):
        room = get_object_or_404(GameRoom, room_code=room_code)
        try:
            start_room(room, request.user)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(GameRoomSerializer(room).data)


class FinishGameRoomView(APIView):
    """POST /api/games/rooms/<room_code>/finish/ — creator only; settles ranks + stats."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, room_code):
        room = get_object_or_404(GameRoom, room_code=room_code)
        try:
            finish_room(room, request.user)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(GameRoomSerializer(room).data)


class CancelGameRoomView(APIView):
    """DELETE /api/games/rooms/<room_code>/cancel/ — creator only, while still waiting."""

    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, room_code):
        room = get_object_or_404(GameRoom, room_code=room_code, creator=request.user)
        if room.status != GameRoomStatus.WAITING:
            return Response(
                {"detail": "Հնարավոր է չեղարկել միայն սպասման մեջ գտնվող սենյակը։"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        room.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class GameResultsView(APIView):
    """
    GET /api/games/rooms/<room_code>/results/ — final leaderboard + this
    player's personal rewards (XP, newly unlocked achievements), once the
    room has finished. Rewards were computed and stored once, at settle
    time (services._settle_room) — this just reads them back, so the
    numbers stay correct no matter how late the results page is opened.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, room_code):
        room = get_object_or_404(_room_queryset(), room_code=room_code)
        participant = get_object_or_404(
            GameParticipant.objects.select_related("user"), game=room, user=request.user
        )

        if room.status != GameRoomStatus.FINISHED:
            return Response({"detail": "Խաղը դեռ ավարտված չէ։"}, status=status.HTTP_400_BAD_REQUEST)

        total_questions = room.game_questions.count()
        participants = room.participants.select_related("user").order_by("rank")

        leaderboard = []
        for p in participants:
            answered = p.correct_answers + p.incorrect_answers
            leaderboard.append({
                "rank": p.rank,
                "user": {
                    "id": p.user_id,
                    "username": p.user.username,
                    "first_name": p.user.first_name,
                    "last_name": p.user.last_name,
                },
                "score": p.score,
                "correct_answers": p.correct_answers,
                "incorrect_answers": p.incorrect_answers,
                "unanswered_questions": p.unanswered_questions,
                "total_questions": total_questions,
                "accuracy_percentage": round(100 * p.correct_answers / answered, 1) if answered else 0,
                "average_time_seconds": p.average_response_time_seconds,
                "time_taken_to_finish_seconds": p.time_taken_to_finish_seconds,
                "trophies_earned": p.trophies_earned,
                "speed_bonus_xp": p.speed_bonus_xp,
            })

        achievements = Achievement.objects.filter(key__in=participant.newly_unlocked_achievement_keys)

        return Response({
            "leaderboard": leaderboard,
            "my_rank": participant.rank,
            "xp_earned": participant.xp_earned,
            "speed_bonus_xp": participant.speed_bonus_xp,
            "trophies_earned": participant.trophies_earned,
            "is_competitive": room.type == GameRoomType.PUBLIC,
            "newly_unlocked_achievements": AchievementSerializer(achievements, many=True).data,
        })


class CurrentQuestionView(APIView):
    """
    GET /api/games/rooms/<room_code>/play/current/ — THIS participant's
    current question (HTTP fallback/resync; the WebSocket connection at
    ws/games/<room_code>/ is the primary, lower-latency channel — see
    consumers.py). Independent per-player pacing (see gameplay.py): two
    different participants asking this at the same moment can get two
    different questions — nobody is gated on anyone else.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, room_code):
        room = get_object_or_404(_room_queryset(), room_code=room_code)
        participant = get_object_or_404(GameParticipant, game=room, user=request.user)

        if room.status == GameRoomStatus.WAITING:
            return Response({"detail": "Խաղը դեռ չի սկսվել։"}, status=status.HTTP_400_BAD_REQUEST)

        if room.status == GameRoomStatus.RUNNING:
            participant = sync_participant_progress(room, participant)
            room.refresh_from_db()

        if room.status == GameRoomStatus.FINISHED or participant.finished_at is not None:
            return Response({
                "finished": True,
                "room_status": room.status,
                "score": participant.score,
                "rank": participant.rank,
                "total_questions": room.game_questions.count(),
            })

        state = get_participant_state(participant, room)
        game_question = state["game_question"]
        return Response({
            "finished": False,
            "room_status": room.status,
            "question": QuestionPracticeSerializer(game_question.question).data,
            "question_number": state["question_number"],
            "total_questions": state["total_questions"],
            "seconds_remaining": state["seconds_remaining"],
            "time_limit_seconds": time_limit_for_question(room, game_question),
            "score": participant.score,
            "answered": has_answered(participant, game_question),
        })


class SubmitAnswerView(APIView):
    """
    POST /api/games/rooms/<room_code>/play/answer/ {question_id, ...answer}
    HTTP fallback for the WebSocket "answer" message — same server-side
    validation either way (see gameplay.record_answer). Answering
    immediately advances THIS participant to their next question (or
    finishes them) — nobody waits on anyone else.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, room_code):
        room = get_object_or_404(_room_queryset(), room_code=room_code)
        participant = get_object_or_404(GameParticipant, game=room, user=request.user)

        try:
            result = record_answer(room, participant, request.data.get("question_id"), request.data)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"is_correct": result["is_correct"]})


class MyGameStatsView(generics.RetrieveAPIView):
    """GET /api/games/stats/me/"""

    serializer_class = GameStatsSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        stats, _ = GameStats.objects.get_or_create(user=self.request.user)
        return stats


class MatchmakingQueueListView(generics.ListAPIView):
    """GET /api/games/matchmaking/queues/ — active public matchmaking pools."""

    serializer_class = MatchmakingQueueSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None
    queryset = MatchmakingQueue.objects.filter(is_active=True)


class FindGameView(APIView):
    """
    POST /api/games/matchmaking/find/ {queue_id, subject_id} — 'Find Game'
    button. subject_id is required: public games must draw questions from
    one specific subject just like private rooms do (see
    question_engine.build_default_settings) — matchmaking never mixes
    questions from unrelated subjects.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        queue = get_object_or_404(MatchmakingQueue, pk=request.data.get("queue_id"), is_active=True)
        subject = get_object_or_404(Subject, pk=request.data.get("subject_id"))
        try:
            ticket = find_game(request.user, queue, subject)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(MatchmakingTicketSerializer(ticket).data, status=status.HTTP_201_CREATED)


class MatchmakingStatusView(APIView):
    """GET /api/games/matchmaking/status/ — the user's active queue ticket(s)."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        tickets = list(
            MatchmakingTicket.objects.filter(
                user=request.user, status=MatchmakingTicketStatus.WAITING
            ).select_related("queue", "room")
        )
        for ticket in tickets:
            refresh_ticket(ticket)
        return Response(MatchmakingTicketSerializer(tickets, many=True).data)


class CancelMatchmakingView(APIView):
    """POST /api/games/matchmaking/cancel/ {queue_id} — leave the queue."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        queue = get_object_or_404(MatchmakingQueue, pk=request.data.get("queue_id"))
        try:
            cancel_ticket(request.user, queue)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(status=status.HTTP_204_NO_CONTENT)
