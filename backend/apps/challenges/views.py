from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.practice.models import Subject, Topic

from .models import ChallengeInvite, ChallengeStatus
from .serializers import ChallengeInviteSerializer
from .services import accept_challenge, cancel_challenge, create_challenge, decline_challenge, expire_stale_invites

User = get_user_model()


class SendChallengeView(APIView):
    """POST /api/challenges/send/ {receiver_id, subject_id, topic_id?} — challenge a friend."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        receiver = get_object_or_404(User, pk=request.data.get("receiver_id"))
        subject = get_object_or_404(Subject, pk=request.data.get("subject_id"))
        topic_id = request.data.get("topic_id")
        topic = get_object_or_404(Topic, pk=topic_id) if topic_id else None

        try:
            invite = create_challenge(request.user, receiver, subject, topic)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(
            ChallengeInviteSerializer(invite, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class RespondChallengeView(APIView):
    """POST /api/challenges/<pk>/respond/ {action: accept|decline} — receiver only."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        expire_stale_invites()
        invite = get_object_or_404(ChallengeInvite, pk=pk, receiver=request.user)
        action = request.data.get("action")
        try:
            if action == "accept":
                invite = accept_challenge(invite)
            elif action == "decline":
                invite = decline_challenge(invite)
            else:
                return Response({"detail": "Սխալ գործողություն։"}, status=status.HTTP_400_BAD_REQUEST)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(ChallengeInviteSerializer(invite, context={"request": request}).data)


class ListChallengesView(generics.ListAPIView):
    """GET /api/challenges/?direction=incoming|outgoing — incoming defaults to pending only."""

    serializer_class = ChallengeInviteSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        expire_stale_invites()
        direction = self.request.query_params.get("direction", "incoming")
        base = ChallengeInvite.objects.select_related("sender", "receiver", "subject", "topic", "room")
        if direction == "outgoing":
            return base.filter(sender=self.request.user)
        return base.filter(receiver=self.request.user, status=ChallengeStatus.PENDING)


class CancelChallengeView(APIView):
    """DELETE /api/challenges/<pk>/ — sender withdraws their own pending invite."""

    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, pk):
        invite = get_object_or_404(ChallengeInvite, pk=pk, sender=request.user)
        try:
            cancel_challenge(invite)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(status=status.HTTP_204_NO_CONTENT)
