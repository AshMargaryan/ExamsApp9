from django.urls import path

from .views import (
    AchievementListView,
    MyAchievementsListView,
    ProfileMeView,
    UserAchievementsListView,
    UserProfileDetailView,
)

urlpatterns = [
    path("me/", ProfileMeView.as_view(), name="profile_me"),
    path("achievements/", AchievementListView.as_view(), name="achievement_list"),
    path("achievements/mine/", MyAchievementsListView.as_view(), name="my_achievements"),
    path("<int:user_id>/achievements/", UserAchievementsListView.as_view(), name="user_achievements"),
    path("<int:user_id>/", UserProfileDetailView.as_view(), name="profile_detail"),
]
