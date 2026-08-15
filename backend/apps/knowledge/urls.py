from django.urls import path

from .views import SubjectMasteryListView, TopicMasteryListView

urlpatterns = [
    path("subjects/", SubjectMasteryListView.as_view(), name="knowledge_subject_mastery"),
    path("topics/", TopicMasteryListView.as_view(), name="knowledge_topic_mastery"),
]
