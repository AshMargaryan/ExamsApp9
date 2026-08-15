from rest_framework import serializers

from .models import MistakeEntry


class MistakeEntrySerializer(serializers.ModelSerializer):
    retryable = serializers.SerializerMethodField()
    error_category_display = serializers.CharField(source="get_error_category_display", read_only=True)

    class Meta:
        model = MistakeEntry
        fields = [
            "id", "source", "mistake_type", "subject_name", "topic_label", "question_type",
            "question_text", "render_data", "your_answer_text", "correct_answer_text",
            "explanation", "hint", "created_at",
            "retry_count", "last_retried_at", "last_retry_correct", "retryable",
            "error_category", "error_category_display", "error_explanation", "classified_at",
        ]

    def get_retryable(self, obj):
        return obj.source == "flashcard" or obj.content_object is not None


class MistakeRetryInputSerializer(serializers.Serializer):
    """Union of every source's answer shape — a given request only fills in
    the fields relevant to that mistake's question_type."""
    selected_choice_id = serializers.IntegerField(required=False, allow_null=True)
    answer_text = serializers.CharField(required=False, allow_blank=True)
    selected_statement_ids = serializers.ListField(
        child=serializers.IntegerField(), required=False, default=list
    )
    match_pairs = serializers.DictField(
        child=serializers.IntegerField(), required=False, default=dict
    )
    # flashcard only — self-reported "did I know it this time?"
    knew_it = serializers.BooleanField(required=False, default=False)
