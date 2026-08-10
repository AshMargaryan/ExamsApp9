from django.urls import path
from .views import (
    HierarchyView, SubtopicMaterialView,
    TierQuestionsView, RevealTierView, SubmitTierView,
    RecommendedExercisesView, WeeklyProgressView, DailyProblemView,
    PronounceView, TranslateView,
)

urlpatterns = [
    path("hierarchy/", HierarchyView.as_view(), name="practice-hierarchy"),
    path("pronounce/", PronounceView.as_view(), name="practice-pronounce"),
    path("translate/", TranslateView.as_view(), name="practice-translate"),
    path(
        "subtopics/<int:subtopic_id>/material/",
        SubtopicMaterialView.as_view(), name="practice-subtopic-material",
    ),
    path(
        "subtopics/<int:subtopic_id>/<str:tier>/questions/",
        TierQuestionsView.as_view(), name="practice-tier-questions",
    ),
    path(
        "subtopics/<int:subtopic_id>/<str:tier>/reveal/",
        RevealTierView.as_view(), name="practice-tier-reveal",
    ),
    path(
        "subtopics/<int:subtopic_id>/<str:tier>/submit/",
        SubmitTierView.as_view(), name="practice-tier-submit",
    ),
    path(
        "dashboard/recommended/",
        RecommendedExercisesView.as_view(), name="practice-dashboard-recommended",
    ),
    path(
        "dashboard/weekly-progress/",
        WeeklyProgressView.as_view(), name="practice-dashboard-weekly-progress",
    ),
    path("daily-problem/", DailyProblemView.as_view(), name="practice-daily-problem"),
]
