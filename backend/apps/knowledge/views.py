from rest_framework import generics, permissions

from apps.profiles.subjects import PRACTICE_SUBJECT_NAMES

from .models import SubjectMastery, TopicMastery
from .serializers import SubjectMasterySerializer, TopicMasterySerializer


class SubjectMasteryListView(generics.ListAPIView):
    """GET /api/knowledge/subjects/ — the authenticated student's stored
    subject-level mastery scores. Read-only: scores are only ever written
    by apps.knowledge.services, triggered by real practice/mock-exam/
    flashcard activity (see signals.py), never by direct API input."""

    serializer_class = SubjectMasterySerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return SubjectMastery.objects.filter(user=self.request.user)


class TopicMasteryListView(generics.ListAPIView):
    """GET /api/knowledge/topics/?subject_key=math — the authenticated
    student's stored topic-level mastery scores, optionally filtered to one
    subject. Only populated for subjects with real apps.practice content."""

    serializer_class = TopicMasterySerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        qs = TopicMastery.objects.filter(user=self.request.user).select_related("subtopic__topic__domain__subject")
        subject_key = self.request.query_params.get("subject_key")
        if subject_key:
            practice_name = PRACTICE_SUBJECT_NAMES.get(subject_key)
            qs = qs.filter(subtopic__topic__domain__subject__name=practice_name) if practice_name else qs.none()
        return qs
