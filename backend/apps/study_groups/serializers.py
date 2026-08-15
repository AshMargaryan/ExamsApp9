from rest_framework import serializers

from apps.friends.serializers import MiniUserSerializer
from apps.mock_exams.models import MockExamSubject

from .models import (
    MAX_MEMBERS_CAP,
    STUDY_GROUP_DEFAULT_MAX_MEMBERS,
    TUTORING_DEFAULT_MAX_MEMBERS,
    GroupType,
    StudyGroup,
    Weekday,
)


class GroupMembershipSerializer(serializers.Serializer):
    user = MiniUserSerializer(read_only=True)
    role = serializers.CharField()
    joined_at = serializers.DateTimeField()


class GroupListSerializer(serializers.ModelSerializer):
    """Card view for search results. `member_count` is expected to come from
    an annotated queryset (see GroupSearchView) rather than a per-row query."""

    leader = MiniUserSerializer(read_only=True)
    member_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = StudyGroup
        fields = [
            "id", "title", "subject", "type", "leader",
            "schedule_day", "schedule_start_time", "schedule_end_time",
            "member_count", "max_members", "created_at",
        ]


class GroupDetailSerializer(serializers.ModelSerializer):
    leader = MiniUserSerializer(read_only=True)
    members = serializers.SerializerMethodField()

    class Meta:
        model = StudyGroup
        fields = [
            "id", "title", "subject", "type", "description", "leader",
            "schedule_day", "schedule_start_time", "schedule_end_time",
            "members", "max_members", "created_at",
        ]

    def get_members(self, obj):
        memberships = obj.memberships.select_related("user__profile").order_by("joined_at")
        return GroupMembershipSerializer(memberships, many=True, context=self.context).data


class GroupCreateSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=150)
    subject = serializers.ChoiceField(choices=MockExamSubject.choices)
    type = serializers.ChoiceField(choices=GroupType.choices)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    schedule_day = serializers.ChoiceField(choices=Weekday.choices)
    schedule_start_time = serializers.TimeField()
    schedule_end_time = serializers.TimeField()
    max_members = serializers.IntegerField(required=False, min_value=2, max_value=MAX_MEMBERS_CAP)

    def validate(self, data):
        if data["schedule_end_time"] <= data["schedule_start_time"]:
            raise serializers.ValidationError(
                {"schedule_end_time": "Ավարտի ժամանակը պետք է լինի սկզբի ժամանակից ուշ։"}
            )
        if "max_members" not in data:
            data["max_members"] = (
                TUTORING_DEFAULT_MAX_MEMBERS if data["type"] == GroupType.TUTORING
                else STUDY_GROUP_DEFAULT_MAX_MEMBERS
            )
        return data
