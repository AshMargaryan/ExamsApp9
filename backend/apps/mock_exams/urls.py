from django.urls import path

from .views import (
    ListMockExamsView, OverviewView, ExamAttemptHistoryView, StartAttemptView,
    AttemptDetailView, SaveDraftView, FinishAttemptView, AttemptResultsView,
)

urlpatterns = [
    path("exams/", ListMockExamsView.as_view(), name="mock-exams-list"),
    path("overview/", OverviewView.as_view(), name="mock-exams-overview"),
    path("exams/<int:exam_id>/attempts/", ExamAttemptHistoryView.as_view(), name="mock-exam-attempt-history"),
    path("exams/<int:exam_id>/start/", StartAttemptView.as_view(), name="mock-exam-start"),
    path("attempts/<int:pk>/", AttemptDetailView.as_view(), name="mock-exam-attempt-detail"),
    path("attempts/<int:pk>/draft/", SaveDraftView.as_view(), name="mock-exam-attempt-draft"),
    path("attempts/<int:pk>/finish/", FinishAttemptView.as_view(), name="mock-exam-attempt-finish"),
    path("attempts/<int:pk>/results/", AttemptResultsView.as_view(), name="mock-exam-attempt-results"),
]
