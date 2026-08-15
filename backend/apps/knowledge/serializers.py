from rest_framework import serializers

from .models import SubjectMastery, TopicMastery


class SubjectMasterySerializer(serializers.ModelSerializer):
    subject_label = serializers.CharField(source="get_subject_key_display", read_only=True)

    class Meta:
        model = SubjectMastery
        fields = [
            "subject_key", "subject_label", "mastery_score", "attempts_count",
            "correct_count", "data_sufficiency", "last_activity_at", "updated_at",
        ]


class TopicMasterySerializer(serializers.ModelSerializer):
    subtopic_name = serializers.CharField(source="subtopic.name", read_only=True)
    topic_name = serializers.CharField(source="subtopic.topic.name", read_only=True)

    class Meta:
        model = TopicMastery
        fields = [
            "subtopic", "subtopic_name", "topic_name", "mastery_score", "attempts_count",
            "correct_count", "data_sufficiency", "last_activity_at",
            "interval_days", "next_review_at", "updated_at",
        ]
