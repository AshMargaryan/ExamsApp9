from django.urls import path

from .views import MyStreakView

urlpatterns = [
    path("me/", MyStreakView.as_view(), name="streak_me"),
]
