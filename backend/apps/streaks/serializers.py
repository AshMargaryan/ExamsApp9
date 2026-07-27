from rest_framework import serializers

from .models import LearningStreak


class LearningStreakSerializer(serializers.ModelSerializer):
    class Meta:
        model = LearningStreak
        fields = ["current_streak", "longest_streak", "last_activity_date"]
