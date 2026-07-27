from collections import defaultdict

from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Subject, Subtopic, Question, PracticeAttempt, AttemptAnswer
from .scoring import score_answer
from .serializers import (
    SubjectHierarchySerializer,
    QuestionPracticeSerializer, QuestionRevealSerializer,
    SubmitTierSerializer, PracticeAttemptSerializer,
)
from apps.profiles.engine import evaluate_achievements
from apps.streaks.services import record_activity


def _progress_by_subtopic(user):
    """{subtopic_id: {tier: score}} for attempts the user finished without revealing."""
    progress = defaultdict(dict)
    if not user or not user.is_authenticated:
        return progress
    qs = PracticeAttempt.objects.filter(
        user=user, revealed_answers=False, completed_at__isnull=False, score__isnull=False,
    ).values_list("subtopic_id", "tier", "score")
    for subtopic_id, tier, score in qs:
        progress[subtopic_id][tier] = score
    return progress


def _subtopic_ids_with_questions():
    """Subtopics with zero imported questions are left out of the hierarchy entirely."""
    return set(
        Question.objects.values_list("subtopic_id", flat=True).distinct()
    )


class HierarchyView(generics.ListAPIView):
    """GET /api/practice/hierarchy/ — full Subject tree with progress rollups."""
    serializer_class = SubjectHierarchySerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = (
        Subject.objects
        .prefetch_related("domains__topics__subtopics")
        .all()
    )

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["progress_by_subtopic"] = _progress_by_subtopic(self.request.user)
        ctx["subtopic_ids_with_questions"] = _subtopic_ids_with_questions()
        return ctx


class TierQuestionsView(generics.ListAPIView):
    """GET /api/practice/subtopics/<subtopic_id>/<tier>/questions/"""
    serializer_class = QuestionPracticeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Question.objects.filter(
            subtopic_id=self.kwargs["subtopic_id"], tier=self.kwargs["tier"]
        ).prefetch_related("choices", "statements")


class RevealTierView(APIView):
    """
    GET /api/practice/subtopics/<subtopic_id>/<tier>/reveal/
    Returns correct answers + explanations, and marks the attempt revealed
    (so it no longer counts toward completion/score).
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, subtopic_id, tier):
        questions = Question.objects.filter(
            subtopic_id=subtopic_id, tier=tier
        ).prefetch_related("choices", "statements")

        attempt, _ = PracticeAttempt.objects.get_or_create(
            user=request.user, subtopic_id=subtopic_id, tier=tier
        )
        attempt.revealed_answers = True
        attempt.save(update_fields=["revealed_answers"])

        return Response(QuestionRevealSerializer(questions, many=True).data)


class SubmitTierView(APIView):
    """
    POST /api/practice/subtopics/<subtopic_id>/<tier>/submit/
    Scores every answer, upserts the PracticeAttempt + AttemptAnswer rows.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, subtopic_id, tier):
        serializer = SubmitTierSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        subtopic = Subtopic.objects.get(pk=subtopic_id)
        questions = {
            q.id: q for q in Question.objects.filter(subtopic=subtopic, tier=tier)
            .prefetch_related("choices", "statements")
        }

        attempt, _ = PracticeAttempt.objects.get_or_create(
            user=request.user, subtopic=subtopic, tier=tier
        )
        if d["revealed"]:
            attempt.revealed_answers = True

        results = []
        correct_count = 0
        for a in d["answers"]:
            question = questions.get(a["question_id"])
            if question is None:
                continue
            is_correct, ua = self._score_answer(attempt, question, a)
            if is_correct:
                correct_count += 1
            results.append(is_correct)

        total = len(results)
        attempt.score = round(100 * correct_count / total, 2) if total else 0
        attempt.completed_at = timezone.now()
        attempt.save()

        if not attempt.revealed_answers:
            record_activity(request.user)
            evaluate_achievements(request.user)

        return Response({
            "attempt": PracticeAttemptSerializer(attempt).data,
            "correct_count": correct_count,
            "total": total,
        }, status=status.HTTP_200_OK)

    def _score_answer(self, attempt, question: Question, a: dict):
        defaults = score_answer(question, a)
        ua, _ = AttemptAnswer.objects.update_or_create(
            attempt=attempt, question=question, defaults=defaults,
        )
        return defaults["is_correct"], ua
