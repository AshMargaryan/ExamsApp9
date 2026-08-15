from django.urls import path

from .views import CancelChallengeView, ListChallengesView, RespondChallengeView, SendChallengeView

urlpatterns = [
    path("", ListChallengesView.as_view(), name="challenge_list"),
    path("send/", SendChallengeView.as_view(), name="challenge_send"),
    path("<int:pk>/respond/", RespondChallengeView.as_view(), name="challenge_respond"),
    path("<int:pk>/", CancelChallengeView.as_view(), name="challenge_cancel"),
]
