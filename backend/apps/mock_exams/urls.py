from django.urls import path

from .views import (
    ListMockExamsView, OverviewView, ExamAttemptHistoryView, StartAttemptView,
    AttemptDetailView, SaveDraftView, FinishAttemptView, AttemptResultsView, AttemptAutopsyView,
    AbandonAttemptView, QuestionHintViewedView,
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
    path("attempts/<int:pk>/autopsy/", AttemptAutopsyView.as_view(), name="mock-exam-attempt-autopsy"),
    path("attempts/<int:pk>/abandon/", AbandonAttemptView.as_view(), name="mock-exam-attempt-abandon"),
    path(
        "questions/<int:question_id>/hint-viewed/",
        QuestionHintViewedView.as_view(), name="mock-exam-question-hint-viewed",
    ),
]
