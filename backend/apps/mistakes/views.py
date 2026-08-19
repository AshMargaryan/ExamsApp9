from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .classification import classify_mistake
from .models import MistakeEntry, MistakeEntrySource
from .serializers import MistakeEntrySerializer, MistakeRetryInputSerializer

# A long-time student's mistake log is append-only and unbounded — cap a
# single response instead of serializing the entire table. Plain slicing
# (not pagination_class) keeps the response a flat array, matching every
# existing caller's expectations.
MAX_MISTAKES_RETURNED = 500


class MistakeListView(generics.ListAPIView):
    """
    GET /api/mistakes/ — this user's mistake log, newest first.

    Filters (all optional, all combinable):
      ?source=practice|mock_exam|flashcard
      ?subject=<subject_name>     exact subject, as stored on the entry
      ?topic=<topic_label>        exact topic within that subject
      ?unresolved=1               drop entries already re-answered correctly

    `subject`/`topic` exist so a study-plan task can deep-link straight to the
    exact set of mistakes it is about (see apps.study_plan.services
    ._mistake_candidates, which builds the same pair into the task's
    link_path). Matching is on the denormalised label columns rather than a FK
    because MistakeEntry deliberately stores those as text — a mistake outlives
    the question it came from.
    """
    serializer_class = MistakeEntrySerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        params = self.request.query_params
        qs = MistakeEntry.objects.filter(user=self.request.user).select_related("content_type")

        source = params.get("source")
        if source:
            qs = qs.filter(source=source)

        subject = params.get("subject")
        if subject:
            qs = qs.filter(subject_name=subject)

        topic = params.get("topic")
        if topic:
            qs = qs.filter(topic_label=topic)

        if params.get("unresolved") in ("1", "true"):
            qs = qs.exclude(last_retry_correct=True)

        return qs[:MAX_MISTAKES_RETURNED]


class MistakeRetryView(APIView):
    """
    POST /api/mistakes/<id>/retry/ — re-grades this mistake's question live
    (practice/mock_exam), or accepts a self-reported `knew_it` (flashcard).
    Updates the entry's retry stats; the log entry itself is never cleared
    or modified, so the mistake stays in the notebook regardless of outcome.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        entry = get_object_or_404(MistakeEntry, pk=pk, user=request.user)
        serializer = MistakeRetryInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        if entry.source == MistakeEntrySource.FLASHCARD:
            is_correct = d["knew_it"]
        else:
            question = entry.content_object
            if question is None:
                return Response(
                    {"detail": "Այս հարցն այլևս հասանելի չէ։"}, status=status.HTTP_404_NOT_FOUND,
                )
            if entry.source == MistakeEntrySource.PRACTICE:
                from apps.practice.scoring import score_answer
            else:
                from apps.mock_exams.scoring import score_answer
            is_correct = score_answer(question, d)["is_correct"]

        entry.retry_count += 1
        entry.last_retried_at = timezone.now()
        entry.last_retry_correct = is_correct
        entry.save(update_fields=["retry_count", "last_retried_at", "last_retry_correct"])

        return Response({
            "is_correct": is_correct,
            "correct_answer_text": entry.correct_answer_text,
            "explanation": entry.explanation,
            "retry_count": entry.retry_count,
        })


class MistakeClassifyView(APIView):
    """POST /api/mistakes/<id>/classify/ — lazily classifies *why* this
    mistake happened via AI, caching the result on the entry. A second call
    on an already-classified (or not-attempted) entry is a cheap no-op that
    just returns the current state — never re-bills the AI call."""

    permission_classes = [permissions.IsAuthenticated]
    # First classification of any given entry bills an AI call (repeats are a
    # cached no-op — see docstring above) — see DEFAULT_THROTTLE_RATES["ai-assistant"].
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "ai-assistant"

    def post(self, request, pk):
        entry = get_object_or_404(MistakeEntry, pk=pk, user=request.user)
        classify_mistake(entry)
        return Response(MistakeEntrySerializer(entry).data)
