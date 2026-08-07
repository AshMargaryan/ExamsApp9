from rest_framework import serializers

from apps.practice.serializers import WeeklyProgressPointSerializer
from apps.profiles.serializers import UserAchievementSerializer

from .models import LearningGoal, Notification, ParentChildRequest
from .services import compute_goal_progress


class MiniUserSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    username = serializers.CharField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    avatar = serializers.SerializerMethodField()

    def get_avatar(self, obj):
        profile = getattr(obj, "profile", None)
        if not profile or not profile.avatar:
            return None
        url = profile.avatar.url
        request = self.context.get("request")
        return request.build_absolute_uri(url) if request else url


class ParentChildRequestSerializer(serializers.ModelSerializer):
    parent = MiniUserSerializer(read_only=True)
    child = MiniUserSerializer(read_only=True)

    class Meta:
        model = ParentChildRequest
        fields = ["id", "parent", "child", "status", "created_at"]


class ChildSummarySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    username = serializers.CharField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    avatar = serializers.CharField(allow_null=True)
    age = serializers.IntegerField(allow_null=True)
    grade = serializers.IntegerField(allow_null=True)
    school = serializers.CharField(allow_null=True)
    level = serializers.IntegerField()
    total_xp = serializers.IntegerField()
    current_streak = serializers.IntegerField()
    longest_streak = serializers.IntegerField()
    last_active_date = serializers.DateField(allow_null=True)


class ParentInviteSerializer(serializers.Serializer):
    token = serializers.CharField()
    invite_url = serializers.CharField()


class InvitePreviewSerializer(serializers.Serializer):
    parent_name = serializers.CharField()
    parent_username = serializers.CharField()
    already_linked = serializers.BooleanField()


class SubjectPerformanceSerializer(serializers.Serializer):
    subject_id = serializers.IntegerField()
    subject_name = serializers.CharField()
    completion_percent = serializers.FloatField()
    avg_score = serializers.FloatField(allow_null=True)
    tiers_completed = serializers.IntegerField()


class SkillEntrySerializer(serializers.Serializer):
    subtopic_id = serializers.IntegerField()
    name = serializers.CharField()
    subject_name = serializers.CharField()
    avg_score = serializers.FloatField()


class SkillsMasterySerializer(serializers.Serializer):
    mastered = SkillEntrySerializer(many=True)
    practicing = SkillEntrySerializer(many=True)
    needs_improvement = SkillEntrySerializer(many=True)


class ActivityCalendarPointSerializer(serializers.Serializer):
    date = serializers.DateField()
    count = serializers.IntegerField()


class ChildDashboardSerializer(serializers.Serializer):
    overview = ChildSummarySerializer()
    subject_performance = SubjectPerformanceSerializer(many=True)
    skills_mastery = SkillsMasterySerializer()
    weekly_progress = WeeklyProgressPointSerializer(many=True)
    activity_calendar = ActivityCalendarPointSerializer(many=True)
    recent_achievements = UserAchievementSerializer(many=True)
    predicted_exam_score = serializers.FloatField(allow_null=True)
    best_study_hour = serializers.IntegerField(allow_null=True)


class LearningGoalSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source="subject.name", read_only=True, default=None)
    progress = serializers.SerializerMethodField()

    class Meta:
        model = LearningGoal
        fields = [
            "id", "child", "goal_type", "target_value", "subject", "subject_name",
            "progress", "created_at",
        ]
        read_only_fields = ["id", "child", "created_at"]

    def get_progress(self, obj):
        return compute_goal_progress(obj)

    def validate(self, attrs):
        goal_type = attrs.get("goal_type", getattr(self.instance, "goal_type", None))
        subject = attrs.get("subject", getattr(self.instance, "subject", None))
        if goal_type == "subject_accuracy" and subject is None:
            raise serializers.ValidationError({"subject": "Այս նպատակի համար պարտադիր է ընտրել առարկա։"})
        return attrs


class NotificationSerializer(serializers.ModelSerializer):
    child_name = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = ["id", "child", "child_name", "notification_type", "message", "is_read", "created_at"]

    def get_child_name(self, obj):
        return obj.child.first_name or obj.child.username


class WeeklyReportSerializer(serializers.Serializer):
    report_text = serializers.CharField()
