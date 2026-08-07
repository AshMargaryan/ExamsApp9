from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Subject, Subtopic, Question, PracticeAttempt, AttemptAnswer, DailyProblemAttempt
from .scoring import score_answer
from .services import (
    progress_by_subtopic as _progress_by_subtopic,
    subtopic_ids_with_questions as _subtopic_ids_with_questions,
    get_recommended_subtopics, get_weekly_progress, get_daily_question,
)
from .serializers import (
    SubjectHierarchySerializer, SubtopicMaterialSerializer,
    QuestionPracticeSerializer, QuestionRevealSerializer,
    SubmitTierSerializer, PracticeAttemptSerializer,
    RecommendedSubtopicSerializer, WeeklyProgressPointSerializer,
    DailyProblemSerializer, DailyProblemSubmitSerializer,
)
from apps.profiles.engine import evaluate_achievements
from apps.profiles.xp import award_xp
from apps.streaks.services import record_activity

XP_PER_CORRECT_PRACTICE_ANSWER = 3
XP_PER_CORRECT_DAILY_PROBLEM = 10


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


class SubtopicMaterialView(generics.RetrieveAPIView):
    """GET /api/practice/subtopics/<subtopic_id>/material/"""
    serializer_class = SubtopicMaterialSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Subtopic.objects.all()
    lookup_url_kwarg = "subtopic_id"


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
        newly_correct_count = 0
        for a in d["answers"]:
            question = questions.get(a["question_id"])
            if question is None:
                continue
            is_correct, newly_correct, ua = self._score_answer(attempt, question, a)
            if is_correct:
                correct_count += 1
            if newly_correct:
                newly_correct_count += 1
            results.append(is_correct)

        total = len(results)
        attempt.score = round(100 * correct_count / total, 2) if total else 0
        attempt.completed_at = timezone.now()
        attempt.save()

        if not attempt.revealed_answers:
            record_activity(request.user)
            evaluate_achievements(request.user)
            award_xp(request.user, newly_correct_count * XP_PER_CORRECT_PRACTICE_ANSWER)

            from apps.parents.models import NotificationType  # local import: avoids a load-order dependency
            from apps.parents.services import notify_parents
            notify_parents(
                request.user, NotificationType.LESSON_COMPLETED,
                f"Ավարտեց «{subtopic.name}» թեման ({tier} մակարդակ), {attempt.score}% արդյունքով։",
            )
            if attempt.score is not None and attempt.score < 50:
                notify_parents(
                    request.user, NotificationType.STRUGGLING_TOPIC,
                    f"Դժվարանում է «{subtopic.name}» թեմայում ({attempt.score}%)։",
                )

        return Response({
            "attempt": PracticeAttemptSerializer(attempt).data,
            "correct_count": correct_count,
            "total": total,
        }, status=status.HTTP_200_OK)

    def _score_answer(self, attempt, question: Question, a: dict):
        defaults = score_answer(question, a)
        was_correct_before = AttemptAnswer.objects.filter(
            attempt=attempt, question=question, is_correct=True
        ).exists()
        ua, _ = AttemptAnswer.objects.update_or_create(
            attempt=attempt, question=question, defaults=defaults,
        )
        newly_correct = defaults["is_correct"] and not was_correct_before
        return defaults["is_correct"], newly_correct, ua


# ---------------------------------------------------------------------------
# Home dashboard
# ---------------------------------------------------------------------------

class RecommendedExercisesView(APIView):
    """GET /api/practice/dashboard/recommended/ — up to 5 subtopics to practice next."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        picks = get_recommended_subtopics(request.user)
        return Response(RecommendedSubtopicSerializer(picks, many=True).data)


class WeeklyProgressView(APIView):
    """GET /api/practice/dashboard/weekly-progress/ — questions solved per week, last 8 weeks."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        points = get_weekly_progress(request.user)
        return Response(WeeklyProgressPointSerializer(points, many=True).data)


class DailyProblemView(APIView):
    """
    GET /api/practice/daily-problem/ — today's question (answers hidden), or the
    already-submitted result if the user has already answered today.
    POST /api/practice/daily-problem/ — submit an answer; scored once per day.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        today = timezone.localdate()
        question = get_daily_question(today)
        if question is None:
            return Response({"detail": "Այսօրվա հարցը հասանելի չէ։"}, status=status.HTTP_404_NOT_FOUND)

        attempt = DailyProblemAttempt.objects.filter(user=request.user, date=today).first()
        data = {
            "date": today, "question": question,
            "already_answered": attempt is not None,
            "attempt": attempt,
        }
        return Response(DailyProblemSerializer(data).data)

    def post(self, request):
        today = timezone.localdate()
        question = get_daily_question(today)
        if question is None:
            return Response({"detail": "Այսօրվա հարցը հասանելի չէ։"}, status=status.HTTP_404_NOT_FOUND)

        existing = DailyProblemAttempt.objects.filter(user=request.user, date=today).first()
        if existing is not None:
            data = {
                "date": today, "question": question,
                "already_answered": True, "attempt": existing,
            }
            return Response(DailyProblemSerializer(data).data)

        serializer = DailyProblemSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        defaults = score_answer(question, serializer.validated_data)

        attempt = DailyProblemAttempt.objects.create(
            user=request.user, date=today, question=question, **defaults,
        )

        record_activity(request.user)
        evaluate_achievements(request.user)
        if attempt.is_correct:
            award_xp(request.user, XP_PER_CORRECT_DAILY_PROBLEM)

        data = {"date": today, "question": question, "already_answered": True, "attempt": attempt}
        return Response(DailyProblemSerializer(data).data, status=status.HTTP_201_CREATED)
