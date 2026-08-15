from rest_framework import serializers

from .models import CheckInFeeling, DailyStudyPlan, StudyTask
from .services import completion_status


class TaskCheckInSerializer(serializers.Serializer):
    feeling = serializers.ChoiceField(choices=CheckInFeeling.choices)


class StudyTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudyTask
        fields = [
            "id", "order", "task_type", "subject_name", "topic_label",
            "title", "blurb", "link_path", "estimated_minutes",
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        status = completion_status(instance)
        data["done"] = status["done"]
        data["progress"] = status["progress"]
        try:
            data["check_in_feeling"] = instance.check_in.feeling
        except StudyTask.check_in.RelatedObjectDoesNotExist:
            data["check_in_feeling"] = None
        return data


class DailyStudyPlanSerializer(serializers.ModelSerializer):
    tasks = StudyTaskSerializer(many=True, read_only=True)

    class Meta:
        model = DailyStudyPlan
        fields = ["id", "date", "headline", "coach_message", "tasks"]
