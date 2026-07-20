from rest_framework import serializers

from .models import (
    Subject, Domain, Topic, Subtopic,
    Question, Choice, Statement,
    PracticeAttempt, AttemptAnswer,
    Tier,
)

TIERS = [t.value for t in Tier]


# ---------------------------------------------------------------------------
# Hierarchy (with per-user progress rollups)
# ---------------------------------------------------------------------------

class SubtopicHierarchySerializer(serializers.ModelSerializer):
    completed_tiers = serializers.SerializerMethodField()

    class Meta:
        model = Subtopic
        fields = ["id", "name", "order", "completed_tiers"]

    def get_completed_tiers(self, obj):
        completed = self.context.get("completed_by_subtopic", {})
        return sorted(completed.get(obj.id, []))


class TopicHierarchySerializer(serializers.ModelSerializer):
    subtopics = SubtopicHierarchySerializer(many=True, read_only=True)
    progress_percent = serializers.SerializerMethodField()

    class Meta:
        model = Topic
        fields = ["id", "name", "order", "intro_text", "subtopics", "progress_percent"]

    def get_progress_percent(self, obj):
        completed = self.context.get("completed_by_subtopic", {})
        subtopic_ids = [s.id for s in obj.subtopics.all()]
        return _rollup_percent(subtopic_ids, completed)


class DomainHierarchySerializer(serializers.ModelSerializer):
    topics = TopicHierarchySerializer(many=True, read_only=True)
    progress_percent = serializers.SerializerMethodField()

    class Meta:
        model = Domain
        fields = ["id", "name", "order", "intro_text", "topics", "progress_percent"]

    def get_progress_percent(self, obj):
        completed = self.context.get("completed_by_subtopic", {})
        subtopic_ids = [s.id for t in obj.topics.all() for s in t.subtopics.all()]
        return _rollup_percent(subtopic_ids, completed)


class SubjectHierarchySerializer(serializers.ModelSerializer):
    domains = DomainHierarchySerializer(many=True, read_only=True)
    progress_percent = serializers.SerializerMethodField()

    class Meta:
        model = Subject
        fields = ["id", "name", "order", "domains", "progress_percent"]

    def get_progress_percent(self, obj):
        completed = self.context.get("completed_by_subtopic", {})
        subtopic_ids = [
            s.id for d in obj.domains.all() for t in d.topics.all() for s in t.subtopics.all()
        ]
        return _rollup_percent(subtopic_ids, completed)


def _rollup_percent(subtopic_ids, completed_by_subtopic):
    if not subtopic_ids:
        return 0.0
    total_tiers = len(subtopic_ids) * len(TIERS)
    done_tiers = sum(len(completed_by_subtopic.get(sid, [])) for sid in subtopic_ids)
    return round(100 * done_tiers / total_tiers, 1)


# ---------------------------------------------------------------------------
# Questions — safe (practice) vs. revealed (with answers/explanations)
# ---------------------------------------------------------------------------

class ChoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Choice
        fields = ["id", "text", "order"]


class ChoiceRevealSerializer(serializers.ModelSerializer):
    class Meta:
        model = Choice
        fields = ["id", "text", "order", "is_correct"]


class StatementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Statement
        fields = ["id", "label", "text", "order"]


class StatementRevealSerializer(serializers.ModelSerializer):
    class Meta:
        model = Statement
        fields = ["id", "label", "text", "order", "is_true"]


class QuestionPracticeSerializer(serializers.ModelSerializer):
    """Sent when serving questions to answer — never includes correct answers."""
    choices = ChoiceSerializer(many=True, read_only=True)
    statements = StatementSerializer(many=True, read_only=True)

    class Meta:
        model = Question
        fields = [
            "id", "question_type", "tier", "text", "hint", "video_url",
            "choices", "statements",
        ]


class QuestionRevealSerializer(serializers.ModelSerializer):
    """Sent when the user clicks 'show answers' — correct answers + explanation."""
    choices = ChoiceRevealSerializer(many=True, read_only=True)
    statements = StatementRevealSerializer(many=True, read_only=True)

    class Meta:
        model = Question
        fields = [
            "id", "question_type", "tier", "text", "explanation", "video_url",
            "choices", "statements", "correct_answer_text",
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


class SubmitTierSerializer(serializers.Serializer):
    answers = AnswerInputSerializer(many=True)
    revealed = serializers.BooleanField(default=False)


class AttemptAnswerResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttemptAnswer
        fields = ["question", "is_correct", "selected_choice", "answer_text", "selected_statement_ids"]


class PracticeAttemptSerializer(serializers.ModelSerializer):
    class Meta:
        model = PracticeAttempt
        fields = ["id", "subtopic", "tier", "score", "revealed_answers", "completed_at"]