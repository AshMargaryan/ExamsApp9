from django.urls import path
from .views import HierarchyView, TierQuestionsView, RevealTierView, SubmitTierView

urlpatterns = [
    path("hierarchy/", HierarchyView.as_view(), name="practice-hierarchy"),
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
]
