from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    MockExam, MockExamQuestion, MockExamAttempt, MockExamAnswer,
    MockExamAttemptStatus, MockExamDifficulty,
)
from .scoring import score_answer, compute_scaled_score
from .serializers import (
    MockExamListSerializer,
    MockExamQuestionSafeSerializer, MockExamQuestionRevealSerializer,
    StartAttemptSerializer, DraftSaveSerializer, FinishAttemptSerializer,
    MockExamAttemptSerializer,
)
from apps.profiles.engine import evaluate_achievements
from apps.streaks.services import record_activity


class ListMockExamsView(generics.ListAPIView):
    """GET /api/mock-exams/exams/ — all exams + the current user's attempt state per exam."""
    serializer_class = MockExamListSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = MockExam.objects.all()

    def list(self, request, *args, **kwargs):
        exams = list(self.get_queryset())
        base = {e.id: self.get_serializer(e).data for e in exams}

        attempts = MockExamAttempt.objects.filter(
            user=request.user, exam_id__in=base.keys()
        ).order_by("-started_at")

        drafts = {}
        completed_counts = {}
        best_scores = {}
        for a in attempts:
            if a.status == MockExamAttemptStatus.IN_PROGRESS and a.exam_id not in drafts:
                drafts[a.exam_id] = a.id
            if a.status == MockExamAttemptStatus.COMPLETED:
                completed_counts[a.exam_id] = completed_counts.get(a.exam_id, 0) + 1
                if a.scaled_score is not None:
                    best_scores[a.exam_id] = max(best_scores.get(a.exam_id, 0.0), a.scaled_score)

        results = []
        for e in exams:
            row = dict(base[e.id])
            row["has_draft"] = e.id in drafts
            row["draft_attempt_id"] = drafts.get(e.id)
            row["completed_attempts_count"] = completed_counts.get(e.id, 0)
            row["best_scaled_score"] = best_scores.get(e.id)
            results.append(row)

        return Response({"results": results})


class ExamAttemptHistoryView(generics.ListAPIView):
    """GET /api/mock-exams/exams/<exam_id>/attempts/ — this user's completed attempts."""
    serializer_class = MockExamAttemptSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return MockExamAttempt.objects.filter(
            user=self.request.user,
            exam_id=self.kwargs["exam_id"],
            status=MockExamAttemptStatus.COMPLETED,
        ).select_related("exam")


class StartAttemptView(APIView):
    """POST /api/mock-exams/exams/<exam_id>/start/"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, exam_id):
        exam = get_object_or_404(MockExam, pk=exam_id)

        existing_draft = MockExamAttempt.objects.filter(
            user=request.user, exam=exam, status=MockExamAttemptStatus.IN_PROGRESS
        ).first()
        if existing_draft:
            raise ValidationError({
                "detail": "An in-progress attempt already exists for this exam.",
                "draft_attempt_id": existing_draft.id,
            })

        serializer = StartAttemptSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        counts = {
            MockExamDifficulty.EASY: 0, MockExamDifficulty.MEDIUM: 0, MockExamDifficulty.HARD: 0,
        }
        for difficulty in exam.questions.values_list("difficulty", flat=True):
            counts[difficulty] = counts.get(difficulty, 0) + 1

        attempt = MockExamAttempt.objects.create(
            user=request.user,
            exam=exam,
            duration_minutes=d["duration_minutes"],
            hints_enabled=d["hints_enabled"],
            time_remaining_seconds=(d["duration_minutes"] * 60 if d["duration_minutes"] else None),
            easy_total=counts.get(MockExamDifficulty.EASY, 0),
            medium_total=counts.get(MockExamDifficulty.MEDIUM, 0),
            hard_total=counts.get(MockExamDifficulty.HARD, 0),
        )
        return Response(MockExamAttemptSerializer(attempt).data, status=status.HTTP_201_CREATED)


def _remaining_seconds(attempt: MockExamAttempt):
    if attempt.duration_minutes is None:
        return None
    if attempt.status == MockExamAttemptStatus.COMPLETED:
        return attempt.time_remaining_seconds
    elapsed = (timezone.now() - attempt.started_at).total_seconds()
    total = attempt.duration_minutes * 60
    return max(0, int(total - elapsed))


class AttemptDetailView(APIView):
    """GET /api/mock-exams/attempts/<id>/ — resume: attempt + questions + saved answers."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        attempt = get_object_or_404(MockExamAttempt, pk=pk, user=request.user)
        questions = attempt.exam.questions.prefetch_related("choices", "statements")
        question_data = MockExamQuestionSafeSerializer(questions, many=True).data
        if not attempt.hints_enabled:
            for q in question_data:
                q["hint"] = ""

        saved_answers = {
            a.question_id: {
                "selected_choice_id": a.selected_choice_id,
                "answer_text": a.answer_text,
                "selected_statement_ids": a.selected_statement_ids,
            }
            for a in attempt.answers.all()
        }

        return Response({
            "attempt": MockExamAttemptSerializer(attempt).data,
            "remaining_seconds": _remaining_seconds(attempt),
            "questions": question_data,
            "answers": saved_answers,
        })


