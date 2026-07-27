from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework import serializers

from .models import FriendRequest, FriendRequestStatus
from .services import are_friends

User = get_user_model()


class MiniUserSerializer(serializers.ModelSerializer):
    avatar = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name", "avatar"]

    def get_avatar(self, obj):
        profile = getattr(obj, "profile", None)
        if not profile or not profile.avatar:
            return None
        url = profile.avatar.url
        request = self.context.get("request")
        return request.build_absolute_uri(url) if request else url


class UserSearchSerializer(MiniUserSerializer):
    relationship_status = serializers.SerializerMethodField()

    class Meta(MiniUserSerializer.Meta):
        fields = MiniUserSerializer.Meta.fields + ["relationship_status"]

    def get_relationship_status(self, obj) -> str:
        me = self.context["request"].user
        if obj.id == me.id:
            return "self"
        if are_friends(me, obj):
            return "friends"
        pending = FriendRequest.objects.filter(
            Q(sender=me, receiver=obj) | Q(sender=obj, receiver=me),
            status=FriendRequestStatus.PENDING,
        ).first()
        if pending is None:
            return "none"
        return "request_sent" if pending.sender_id == me.id else "request_received"


class FriendRequestSerializer(serializers.ModelSerializer):
    sender = MiniUserSerializer(read_only=True)
    receiver = MiniUserSerializer(read_only=True)

    class Meta:
        model = FriendRequest
        fields = ["id", "sender", "receiver", "status", "created_at"]
