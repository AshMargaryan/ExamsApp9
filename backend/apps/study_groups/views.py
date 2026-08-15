from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import StudyGroup
from .serializers import GroupCreateSerializer, GroupDetailSerializer, GroupListSerializer
from .services import (
    AlreadyMemberError,
    GroupFullError,
    LeaderCannotLeaveError,
    NotAGroupMemberError,
    NotAMemberError,
    create_group,
    delete_group,
    join_group,
    leave_group,
    transfer_leadership,
)

User = get_user_model()


class GroupCreateView(APIView):
    """POST /api/groups/ — create a group; the creator becomes its leader."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = GroupCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        group = create_group(leader=request.user, **serializer.validated_data)
        return Response(
            GroupDetailSerializer(group, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class GroupSearchView(generics.ListAPIView):
    """GET /api/groups/search/?q=&subject=&type= — browse/search groups."""

    serializer_class = GroupListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = StudyGroup.objects.select_related("leader__profile").annotate(member_count=Count("memberships"))

        q = self.request.query_params.get("q", "").strip()
        if q:
            qs = qs.filter(Q(title__icontains=q) | Q(description__icontains=q))

        subject = self.request.query_params.get("subject")
        if subject:
            qs = qs.filter(subject=subject)

        type_ = self.request.query_params.get("type")
        if type_:
            qs = qs.filter(type=type_)

        return qs


class GroupDetailView(APIView):
    """GET /api/groups/<id>/ — group detail + members.
    DELETE /api/groups/<id>/ — leader-only, deletes the group."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        group = get_object_or_404(StudyGroup.objects.select_related("leader__profile"), pk=pk)
        return Response(GroupDetailSerializer(group, context={"request": request}).data)

    def delete(self, request, pk):
        group = get_object_or_404(StudyGroup, pk=pk)
        if group.leader_id != request.user.id:
            return Response(
                {"detail": "Միայն խմբի ղեկավարը կարող է ջնջել այն։"}, status=status.HTTP_403_FORBIDDEN
            )
        delete_group(group)
        return Response(status=status.HTTP_204_NO_CONTENT)


class JoinGroupView(APIView):
    """POST /api/groups/<id>/join/ — join as a member."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        group = get_object_or_404(StudyGroup, pk=pk)
        try:
            join_group(group, request.user)
        except AlreadyMemberError:
            return Response({"detail": "Դուք արդեն այս խմբի անդամ եք։"}, status=status.HTTP_400_BAD_REQUEST)
        except GroupFullError:
            return Response({"detail": "Խումբն արդեն լրացված է։"}, status=status.HTTP_400_BAD_REQUEST)
        group.refresh_from_db()
        return Response(GroupDetailSerializer(group, context={"request": request}).data)


class LeaveGroupView(APIView):
    """POST /api/groups/<id>/leave/ — leave a group. The leader cannot leave
    (must delete the group or transfer leadership first)."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        group = get_object_or_404(StudyGroup, pk=pk)
        try:
            leave_group(group, request.user)
        except LeaderCannotLeaveError:
            return Response(
                {"detail": "Ղեկավարը չի կարող լքել խումբը։ Ջնջեք խումբը կամ փոխանցեք ղեկավարությունը։"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except NotAMemberError:
            return Response({"detail": "Դուք այս խմբի անդամ չեք։"}, status=status.HTTP_400_BAD_REQUEST)
        return Response(status=status.HTTP_204_NO_CONTENT)


class TransferLeadershipView(APIView):
    """POST /api/groups/<id>/transfer-leadership/ {new_leader_id} — leader-only;
    target must already be a member. The old leader can then leave."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        group = get_object_or_404(StudyGroup, pk=pk)
        if group.leader_id != request.user.id:
            return Response(
                {"detail": "Միայն խմբի ղեկավարը կարող է փոխանցել ղեկավարությունը։"},
                status=status.HTTP_403_FORBIDDEN,
            )

        new_leader = get_object_or_404(User, pk=request.data.get("new_leader_id"))
        try:
            transfer_leadership(group, new_leader)
        except NotAGroupMemberError:
            return Response(
                {"detail": "Նոր ղեկավարը պետք է արդեն խմբի անդամ լինի։"}, status=status.HTTP_400_BAD_REQUEST
            )
        group.refresh_from_db()
        return Response(GroupDetailSerializer(group, context={"request": request}).data)