class SaveDraftView(APIView):
    """POST /api/mock-exams/attempts/<id>/draft/"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        attempt = get_object_or_404(MockExamAttempt, pk=pk, user=request.user)
        if attempt.status == MockExamAttemptStatus.COMPLETED:
            return Response({"detail": "Attempt already completed."}, status=status.HTTP_409_CONFLICT)

        serializer = DraftSaveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        questions = {q.id: q for q in attempt.exam.questions.all()}
        for a in d["answers"]:
            question = questions.get(a["question_id"])
            if question is None:
                continue
            MockExamAnswer.objects.update_or_create(
                attempt=attempt, question=question,
                defaults=dict(
                    selected_choice_id=a.get("selected_choice_id"),
                    answer_text=a.get("answer_text", ""),
                    selected_statement_ids=a.get("selected_statement_ids", []),
                ),
            )

        if d["time_remaining_seconds"] is not None:
            attempt.time_remaining_seconds = d["time_remaining_seconds"]
        attempt.save(update_fields=["time_remaining_seconds", "updated_at"])

        return Response({"saved": True, "remaining_seconds": _remaining_seconds(attempt)})


class FinishAttemptView(APIView):
    """POST /api/mock-exams/attempts/<id>/finish/"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        attempt = get_object_or_404(MockExamAttempt, pk=pk, user=request.user)
        if attempt.status == MockExamAttemptStatus.COMPLETED:
            return Response({"detail": "Attempt already completed."}, status=status.HTTP_409_CONFLICT)

        serializer = FinishAttemptSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        questions = {
            q.id: q for q in attempt.exam.questions.prefetch_related("choices", "statements")
        }

        answered_count = 0
        tier_correct = {MockExamDifficulty.EASY: 0, MockExamDifficulty.MEDIUM: 0, MockExamDifficulty.HARD: 0}
        raw_score = 0

        for a in d["answers"]:
            question = questions.get(a["question_id"])
            if question is None:
                continue
            if a.get("selected_choice_id") or a.get("answer_text") or a.get("selected_statement_ids"):
                answered_count += 1

            defaults = score_answer(question, a)
            MockExamAnswer.objects.update_or_create(
                attempt=attempt, question=question, defaults=defaults,
            )
            if defaults["is_correct"]:
                raw_score += 1
                tier_correct[question.difficulty] += 1

        attempt.raw_score = raw_score
        attempt.percent_answered = round(100 * answered_count / len(questions), 2) if questions else 0.0
        attempt.easy_correct = tier_correct[MockExamDifficulty.EASY]
        attempt.medium_correct = tier_correct[MockExamDifficulty.MEDIUM]
        attempt.hard_correct = tier_correct[MockExamDifficulty.HARD]
        attempt.scaled_score = compute_scaled_score(
            raw_score,
            attempt.easy_correct, attempt.easy_total,
            attempt.medium_correct, attempt.medium_total,
            attempt.hard_correct, attempt.hard_total,
        )
        attempt.status = MockExamAttemptStatus.COMPLETED
        attempt.completed_at = timezone.now()
        attempt.time_remaining_seconds = _remaining_seconds(attempt)
        attempt.save()

        record_activity(request.user)
        evaluate_achievements(request.user)

        return Response(MockExamAttemptSerializer(attempt).data)


class AttemptResultsView(APIView):
    """GET /api/mock-exams/attempts/<id>/results/"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        attempt = get_object_or_404(MockExamAttempt, pk=pk, user=request.user)
        questions = attempt.exam.questions.prefetch_related("choices", "statements")
        saved_answers = {
            a.question_id: {
                "selected_choice_id": a.selected_choice_id,
                "answer_text": a.answer_text,
                "selected_statement_ids": a.selected_statement_ids,
                "is_correct": a.is_correct,
            }
            for a in attempt.answers.all()
        }
        return Response({
            "attempt": MockExamAttemptSerializer(attempt).data,
            "questions": MockExamQuestionRevealSerializer(questions, many=True).data,
            "answers": saved_answers,
        })
