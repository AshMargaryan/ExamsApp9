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
from apps.mistakes.services import record_mistake
from apps.mistakes.models import MistakeEntrySource
from .scoring import score_answer, compute_scaled_score
from .serializers import (
    MockExamListSerializer,
    MockExamQuestionSafeSerializer, MockExamQuestionRevealSerializer,
    StartAttemptSerializer, DraftSaveSerializer, FinishAttemptSerializer,
    MockExamAttemptSerializer,
)
from apps.profiles.engine import evaluate_achievements
from apps.profiles.xp import award_xp
from apps.streaks.services import record_activity

XP_PER_CORRECT_MOCK_ANSWER = 4
XP_FIRST_COMPLETION_BONUS = 20
XP_RETAKE_COMPLETION_BONUS = 10


class ListMockExamsView(generics.ListAPIView):
    """GET /api/mock-exams/exams/ — all exams + the current user's attempt state per exam."""
    serializer_class = MockExamListSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = MockExam.objects.all()

    def get_queryset(self):
        qs = super().get_queryset()
        subject = self.request.query_params.get("subject")
        if subject:
            qs = qs.filter(subject=subject)
        return qs

    def list(self, request, *args, **kwargs):
        exams = list(self.get_queryset())
        base = {e.id: self.get_serializer(e).data for e in exams}

        attempts = MockExamAttempt.objects.filter(
            user=request.user, exam_id__in=base.keys()
        ).order_by("-started_at")

        drafts = {}
        completed_counts = {}
        best_scores = {}
        last_attempt_at = {}
        for a in attempts:
            if a.status == MockExamAttemptStatus.IN_PROGRESS and a.exam_id not in drafts:
                drafts[a.exam_id] = a.id
            if a.status == MockExamAttemptStatus.COMPLETED:
                completed_counts[a.exam_id] = completed_counts.get(a.exam_id, 0) + 1
                if a.scaled_score is not None:
                    best_scores[a.exam_id] = max(best_scores.get(a.exam_id, 0.0), a.scaled_score)
            # attempts is ordered by -started_at, so the first row seen per exam is the latest.
            if a.exam_id not in last_attempt_at:
                last_attempt_at[a.exam_id] = a.started_at

        results = []
        for e in exams:
            row = dict(base[e.id])
            row["has_draft"] = e.id in drafts
            row["draft_attempt_id"] = drafts.get(e.id)
            row["completed_attempts_count"] = completed_counts.get(e.id, 0)
            row["best_scaled_score"] = best_scores.get(e.id)
            row["last_attempt_at"] = last_attempt_at.get(e.id)
            results.append(row)

        return Response({"results": results})


class OverviewView(APIView):
    """GET /api/mock-exams/overview/ — aggregate personal stats across all
    subjects, for the exam library's personal-overview stat row."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        completed = MockExamAttempt.objects.filter(
            user=request.user, status=MockExamAttemptStatus.COMPLETED,
        ).values_list("scaled_score", "started_at", "completed_at")

        completed_count = 0
        score_sum = 0.0
        best_score = None
        total_seconds = 0.0
        for scaled_score, started_at, completed_at in completed:
            completed_count += 1
            if scaled_score is not None:
                score_sum += scaled_score
                best_score = scaled_score if best_score is None else max(best_score, scaled_score)
            if started_at and completed_at:
                total_seconds += (completed_at - started_at).total_seconds()

        return Response({
            "completed_count": completed_count,
            "average_scaled_score": round(score_sum / completed_count, 2) if completed_count else None,
            "best_scaled_score": best_score,
            "total_time_seconds": int(total_seconds),
        })


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
    # time_remaining_seconds is a snapshot as of `updated_at` (set on start and
    # on every draft save) — anchoring elapsed time there, rather than at
    # started_at, means time spent away from the attempt (exited, backgrounded,
    # phone locked) doesn't get counted against the clock. Anchoring at
    # started_at instead would make a resumed attempt appear to have already
    # expired, auto-submitting it the instant the countdown effect next ticks.
    elapsed = (timezone.now() - attempt.updated_at).total_seconds()
    base = attempt.time_remaining_seconds if attempt.time_remaining_seconds is not None else attempt.duration_minutes * 60
    return max(0, int(base - elapsed))


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
                "match_pairs": a.match_pairs,
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
                    match_pairs=a.get("match_pairs", {}),
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
            if (a.get("selected_choice_id") or a.get("answer_text")
                    or a.get("selected_statement_ids") or a.get("match_pairs")):
                answered_count += 1

            defaults = score_answer(question, a)
            MockExamAnswer.objects.update_or_create(
                attempt=attempt, question=question, defaults=defaults,
            )
            if defaults["is_correct"]:
                raw_score += 1
                tier_correct[question.difficulty] += 1
            else:
                record_mistake(
                    request.user, source=MistakeEntrySource.MOCK_EXAM,
                    subject_name=attempt.exam.get_subject_display(), topic_label=question.topic,
                    question=question, question_type=question.question_type, answer_data=a,
                    explanation="\n".join(question.solution_steps) if question.solution_steps else "",
                )
                if question.topic:
                    from apps.practice.models import MistakeSource  # local import: avoids a load-order dependency
                    from apps.practice.services import record_topic_mistake
                    record_topic_mistake(
                        request.user, source=MistakeSource.MOCK_EXAM,
                        subject_name=attempt.exam.get_subject_display(), topic_label=question.topic,
                    )

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
        is_first_completion = not MockExamAttempt.objects.filter(
            user=request.user, exam=attempt.exam, status=MockExamAttemptStatus.COMPLETED,
        ).exists()

        attempt.status = MockExamAttemptStatus.COMPLETED
        attempt.completed_at = timezone.now()
        attempt.time_remaining_seconds = _remaining_seconds(attempt)
        attempt.save()

        record_activity(request.user)
        evaluate_achievements(request.user)

        # Full per-question XP only on a user's first clear of a given exam —
        # MockExamAttempt allows unlimited retakes (unlike PracticeAttempt,
        # which caps at one row per subtopic+tier), so paying out per-question
        # XP on every retake would let XP be farmed by replaying the same test.
        if is_first_completion:
            award_xp(
                request.user, raw_score * XP_PER_CORRECT_MOCK_ANSWER + XP_FIRST_COMPLETION_BONUS,
                subject=attempt.exam.subject,
            )
        else:
            award_xp(request.user, XP_RETAKE_COMPLETION_BONUS, subject=attempt.exam.subject)

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
                "match_pairs": a.match_pairs,
                "is_correct": a.is_correct,
            }
            for a in attempt.answers.all()
        }
        return Response({
            "attempt": MockExamAttemptSerializer(attempt).data,
            "questions": MockExamQuestionRevealSerializer(questions, many=True).data,
            "answers": saved_answers,
        })
