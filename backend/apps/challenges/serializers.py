from rest_framework import serializers

from apps.friends.serializers import MiniUserSerializer

from .models import ChallengeInvite


class ChallengeInviteSerializer(serializers.ModelSerializer):
    sender = MiniUserSerializer(read_only=True)
    receiver = MiniUserSerializer(read_only=True)
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    topic_name = serializers.SerializerMethodField()
    room_code = serializers.SerializerMethodField()

    class Meta:
        model = ChallengeInvite
        fields = [
            "id", "sender", "receiver", "subject", "subject_name", "topic", "topic_name",
            "status", "room_code", "created_at", "responded_at", "expires_at",
        ]

    def get_topic_name(self, obj):
        return obj.topic.name if obj.topic else None

    def get_room_code(self, obj):
        return obj.room.room_code if obj.room else None
