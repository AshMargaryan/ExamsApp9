from django.contrib.auth import get_user_model
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.notifications.models import NotificationType
from apps.notifications.realtime import push_notification_refresh
from apps.notifications.services import create_notification
from apps.parents.serializers import ChildDashboardSerializer
from apps.parents.services import build_child_dashboard

from .models import Block, FriendRequest, FriendRequestStatus, Friendship
from .serializers import BlockSerializer, FriendRequestSerializer, MiniUserSerializer, UserSearchSerializer
from .services import are_friends, create_friendship, is_blocked, remove_friendship

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
        blocked_ids = set(Block.objects.filter(blocker=self.request.user).values_list("blocked_id", flat=True))
        blocked_ids |= set(Block.objects.filter(blocked=self.request.user).values_list("blocker_id", flat=True))
        return (
            User.objects.exclude(id=self.request.user.id)
            .exclude(id__in=blocked_ids)
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
        push_notification_refresh(receiver.id)
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
            receiver_name = fr.receiver.first_name or fr.receiver.username
            create_notification(
                fr.sender, NotificationType.FRIEND_ADDED,
                f"Դուք և {receiver_name} այժմ ընկերներ եք", link="/profile",
            )
        elif action == "reject":
            fr.status = FriendRequestStatus.REJECTED
            fr.save(update_fields=["status"])
        else:
            return Response({"detail": "Սխալ գործողություն։"}, status=status.HTTP_400_BAD_REQUEST)
        push_notification_refresh(request.user.id)
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


class BlockedUsersListView(generics.ListAPIView):
    """GET /api/friends/blocked/ — users the caller has blocked (not the reverse — that's private to the blocker)."""

    serializer_class = BlockSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return Block.objects.filter(blocker=self.request.user).select_related("blocked__profile")


class BlockUserView(APIView):
    """
    POST /api/friends/block/ {user_id} — block someone: removes any
    friendship, cancels pending friend requests either way, and (per
    is_blocked) stops either side from starting a new chat with the other.
    DELETE /api/friends/block/<user_id>/ — unblock.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        target = get_object_or_404(User, pk=request.data.get("user_id"))
        if target.id == request.user.id:
            return Response({"detail": "Հնարավոր չէ արգելափակել ինքդ քեզ։"}, status=status.HTTP_400_BAD_REQUEST)

        Block.objects.get_or_create(blocker=request.user, blocked=target)
        remove_friendship(request.user, target)
        FriendRequest.objects.filter(
            Q(sender=request.user, receiver=target) | Q(sender=target, receiver=request.user),
            status=FriendRequestStatus.PENDING,
        ).update(status=FriendRequestStatus.REJECTED)
        return Response(status=status.HTTP_204_NO_CONTENT)

    def delete(self, request, user_id):
        deleted, _ = Block.objects.filter(blocker=request.user, blocked_id=user_id).delete()
        if not deleted:
            return Response({"detail": "Արգելափակում չի գտնվել։"}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)


class FriendDashboardView(APIView):
    """GET /api/friends/<user_id>/dashboard/ — a friend's full progress
    dashboard (same shape as a parent's view of their child, see
    apps.parents.services.build_child_dashboard — those builders only need
    a User, not a ParentChildLink, so they're reused here as-is). 403s for
    anyone who isn't the user themself or a confirmed friend."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, user_id):
        target = get_object_or_404(User, pk=user_id)
        if target.id != request.user.id and not are_friends(request.user, target):
            return Response(status=status.HTTP_403_FORBIDDEN)
        return Response(ChildDashboardSerializer(build_child_dashboard(target)).data)
