from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.friends.serializers import MiniUserSerializer
from apps.mock_exams.models import MockExam
from apps.practice.models import Subtopic, Topic

from .models import Assignment, AssignmentType, TeacherStudentConnection

User = get_user_model()


class StudentSearchSerializer(MiniUserSerializer):
    connection_status = serializers.SerializerMethodField()

    class Meta(MiniUserSerializer.Meta):
        fields = MiniUserSerializer.Meta.fields + ["connection_status"]

    def get_connection_status(self, obj) -> str:
        teacher = self.context["request"].user
        connection = (
            TeacherStudentConnection.objects.filter(teacher=teacher, student=obj, active=True)
            .order_by("-invited_at")
            .first()
        )
        return connection.status if connection else "none"


class TeacherStudentConnectionSerializer(serializers.ModelSerializer):
    teacher = MiniUserSerializer(read_only=True)
    student = MiniUserSerializer(read_only=True)

    class Meta:
        model = TeacherStudentConnection
        fields = ["id", "teacher", "student", "status", "invited_at", "accepted_at", "notes"]


class MockExamRefSerializer(serializers.ModelSerializer):
    class Meta:
        model = MockExam
        fields = ["id", "title"]


class TopicRefSerializer(serializers.ModelSerializer):
    class Meta:
        model = Topic
        fields = ["id", "name"]


class SubtopicRefSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subtopic
        fields = ["id", "name"]


class AssignmentSerializer(serializers.ModelSerializer):
    """Read serializer — the referenced content is nested minimally, never duplicated."""

    teacher = MiniUserSerializer(read_only=True)
    student = MiniUserSerializer(read_only=True)
    mock_exam = MockExamRefSerializer(read_only=True)
    topic = TopicRefSerializer(read_only=True)
    subtopic = SubtopicRefSerializer(read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)

    class Meta:
        model = Assignment
        fields = [
            "id", "teacher", "student", "assignment_type",
            "mock_exam", "topic", "subtopic",
            "title", "instructions", "due_date", "status", "is_overdue",
            "created_at", "updated_at",
        ]


class AssignmentCreateSerializer(serializers.ModelSerializer):
    student_id = serializers.PrimaryKeyRelatedField(
        source="student", queryset=User.objects.filter(role="student"), write_only=True
    )
    mock_exam_id = serializers.PrimaryKeyRelatedField(
        source="mock_exam", queryset=MockExam.objects.all(), write_only=True, required=False, allow_null=True
    )
    topic_id = serializers.PrimaryKeyRelatedField(
        source="topic", queryset=Topic.objects.all(), write_only=True, required=False, allow_null=True
    )
    subtopic_id = serializers.PrimaryKeyRelatedField(
        source="subtopic", queryset=Subtopic.objects.all(), write_only=True, required=False, allow_null=True
    )

    class Meta:
        model = Assignment
        fields = [
            "student_id", "assignment_type",
            "mock_exam_id", "topic_id", "subtopic_id",
            "title", "instructions", "due_date",
        ]

    def validate(self, attrs):
        target_field = {
            AssignmentType.MOCK_EXAM: "mock_exam",
            AssignmentType.TOPIC: "topic",
            AssignmentType.SUBTOPIC: "subtopic",
        }.get(attrs.get("assignment_type"))

        others = {"mock_exam", "topic", "subtopic"} - {target_field}
        if attrs.get(target_field) is None:
            raise serializers.ValidationError(
                {target_field: "Այս դաշտը պարտադիր է ընտրված տեսակի համար։"}
            )
        for other in others:
            if attrs.get(other) is not None:
                raise serializers.ValidationError(
                    {other: "Այս դաշտը պետք է դատարկ լինի ընտրված տեսակի համար։"}
                )
        return attrs
