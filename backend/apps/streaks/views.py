from rest_framework import generics, permissions

from .models import LearningStreak
from .serializers import LearningStreakSerializer


class MyStreakView(generics.RetrieveAPIView):
    """GET /api/streaks/me/ — the authenticated user's streak info."""

    serializer_class = LearningStreakSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        streak, _ = LearningStreak.objects.get_or_create(user=self.request.user)
        return streak
