from rest_framework import generics, permissions
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime

from . import analytics
from .analytics import SUBJECT_LABELS
from .context import get_learner_context
from .models import (
    Achievement,
    GoalType,
    LearningEvent,
    LearningPreferences,
    PersonalGoal,
    Profile,
    ProfilePrivacySettings,
    StudentExam,
    StudentSubject,
    StudyAvailability,
    UserAchievement,
)
from .serializers import (
    AchievementSerializer,
    LearningEventSerializer,
    LearningPreferencesSerializer,
    PersonalGoalSerializer,
    ProfilePrivacySettingsSerializer,
    ProfileSerializer,
    ShowcaseUpdateSerializer,
    StudentExamSerializer,
    StudentSubjectSerializer,
    StudyAvailabilitySerializer,
    UserAchievementSerializer,
)


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
        target_id = self.kwargs["user_id"]
        if target_id != self.request.user.id:
            privacy, _ = ProfilePrivacySettings.objects.get_or_create(user_id=target_id)
            if not privacy.show_achievements:
                return UserAchievement.objects.none()
        return UserAchievement.objects.filter(user_id=target_id).select_related("achievement")


class ProfileAnalyticsView(APIView):
    """GET /api/profile/analytics/ — one aggregated call for every derived
    profile section (subject mastery, Learning DNA, Academic Power, personal
    records, growth, AI coach, next mission). Kept separate from
    ProfileMeView so the cheap identity/XP/streak data isn't slowed down by
    these heavier computed queries."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            "subject_mastery": analytics.subject_mastery(user),
            "learning_dna": analytics.learning_dna(user),
            "academic_power": analytics.academic_power(user),
            "personal_records": analytics.personal_records(user),
            "growth": analytics.growth(user),
            "coach": analytics.coach(user),
            "next_mission": analytics.next_mission(user),
        })


class HomeInsightView(APIView):
    """GET /api/profile/home-insight/ — the cheap, home-page-scoped subset
    of analytics (AI coach note + next mission + today's checklist). Kept
    separate from ProfileAnalyticsView's heavier subject-mastery/skill-map/
    academic-power computation, same cost-based split rationale as that view."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            "coach": analytics.coach(user),
            "next_mission": analytics.next_mission(user),
            "checklist": analytics.today_checklist(user),
        })


class SkillMapView(APIView):
    """GET /api/profile/skill-map/<subject_key>/ — lazy-loaded topic
    drill-down for one subject, fetched only when its card is expanded."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, subject_key):
        if subject_key not in SUBJECT_LABELS:
            return Response({"available": False, "reason": "Անհայտ առարկա։"}, status=404)
        return Response(analytics.skill_map(request.user, subject_key))


class ActivityHeatmapView(APIView):
    """GET /api/profile/activity-heatmap/?days=365 — lazy-loaded, fetched
    only when the heatmap section scrolls into view."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            days = min(max(int(request.query_params.get("days", 365)), 1), 366)
        except ValueError:
            days = 365
        return Response(analytics.activity_heatmap(request.user, days=days))


class TimelineView(APIView):
    """GET /api/profile/timeline/?limit=40 — lazy-loaded recent-activity /
    study-journey feed (achievement unlocks, ranking awards, active days)."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            limit = min(max(int(request.query_params.get("limit", 40)), 1), 100)
        except ValueError:
            limit = 40
        return Response(analytics.timeline(request.user, limit=limit))


class PersonalGoalListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/profile/goals/ — the authenticated student's own goals."""

    serializer_class = PersonalGoalSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return PersonalGoal.objects.filter(user=self.request.user).select_related("subject")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class PersonalGoalDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/profile/goals/<id>/ — a single goal. PATCHing
    completed_at (any non-null value) marks a CUSTOM goal done; typed goals'
    progress is always derived live and can't be marked complete manually."""

    serializer_class = PersonalGoalSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return PersonalGoal.objects.filter(user=self.request.user)

    def perform_update(self, serializer):
        goal = self.get_object()
        completed = self.request.data.get("completed")
        if goal.goal_type == GoalType.CUSTOM and completed is not None:
            serializer.save(completed_at=timezone.now() if completed else None)
        else:
            serializer.save()


class StudentExamListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/profile/exams/ — the authenticated student's own
    upcoming/past exams."""

    serializer_class = StudentExamSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return StudentExam.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class StudentExamDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/profile/exams/<id>/."""

    serializer_class = StudentExamSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return StudentExam.objects.filter(user=self.request.user)


class StudentSubjectListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/profile/subjects/ — the authenticated student's
    subject-level interests (active/priority/target), not to be confused
    with apps.practice.Subject (content) or mastery (future Knowledge Engine)."""

    serializer_class = StudentSubjectSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return StudentSubject.objects.filter(user=self.request.user).select_related("exam")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class StudentSubjectDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/profile/subjects/<id>/."""

    serializer_class = StudentSubjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return StudentSubject.objects.filter(user=self.request.user)


class LearningEventListView(generics.ListAPIView):
    """GET /api/profile/learning-events/?event_type=&subject_key=&since=
    — read-only, paginated feed of the authenticated student's own logged
    learning events. Events are written server-side only (see
    apps.profiles.services.record_event); there is no POST here."""

    serializer_class = LearningEventSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = LearningEvent.objects.filter(user=self.request.user)
        event_type = self.request.query_params.get("event_type")
        if event_type:
            qs = qs.filter(event_type=event_type)
        subject_key = self.request.query_params.get("subject_key")
        if subject_key:
            qs = qs.filter(subject_key=subject_key)
        since = self.request.query_params.get("since")
        if since:
            parsed = parse_datetime(since) or parse_date(since)
            if parsed:
                qs = qs.filter(occurred_at__gte=parsed)
        return qs


class LearnerContextView(APIView):
    """GET /api/profile/learner-context/?recent_events_limit=20 — structured
    learner context for the authenticated user, suitable for AI prompt
    construction. See apps.profiles.context.get_learner_context; this view
    is a thin wrapper so non-Python future systems can reach it over HTTP,
    the in-process call is still `get_learner_context(user)` directly."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            limit = min(max(int(request.query_params.get("recent_events_limit", 20)), 0), 100)
        except ValueError:
            limit = 20
        include_events = request.query_params.get("include_events", "true").lower() != "false"
        return Response(get_learner_context(request.user, recent_events_limit=limit, include_events=include_events))


class StudyAvailabilityView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/profile/study-availability/ — the authenticated
    student's own DECLARED study-time preferences. Distinct from observed
    behavior in apps.activity/apps.streaks, which this never reads or writes."""

    serializer_class = StudyAvailabilitySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        availability, _ = StudyAvailability.objects.get_or_create(user=self.request.user)
        return availability


class LearningPreferencesView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/profile/learning-preferences/ — the authenticated
    student's declared pedagogical preferences for the AI Tutor (explanation
    style, hints-before-answers, response language)."""

    serializer_class = LearningPreferencesSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        preferences, _ = LearningPreferences.objects.get_or_create(user=self.request.user)
        return preferences


class ShowcaseUpdateView(APIView):
    """PATCH /api/profile/showcase/ — pin up to 3 unlocked achievements to
    the hero, in display order."""

    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request):
        serializer = ShowcaseUpdateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(ProfileSerializer(request.user.profile, context={"request": request}).data.get("showcase_achievements"))


class PrivacySettingsView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/profile/privacy/ — the authenticated user's own
    visibility toggles for how their profile appears to other users."""

    serializer_class = ProfilePrivacySettingsSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        settings, _ = ProfilePrivacySettings.objects.get_or_create(user=self.request.user)
        return settings
