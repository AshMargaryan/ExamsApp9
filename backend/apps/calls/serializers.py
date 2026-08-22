from rest_framework import serializers

from apps.friends.serializers import MiniUserSerializer
from apps.study_groups.models import StudyGroup

from .models import CALL_MAX_CAPACITY, CALL_MIN_CAPACITY, CallRoom


class CallParticipantSerializer(serializers.Serializer):
    user = MiniUserSerializer(read_only=True)
    joined_at = serializers.DateTimeField()


class CallRoomSerializer(serializers.ModelSerializer):
    """`participant_count` is expected to come from an annotated queryset
    (see views._room_queryset) rather than a per-row query — same
    convention as apps.study_groups.serializers.GroupListSerializer."""

    creator = MiniUserSerializer(read_only=True)
    participants = serializers.SerializerMethodField()
    participant_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = CallRoom
        fields = [
            "id", "study_group", "creator", "capacity", "status",
            "participants", "participant_count", "created_at",
        ]

    def get_participants(self, obj):
        memberships = obj.participants.select_related("user__profile").order_by("joined_at")
        return CallParticipantSerializer(memberships, many=True, context=self.context).data


class CallRoomCreateSerializer(serializers.Serializer):
    study_group = serializers.PrimaryKeyRelatedField(queryset=StudyGroup.objects.all())
    capacity = serializers.IntegerField(min_value=CALL_MIN_CAPACITY, max_value=CALL_MAX_CAPACITY)
