from django.urls import path

from .views import AchievementListView, MyAchievementsListView, ProfileMeView

urlpatterns = [
    path("me/", ProfileMeView.as_view(), name="profile_me"),
    path("achievements/", AchievementListView.as_view(), name="achievement_list"),
    path("achievements/mine/", MyAchievementsListView.as_view(), name="my_achievements"),
]
