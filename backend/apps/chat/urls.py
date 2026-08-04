from django.urls import path

from .views import (
    AttachmentUploadView, ChatAttachmentDownloadView, ConversationDetailView, ConversationListCreateView,
    ConversationParticipantDetailView, ConversationParticipantsView, ConversationReadView, MessageListSendView,
    UnreadCountView,
)

urlpatterns = [
    path("conversations/", ConversationListCreateView.as_view(), name="conversation_list_create"),
    path("conversations/unread-count/", UnreadCountView.as_view(), name="unread_count"),
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
    path("conversations/<int:pk>/messages/", MessageListSendView.as_view(), name="message_list_send"),
    path("conversations/<int:pk>/read/", ConversationReadView.as_view(), name="conversation_read"),
    path("attachments/", AttachmentUploadView.as_view(), name="attachment_upload"),
    path("attachments/<int:pk>/download/", ChatAttachmentDownloadView.as_view(), name="chat_attachment_download"),
]
