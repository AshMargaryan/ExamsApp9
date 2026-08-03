from rest_framework import serializers

from apps.friends.serializers import MiniUserSerializer

from .models import TeacherStudentConnection


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
