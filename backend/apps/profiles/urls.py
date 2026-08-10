from django.urls import path

from .views import (
    AchievementListView,
    ActivityHeatmapView,
    HomeInsightView,
    MyAchievementsListView,
    PersonalGoalDetailView,
    PersonalGoalListCreateView,
    PrivacySettingsView,
    ProfileAnalyticsView,
    ProfileMeView,
    ShowcaseUpdateView,
    SkillMapView,
    TimelineView,
    UserAchievementsListView,
    UserProfileDetailView,
)

urlpatterns = [
    path("me/", ProfileMeView.as_view(), name="profile_me"),
    path("analytics/", ProfileAnalyticsView.as_view(), name="profile_analytics"),
    path("home-insight/", HomeInsightView.as_view(), name="profile_home_insight"),
    path("skill-map/<str:subject_key>/", SkillMapView.as_view(), name="profile_skill_map"),
    path("activity-heatmap/", ActivityHeatmapView.as_view(), name="profile_activity_heatmap"),
    path("timeline/", TimelineView.as_view(), name="profile_timeline"),
    path("goals/", PersonalGoalListCreateView.as_view(), name="profile_goals"),
    path("goals/<int:pk>/", PersonalGoalDetailView.as_view(), name="profile_goal_detail"),
    path("showcase/", ShowcaseUpdateView.as_view(), name="profile_showcase"),
    path("privacy/", PrivacySettingsView.as_view(), name="profile_privacy"),
    path("achievements/", AchievementListView.as_view(), name="achievement_list"),
    path("achievements/mine/", MyAchievementsListView.as_view(), name="my_achievements"),
    path("<int:user_id>/achievements/", UserAchievementsListView.as_view(), name="user_achievements"),
    path("<int:user_id>/", UserProfileDetailView.as_view(), name="profile_detail"),
]
