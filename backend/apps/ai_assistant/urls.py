from django.urls import path

from .views import (
    AttachmentDetailView, AttachmentUploadView,
    ConversationActionView, ConversationDetailView, ConversationListCreateView,
    MessageDetailView, MessageListSendView, MessageRegenerateView,
)

urlpatterns = [
    path("conversations/", ConversationListCreateView.as_view(), name="assistant-conversation-list"),
    path("conversations/<int:pk>/", ConversationDetailView.as_view(), name="assistant-conversation-detail"),
    path(
        "conversations/<int:conversation_id>/messages/",
        MessageListSendView.as_view(), name="assistant-message-list-send",
    ),
    path(
        "conversations/<int:pk>/<str:action>/",
        ConversationActionView.as_view(), name="assistant-conversation-action",
    ),
    path("messages/<int:pk>/", MessageDetailView.as_view(), name="assistant-message-detail"),
    path("messages/<int:pk>/regenerate/", MessageRegenerateView.as_view(), name="assistant-message-regenerate"),
    path("attachments/", AttachmentUploadView.as_view(), name="assistant-attachment-upload"),
    path("attachments/<int:pk>/", AttachmentDetailView.as_view(), name="assistant-attachment-detail"),
]
