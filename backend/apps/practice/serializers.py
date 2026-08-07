from rest_framework import serializers

from .models import (
    Subject, Domain, Topic, Subtopic,
    Question, Choice, Statement,
    PracticeAttempt, AttemptAnswer, DailyProblemAttempt,
    Tier,
)

TIERS = [t.value for t in Tier]


# ---------------------------------------------------------------------------
# Hierarchy (with per-user progress rollups)
# ---------------------------------------------------------------------------

class SubtopicHierarchySerializer(serializers.ModelSerializer):
    tier_scores = serializers.SerializerMethodField()
    has_learning_material = serializers.SerializerMethodField()

    class Meta:
        model = Subtopic
        fields = ["id", "name", "order", "tier_scores", "has_learning_material"]

    def get_tier_scores(self, obj):
        progress = self.context.get("progress_by_subtopic", {})
        scores = progress.get(obj.id, {})
        return {tier: scores.get(tier) for tier in TIERS}

    def get_has_learning_material(self, obj):
        return bool(obj.learning_material)


def _non_empty_subtopics(subtopics, context):
    with_questions = context.get("subtopic_ids_with_questions", set())
    return [s for s in subtopics if s.id in with_questions]


class TopicHierarchySerializer(serializers.ModelSerializer):
    subtopics = serializers.SerializerMethodField()
    progress = serializers.SerializerMethodField()

    class Meta:
        model = Topic
        fields = ["id", "name", "order", "intro_text", "subtopics", "progress"]

    def get_subtopics(self, obj):
        non_empty = _non_empty_subtopics(obj.subtopics.all(), self.context)
        return SubtopicHierarchySerializer(non_empty, many=True, context=self.context).data

    def get_progress(self, obj):
        progress = self.context.get("progress_by_subtopic", {})
        subtopic_ids = [s.id for s in _non_empty_subtopics(obj.subtopics.all(), self.context)]
        return _rollup(subtopic_ids, progress)


class DomainHierarchySerializer(serializers.ModelSerializer):
    topics = serializers.SerializerMethodField()
    progress = serializers.SerializerMethodField()

    class Meta:
        model = Domain
        fields = ["id", "name", "order", "intro_text", "topics", "progress"]

    def get_topics(self, obj):
        non_empty_topics = [
            t for t in obj.topics.all() if _non_empty_subtopics(t.subtopics.all(), self.context)
        ]
        return TopicHierarchySerializer(non_empty_topics, many=True, context=self.context).data

    def get_progress(self, obj):
        progress = self.context.get("progress_by_subtopic", {})
        subtopic_ids = [
            s.id for t in obj.topics.all()
            for s in _non_empty_subtopics(t.subtopics.all(), self.context)
        ]
        return _rollup(subtopic_ids, progress)


class SubjectHierarchySerializer(serializers.ModelSerializer):
    domains = serializers.SerializerMethodField()
    progress = serializers.SerializerMethodField()

    class Meta:
        model = Subject
        fields = ["id", "name", "order", "domains", "progress"]

    def get_domains(self, obj):
        non_empty_domains = [
            d for d in obj.domains.all()
            if any(_non_empty_subtopics(t.subtopics.all(), self.context) for t in d.topics.all())
        ]
        return DomainHierarchySerializer(non_empty_domains, many=True, context=self.context).data

    def get_progress(self, obj):
        progress = self.context.get("progress_by_subtopic", {})
        subtopic_ids = [
            s.id for d in obj.domains.all() for t in d.topics.all()
            for s in _non_empty_subtopics(t.subtopics.all(), self.context)
        ]
        return _rollup(subtopic_ids, progress)


def _rollup(subtopic_ids, progress_by_subtopic):
    """{percent, avg_score}: percent = tiers done / total tiers possible;
    avg_score = mean score across those done tiers (None if none done)."""
    total_tiers = len(subtopic_ids) * len(TIERS)
    scores = []
    for sid in subtopic_ids:
        scores.extend(progress_by_subtopic.get(sid, {}).values())

    percent = round(100 * len(scores) / total_tiers, 1) if total_tiers else 0.0
    avg_score = round(sum(scores) / len(scores), 1) if scores else None
    return {"percent": percent, "avg_score": avg_score}


class SubtopicMaterialSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subtopic
        fields = ["id", "name", "learning_material"]


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
        fields = ["id", "label", "text", "order", "hint"]


class StatementRevealSerializer(serializers.ModelSerializer):
    class Meta:
        model = Statement
        fields = ["id", "label", "text", "order", "is_true", "hint"]


class QuestionPracticeSerializer(serializers.ModelSerializer):
    """Sent when serving questions to answer — never includes correct answers."""
    choices = ChoiceSerializer(many=True, read_only=True)
    statements = StatementSerializer(many=True, read_only=True)
    subject_name = serializers.CharField(source="subtopic.topic.domain.subject.name", read_only=True)

    class Meta:
        model = Question
        fields = [
            "id", "question_type", "tier", "text", "passage", "hint", "video_url",
            "choices", "statements", "subject_name",
        ]


class QuestionRevealSerializer(serializers.ModelSerializer):
    """Sent when the user clicks 'show answers' — correct answers + explanation."""
    choices = ChoiceRevealSerializer(many=True, read_only=True)
    statements = StatementRevealSerializer(many=True, read_only=True)
    subject_name = serializers.CharField(source="subtopic.topic.domain.subject.name", read_only=True)

    class Meta:
        model = Question
        fields = [
            "id", "question_type", "tier", "text", "passage", "explanation", "video_url",
            "choices", "statements", "correct_answer_text", "subject_name",
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


# ---------------------------------------------------------------------------
# Home dashboard: recommended exercises, weekly progress, daily problem
# ---------------------------------------------------------------------------

class RecommendedSubtopicSerializer(serializers.Serializer):
    subtopic_id = serializers.IntegerField()
    subtopic_name = serializers.CharField()
    topic_name = serializers.CharField()
    domain_name = serializers.CharField()
    subject_name = serializers.CharField()
    mistake_count = serializers.IntegerField(allow_null=True)
    suggested_tier = serializers.ChoiceField(choices=TIERS)


class WeeklyProgressPointSerializer(serializers.Serializer):
    week_start = serializers.DateField()
    solved = serializers.IntegerField()
    correct = serializers.IntegerField()


class DailyProblemSerializer(serializers.Serializer):
    """Sent when the daily problem hasn't been answered yet — no correct answers included."""
    date = serializers.DateField()
    question = QuestionPracticeSerializer()
    already_answered = serializers.BooleanField()
    result = serializers.SerializerMethodField()

    def get_result(self, obj):
        attempt = obj.get("attempt")
        if not attempt:
            return None
        return {
            "is_correct": attempt.is_correct,
            "selected_choice_id": attempt.selected_choice_id,
            "answer_text": attempt.answer_text,
            "selected_statement_ids": attempt.selected_statement_ids,
            "question": QuestionRevealSerializer(obj["question"]).data,
        }


class DailyProblemSubmitSerializer(serializers.Serializer):
    selected_choice_id = serializers.IntegerField(required=False, allow_null=True)
    answer_text = serializers.CharField(required=False, allow_blank=True)
    selected_statement_ids = serializers.ListField(
        child=serializers.IntegerField(), required=False, default=list
    )


class DailyProblemAttemptSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyProblemAttempt
        fields = ["id", "date", "question", "is_correct", "answered_at"]
