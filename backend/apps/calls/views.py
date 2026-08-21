from django.db.models import Count, Exists, OuterRef
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.study_groups.models import StudyGroupMembership

from .models import CallRoom
from .serializers import CallRoomCreateSerializer, CallRoomSerializer
from .services import (
    AlreadyRegisteredError,
    CallFullError,
    CreatorCannotLeaveError,
    NotAParticipantError,
    NotCreatorError,
    NotGroupMemberError,
    RoomNotCancellableError,
    RoomNotOpenError,
    cancel_call,
    create_call_room,
    is_group_member,
    leave_call,
    register_for_call,
)


def _room_queryset():
    return (
        CallRoom.objects.select_related("creator__profile", "study_group")
        .annotate(participant_count=Count("participants"))
    )


def _member_room_queryset(user):
    """Rooms whose study group `user` actually belongs to.

    Reading a call has to be gated on the same thing creating and joining one
    already are (services.is_group_member) — otherwise the room's participant
    list, i.e. exactly who is on a call right now, is readable by any logged-in
    account that can guess a room id. Study groups themselves are a public,
    searchable directory, so group membership is the only boundary here.

    Uses an EXISTS subquery rather than filtering across the membership
    relation: _room_queryset() already annotates Count("participants"), and
    joining a second multi-row relation would multiply the rows that count
    aggregates over, silently inflating it.
    """
    return _room_queryset().filter(
        Exists(StudyGroupMembership.objects.filter(group=OuterRef("study_group_id"), user=user))
    )


class CallCreateView(APIView):
    """POST /api/calls/ {study_group, capacity} — start a call request for a
    study group; the creator becomes its first registered participant."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = CallRoomCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            room = create_call_room(creator=request.user, **serializer.validated_data)
        except NotGroupMemberError:
            return Response(
                {"detail": "Միայն խմբի անդամները կարող են սկսել զանգ։"}, status=status.HTTP_403_FORBIDDEN
            )
        room = _room_queryset().get(pk=room.pk)
        return Response(
            CallRoomSerializer(room, context={"request": request}).data, status=status.HTTP_201_CREATED
        )


class CallListView(generics.ListAPIView):
    """GET /api/calls/?study_group=<id> — call rooms for a study group,
    newest first (see CallRoom.Meta.ordering)."""

    serializer_class = CallRoomSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        study_group_id = self.request.query_params.get("study_group")
        if not study_group_id:
            return CallRoom.objects.none()
        # Scoped to groups the caller belongs to: without this, passing any
        # study_group id listed the calls of a group the caller has nothing to
        # do with.
        return _member_room_queryset(self.request.user).filter(study_group_id=study_group_id)


class CallDetailView(APIView):
    """GET /api/calls/<id>/ — room detail + participants.
    DELETE /api/calls/<id>/ — creator-only, only before the call goes active."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        room = get_object_or_404(_member_room_queryset(request.user), pk=pk)
        return Response(CallRoomSerializer(room, context={"request": request}).data)

    def delete(self, request, pk):
        room = get_object_or_404(CallRoom, pk=pk)
        try:
            cancel_call(room, request.user)
        except NotCreatorError:
            return Response(
                {"detail": "Միայն զանգը սկսողը կարող է չեղարկել այն։"}, status=status.HTTP_403_FORBIDDEN
            )
        except RoomNotCancellableError:
            return Response(
                {"detail": "Ընթացիկ կամ ավարտված զանգը հնարավոր չէ չեղարկել։"}, status=status.HTTP_400_BAD_REQUEST
            )
        return Response(status=status.HTTP_204_NO_CONTENT)


class JoinCallView(APIView):
    """POST /api/calls/<id>/join/ — register for the call."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        room = get_object_or_404(CallRoom, pk=pk)
        try:
            register_for_call(room, request.user)
        except RoomNotOpenError:
            return Response(
                {"detail": "Զանգը այլևս հասանելի չէ գրանցվելու համար։"}, status=status.HTTP_400_BAD_REQUEST
            )
        except NotGroupMemberError:
            return Response(
                {"detail": "Միայն խմբի անդամները կարող են գրանցվել զանգին։"}, status=status.HTTP_403_FORBIDDEN
            )
        except AlreadyRegisteredError:
            return Response({"detail": "Արդեն գրանցված ես այս զանգին։"}, status=status.HTTP_400_BAD_REQUEST)
        except CallFullError:
            return Response({"detail": "Զանգը արդեն լրացված է։"}, status=status.HTTP_400_BAD_REQUEST)
        room = _room_queryset().get(pk=room.pk)
        return Response(CallRoomSerializer(room, context={"request": request}).data)


class LeaveCallView(APIView):
    """POST /api/calls/<id>/leave/ — withdraw registration. The creator
    cannot leave (must cancel the call instead)."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        room = get_object_or_404(CallRoom, pk=pk)
        try:
            leave_call(room, request.user)
        except CreatorCannotLeaveError:
            return Response(
                {"detail": "Զանգը սկսողը չի կարող լքել այն։ Փոխարենը՝ չեղարկիր զանգը։"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except NotAParticipantError:
            return Response({"detail": "Գրանցված չես այս զանգին։"}, status=status.HTTP_400_BAD_REQUEST)
        return Response(status=status.HTTP_204_NO_CONTENT)
