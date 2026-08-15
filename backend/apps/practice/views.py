import hashlib
import json
from pathlib import Path

import requests
from django.conf import settings
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import (
    Subject, Subtopic, Question, PracticeAttempt, AttemptAnswer, DailyProblemAttempt,
    MistakeSource,
)
from apps.mistakes.services import record_mistake, was_attempted
from apps.mistakes.models import MistakeEntrySource
from .scoring import score_answer
from .services import (
    progress_by_subtopic as _progress_by_subtopic,
    subtopic_ids_with_questions as _subtopic_ids_with_questions,
    get_recommended_subtopics, get_weekly_progress, get_daily_question,
    get_daily_question_reason, record_topic_mistake,
)
from .serializers import (
    SubjectHierarchySerializer, SubtopicMaterialSerializer,
    QuestionPracticeSerializer, QuestionRevealSerializer,
    SubmitTierSerializer, PracticeAttemptSerializer,
    RecommendedSubtopicSerializer, WeeklyProgressPointSerializer,
    DailyProblemSerializer, DailyProblemSubmitSerializer,
)
from apps.profiles.engine import evaluate_achievements
from apps.profiles.models import LearningEventType
from apps.profiles.services import record_event
from apps.profiles.subjects import canonical_key_for_practice_subject
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
        ).select_related("subtopic__topic__domain__subject").prefetch_related("choices", "statements")


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
        ).select_related("subtopic__topic__domain__subject").prefetch_related("choices", "statements")

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

        subtopic = Subtopic.objects.select_related("topic__domain__subject").get(pk=subtopic_id)
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
            is_correct, newly_correct, ua = self._score_answer(attempt, subtopic, question, a)
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
            award_xp(
                request.user, newly_correct_count * XP_PER_CORRECT_PRACTICE_ANSWER,
                subject=canonical_key_for_practice_subject(subtopic.topic.domain.subject),
            )

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

    def _score_answer(self, attempt, subtopic: Subtopic, question: Question, a: dict):
        defaults = score_answer(question, a)
        was_correct_before = AttemptAnswer.objects.filter(
            attempt=attempt, question=question, is_correct=True
        ).exists()
        ua, _ = AttemptAnswer.objects.update_or_create(
            attempt=attempt, question=question, defaults=defaults,
        )
        if not defaults["is_correct"] and not attempt.revealed_answers:
            if was_attempted(a):
                record_topic_mistake(
                    attempt.user, source=MistakeSource.PRACTICE,
                    subject_name=subtopic.topic.domain.subject.name, topic_label=subtopic.name,
                    subtopic=subtopic,
                )
            record_mistake(
                attempt.user, source=MistakeEntrySource.PRACTICE,
                subject_name=subtopic.topic.domain.subject.name, topic_label=subtopic.name,
                question=question, question_type=question.question_type, answer_data=a,
                explanation=question.explanation,
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
        question = get_daily_question(request.user, today)
        if question is None:
            return Response({"detail": "Այսօրվա հարցը հասանելի չէ։"}, status=status.HTTP_404_NOT_FOUND)

        attempt = DailyProblemAttempt.objects.filter(user=request.user, date=today).first()
        data = {
            "date": today, "question": question,
            "already_answered": attempt is not None,
            "attempt": attempt,
            "reason": get_daily_question_reason(request.user, question),
        }
        return Response(DailyProblemSerializer(data).data)

    def post(self, request):
        today = timezone.localdate()
        question = get_daily_question(request.user, today)
        if question is None:
            return Response({"detail": "Այսօրվա հարցը հասանելի չէ։"}, status=status.HTTP_404_NOT_FOUND)

        existing = DailyProblemAttempt.objects.filter(user=request.user, date=today).first()
        if existing is not None:
            data = {
                "date": today, "question": question,
                "already_answered": True, "attempt": existing,
                "reason": get_daily_question_reason(request.user, question),
            }
            return Response(DailyProblemSerializer(data).data)

        serializer = DailyProblemSubmitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        defaults = score_answer(question, serializer.validated_data)

        attempt = DailyProblemAttempt.objects.create(
            user=request.user, date=today, question=question, **defaults,
        )

        if not attempt.is_correct:
            subtopic = question.subtopic
            if was_attempted(serializer.validated_data):
                record_topic_mistake(
                    request.user, source=MistakeSource.PRACTICE,
                    subject_name=subtopic.topic.domain.subject.name, topic_label=subtopic.name,
                    subtopic=subtopic,
                )
            record_mistake(
                request.user, source=MistakeEntrySource.PRACTICE,
                subject_name=subtopic.topic.domain.subject.name, topic_label=subtopic.name,
                question=question, question_type=question.question_type,
                answer_data=serializer.validated_data, explanation=question.explanation,
            )

        record_activity(request.user)
        evaluate_achievements(request.user)
        if attempt.is_correct:
            award_xp(
                request.user, XP_PER_CORRECT_DAILY_PROBLEM,
                subject=canonical_key_for_practice_subject(question.subtopic.topic.domain.subject),
            )

        data = {
            "date": today, "question": question, "already_answered": True, "attempt": attempt,
            "reason": get_daily_question_reason(request.user, question),
        }
        return Response(DailyProblemSerializer(data).data, status=status.HTTP_201_CREATED)


PRONOUNCE_CACHE_DIR = settings.BASE_DIR / "media" / "tts_cache"
PRONOUNCE_MAX_CHARS = 200  # Google's translate_tts endpoint isn't meant for longer text.


class PronounceView(APIView):
    """
    GET /api/practice/pronounce/?text=...
    Fallback pronunciation audio for browsers/OSes (mainly Linux, and some
    non-Chrome browsers) whose local Web Speech API voices only expose a
    robotic offline synthesizer. Proxies short text to Google Translate's
    (unofficial, undocumented) TTS endpoint and caches the result on disk
    by text hash, so the same word/sentence is only ever fetched once —
    keeps this from depending too heavily on an endpoint that isn't a
    stable, sanctioned API and could change or rate-limit without notice.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        text = request.query_params.get("text", "").strip()[:PRONOUNCE_MAX_CHARS]
        if not text:
            return HttpResponse(status=400)

        PRONOUNCE_CACHE_DIR.mkdir(parents=True, exist_ok=True)
        cache_key = hashlib.sha256(text.encode("utf-8")).hexdigest()[:32]
        cache_path = PRONOUNCE_CACHE_DIR / f"{cache_key}.mp3"

        if not cache_path.exists():
            try:
                resp = requests.get(
                    "https://translate.google.com/translate_tts",
                    params={"ie": "UTF-8", "q": text, "tl": "en", "client": "tw-ob"},
                    headers={"User-Agent": "Mozilla/5.0"},
                    timeout=8,
                )
                resp.raise_for_status()
            except requests.RequestException:
                return HttpResponse(status=502)
            cache_path.write_bytes(resp.content)

        return HttpResponse(cache_path.read_bytes(), content_type="audio/mpeg")


TRANSLATE_CACHE_DIR = settings.BASE_DIR / "media" / "translate_cache"
TRANSLATE_MAX_CHARS = 200


class TranslateView(APIView):
    """
    GET /api/practice/translate/?text=...
    English -> Armenian translation for the "select to pronounce" widget's
    Translate button (reading/practice material, where the selected text
    isn't tied to any flashcard with a pre-authored translation). Proxies to
    Google Translate's (unofficial, undocumented) single-translation
    endpoint — same trust tradeoff as PronounceView above — and caches
    results on disk by text hash.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        text = request.query_params.get("text", "").strip()[:TRANSLATE_MAX_CHARS]
        if not text:
            return Response(status=status.HTTP_400_BAD_REQUEST)

        TRANSLATE_CACHE_DIR.mkdir(parents=True, exist_ok=True)
        cache_key = hashlib.sha256(text.lower().encode("utf-8")).hexdigest()[:32]
        cache_path = TRANSLATE_CACHE_DIR / f"{cache_key}.json"

        if cache_path.exists():
            return Response(json.loads(cache_path.read_text(encoding="utf-8")))

        try:
            resp = requests.get(
                "https://translate.googleapis.com/translate_a/single",
                params={"client": "gtx", "sl": "en", "tl": "hy", "dt": "t", "q": text},
                headers={"User-Agent": "Mozilla/5.0"},
                timeout=8,
            )
            resp.raise_for_status()
            payload = resp.json()
            translation = "".join(segment[0] for segment in payload[0])
        except (requests.RequestException, ValueError, IndexError, KeyError, TypeError):
            return Response(status=status.HTTP_502_BAD_GATEWAY)

        result = {"text": text, "translation": translation}
        cache_path.write_text(json.dumps(result, ensure_ascii=False), encoding="utf-8")
        return Response(result)


class QuestionHintViewedView(APIView):
    """POST /api/practice/questions/<id>/hint-viewed/ — records that the
    student opened this question's (or one of its statements') hint.
    Questions aren't user-owned, so no ownership check; carries no reward,
    so a duplicate/replayed call is harmless beyond a duplicate log row."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, question_id):
        question = get_object_or_404(
            Question.objects.select_related("subtopic__topic__domain__subject"), pk=question_id,
        )
        subject_key = canonical_key_for_practice_subject(question.subtopic.topic.domain.subject) or ""
        record_event(
            request.user, LearningEventType.HINT_REQUESTED,
            subject_key=subject_key, topic_label=question.subtopic.name,
            source="practice", target_id=question.id,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)
