from rest_framework import serializers

from .models import (
    MockExam, MockExamQuestion, MockExamChoice, MockExamStatement,
    MockExamAttempt, MockExamAnswer,
)


# ---------------------------------------------------------------------------
# Exam listing
# ---------------------------------------------------------------------------

class MockExamListSerializer(serializers.ModelSerializer):
    """Base exam fields; per-user annotations (has_draft, etc.) are attached
    by the view as plain dict keys after this serializer runs — see
    views.ListMockExamsView."""
    class Meta:
        model = MockExam
        fields = ["id", "exam_id", "title", "question_count", "subject"]


# ---------------------------------------------------------------------------
# Questions — safe (answering) vs. reveal (results)
# ---------------------------------------------------------------------------

class MockExamChoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = MockExamChoice
        fields = ["id", "text", "order"]


class MockExamChoiceRevealSerializer(serializers.ModelSerializer):
    class Meta:
        model = MockExamChoice
        fields = ["id", "text", "order", "is_correct"]


class MockExamStatementSerializer(serializers.ModelSerializer):
    class Meta:
        model = MockExamStatement
        fields = ["id", "label", "text", "order"]


class MockExamStatementRevealSerializer(serializers.ModelSerializer):
    class Meta:
        model = MockExamStatement
        fields = ["id", "label", "text", "order", "is_true", "match_target"]


class MockExamQuestionSafeSerializer(serializers.ModelSerializer):
    """Sent while answering — never includes correct answers. `hint` is
    blanked out by the view when the attempt has hints_enabled=False."""
    choices = MockExamChoiceSerializer(many=True, read_only=True)
    statements = MockExamStatementSerializer(many=True, read_only=True)

    class Meta:
        model = MockExamQuestion
        fields = [
            "id", "number", "topic", "group", "question_type", "text",
            "difficulty", "hint", "figure_svg", "choices", "statements",
        ]


class MockExamQuestionRevealSerializer(serializers.ModelSerializer):
    choices = MockExamChoiceRevealSerializer(many=True, read_only=True)
    statements = MockExamStatementRevealSerializer(many=True, read_only=True)

    class Meta:
        model = MockExamQuestion
        fields = [
            "id", "number", "topic", "group", "question_type", "text",
            "difficulty", "hint", "figure_svg", "solution_steps", "correct_answer_text",
            "choices", "statements",
        ]


# ---------------------------------------------------------------------------
# Submitting answers
# ---------------------------------------------------------------------------

class AnswerInputSerializer(serializers.Serializer):
    question_id = serializers.IntegerField()
    selected_choice_id = serializers.IntegerField(required=False, allow_null=True)
    answer_text = serializers.CharField(required=False, allow_blank=True)
    selected_statement_ids = serializers.ListField(
        child=serializers.IntegerField(), required=False, default=list
    )
    # matching: {statement_id (str): choice_id (int)}
    match_pairs = serializers.DictField(
        child=serializers.IntegerField(), required=False, default=dict
    )


class StartAttemptSerializer(serializers.Serializer):
    duration_minutes = serializers.IntegerField(required=False, allow_null=True, default=None)
    hints_enabled = serializers.BooleanField(default=True)


class DraftSaveSerializer(serializers.Serializer):
    answers = AnswerInputSerializer(many=True)
    time_remaining_seconds = serializers.IntegerField(required=False, allow_null=True, default=None)


class FinishAttemptSerializer(serializers.Serializer):
    answers = AnswerInputSerializer(many=True)


# ---------------------------------------------------------------------------
# Attempts
# ---------------------------------------------------------------------------

class MockExamAttemptSerializer(serializers.ModelSerializer):
    exam = MockExamListSerializer(read_only=True)

    class Meta:
        model = MockExamAttempt
        fields = [
            "id", "exam", "status", "duration_minutes", "hints_enabled",
            "started_at", "time_remaining_seconds", "completed_at",
            "raw_score", "scaled_score", "percent_answered",
            "easy_correct", "easy_total",
            "medium_correct", "medium_total",
            "hard_correct", "hard_total",
        ]


class MockExamAnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = MockExamAnswer
        fields = [
            "question", "is_correct", "selected_choice", "answer_text",
            "selected_statement_ids", "match_pairs",
        ]
