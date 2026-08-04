from django.urls import path

from .views import (
    AttachmentUploadView, ChatAttachmentDownloadView, ConversationDetailView, ConversationListCreateView,
    ConversationParticipantDetailView, ConversationParticipantsView, MessageSendView,
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
    path("conversations/<int:pk>/messages/", MessageSendView.as_view(), name="message_send"),
    path("attachments/", AttachmentUploadView.as_view(), name="attachment_upload"),
    path("attachments/<int:pk>/download/", ChatAttachmentDownloadView.as_view(), name="chat_attachment_download"),
]
