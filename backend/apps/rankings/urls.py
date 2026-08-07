from django.urls import path

from .views import (
    ClassRankingView,
    GlobalRankingView,
    MyRankingAwardsView,
    SchoolComparisonView,
    SchoolRankingView,
    UserRankingAwardsView,
)

urlpatterns = [
    path("global/", GlobalRankingView.as_view(), name="ranking_global"),
    path("school/", SchoolRankingView.as_view(), name="ranking_school"),
    path("class/", ClassRankingView.as_view(), name="ranking_class"),
    path("schools/", SchoolComparisonView.as_view(), name="ranking_schools"),
    path("awards/mine/", MyRankingAwardsView.as_view(), name="my_ranking_awards"),
    path("awards/<int:user_id>/", UserRankingAwardsView.as_view(), name="user_ranking_awards"),
]
