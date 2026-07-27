from rest_framework import generics, permissions
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser

from .models import Achievement, Profile, UserAchievement
from .serializers import AchievementSerializer, ProfileSerializer, UserAchievementSerializer


class ProfileMeView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/profile/me/ — the authenticated user's own profile."""

    serializer_class = ProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_object(self):
        profile, _ = Profile.objects.get_or_create(user=self.request.user)
        return profile


class AchievementListView(generics.ListAPIView):
    """GET /api/profile/achievements/ — full catalog of achievements."""

    serializer_class = AchievementSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None
    queryset = Achievement.objects.all()


class MyAchievementsListView(generics.ListAPIView):
    """GET /api/profile/achievements/mine/ — achievements the user has unlocked."""

    serializer_class = UserAchievementSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return UserAchievement.objects.filter(user=self.request.user).select_related("achievement")


class UserProfileDetailView(generics.RetrieveAPIView):
    """GET /api/profile/<user_id>/ — read-only view of another user's profile (e.g. a friend's)."""

    serializer_class = ProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        profile, _ = Profile.objects.get_or_create(user_id=self.kwargs["user_id"])
        return profile


class UserAchievementsListView(generics.ListAPIView):
    """GET /api/profile/<user_id>/achievements/ — achievements a given user has unlocked."""

    serializer_class = UserAchievementSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return UserAchievement.objects.filter(user_id=self.kwargs["user_id"]).select_related("achievement")
