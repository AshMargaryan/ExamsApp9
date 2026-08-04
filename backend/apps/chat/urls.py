from django.urls import path

from .views import (
    ConversationDetailView, ConversationListCreateView,
    ConversationParticipantDetailView, ConversationParticipantsView,
)

urlpatterns = [
    path("conversations/", ConversationListCreateView.as_view(), name="conversation_list_create"),
    path("conversations/<int:pk>/", ConversationDetailView.as_view(), name="conversation_detail"),
    path(
        "conversations/<int:pk>/participants/",
        ConversationParticipantsView.as_view(),
        name="conversation_participants",
    ),
    path(
        "conversations/<int:pk>/participants/<int:user_id>/",
        ConversationParticipantDetailView.as_view(),
        name="conversation_participant_detail",
    ),
]
