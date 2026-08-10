from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import MistakeEntry, MistakeEntrySource
from .serializers import MistakeEntrySerializer, MistakeRetryInputSerializer


class MistakeListView(generics.ListAPIView):
    """GET /api/mistakes/ — this user's full mistake log, newest first.
    Optional ?source=practice|mock_exam|flashcard filter."""
    serializer_class = MistakeEntrySerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        qs = MistakeEntry.objects.filter(user=self.request.user).select_related("content_type")
        source = self.request.query_params.get("source")
        if source:
            qs = qs.filter(source=source)
        return qs


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
