import hashlib
from collections import defaultdict
from pathlib import Path

import requests
from django.conf import settings
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Subject, Subtopic, Question, PracticeAttempt, AttemptAnswer
from .scoring import score_answer
from .serializers import (
    SubjectHierarchySerializer, SubtopicMaterialSerializer,
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
