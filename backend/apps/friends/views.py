from django.contrib.auth import get_user_model
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import FriendRequest, FriendRequestStatus, Friendship
from .serializers import FriendRequestSerializer, MiniUserSerializer, UserSearchSerializer
from .services import are_friends, create_friendship, remove_friendship

User = get_user_model()


class UserSearchView(generics.ListAPIView):
    """GET /api/friends/search/?q=... — search users by username."""

    serializer_class = UserSearchSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        q = self.request.query_params.get("q", "").strip()
        if not q:
            return User.objects.none()
        return (
            User.objects.exclude(id=self.request.user.id)
            .filter(username__icontains=q)
            .select_related("profile")
            .order_by("username")[:20]
        )


class SendFriendRequestView(APIView):
    """POST /api/friends/requests/send/ {receiver_id} — send a friend request."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        receiver = get_object_or_404(User, pk=request.data.get("receiver_id"))

        if receiver.id == request.user.id:
            return Response(
                {"detail": "Հնարավոր չէ ինքդ քեզ ընկեր հրավիրել։"}, status=status.HTTP_400_BAD_REQUEST
            )
        if are_friends(request.user, receiver):
            return Response({"detail": "Դուք արդեն ընկերներ եք։"}, status=status.HTTP_400_BAD_REQUEST)

        existing = FriendRequest.objects.filter(
            Q(sender=request.user, receiver=receiver) | Q(sender=receiver, receiver=request.user),
            status=FriendRequestStatus.PENDING,
        ).first()
        if existing:
            return Response({"detail": "Հարցումն արդեն առկա է։"}, status=status.HTTP_400_BAD_REQUEST)

        fr = FriendRequest.objects.create(sender=request.user, receiver=receiver)
        return Response(
            FriendRequestSerializer(fr, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class FriendRequestListView(generics.ListAPIView):
    """GET /api/friends/requests/?direction=incoming|outgoing — pending requests."""

    serializer_class = FriendRequestSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        direction = self.request.query_params.get("direction", "incoming")
        base = FriendRequest.objects.filter(status=FriendRequestStatus.PENDING).select_related(
            "sender__profile", "receiver__profile"
        )
        if direction == "outgoing":
            return base.filter(sender=self.request.user)
        return base.filter(receiver=self.request.user)


class RespondFriendRequestView(APIView):
    """POST /api/friends/requests/<pk>/respond/ {action: accept|reject} — receiver only."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        fr = get_object_or_404(
            FriendRequest, pk=pk, receiver=request.user, status=FriendRequestStatus.PENDING
        )
        action = request.data.get("action")
        if action == "accept":
            fr.status = FriendRequestStatus.ACCEPTED
            fr.save(update_fields=["status"])
            create_friendship(fr.sender, fr.receiver)
        elif action == "reject":
            fr.status = FriendRequestStatus.REJECTED
            fr.save(update_fields=["status"])
        else:
            return Response({"detail": "Սխալ գործողություն։"}, status=status.HTTP_400_BAD_REQUEST)
        return Response(FriendRequestSerializer(fr, context={"request": request}).data)


class CancelFriendRequestView(APIView):
    """DELETE /api/friends/requests/<pk>/ — sender withdraws their own pending request."""

    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, pk):
        fr = get_object_or_404(
            FriendRequest, pk=pk, sender=request.user, status=FriendRequestStatus.PENDING
        )
        fr.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class FriendListView(generics.ListAPIView):
    """GET /api/friends/ — the authenticated user's friends."""

    serializer_class = MiniUserSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        me = self.request.user
        friendships = Friendship.objects.filter(Q(user1=me) | Q(user2=me))
        friend_ids = [f.user2_id if f.user1_id == me.id else f.user1_id for f in friendships]
        return User.objects.filter(id__in=friend_ids).select_related("profile").order_by("username")


class RemoveFriendView(APIView):
    """DELETE /api/friends/<user_id>/ — unfriend."""

    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, user_id):
        other = get_object_or_404(User, pk=user_id)
        if not remove_friendship(request.user, other):
            return Response({"detail": "Ընկերություն չի գտնվել։"}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)
