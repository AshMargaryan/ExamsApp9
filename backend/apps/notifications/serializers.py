from rest_framework import serializers

from .models import StudentNotification


class StudentNotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentNotification
        fields = ["id", "notification_type", "message", "context", "link", "is_read", "created_at"]
