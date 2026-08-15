from django.urls import path

from .views import (
    AskAIView, AttachmentUploadView, ChatAttachmentDownloadView, ChatSearchView, ConversationDetailView,
    ConversationFilesView, ConversationListCreateView, ConversationParticipantDetailView,
    ConversationParticipantsView, ConversationPinnedMessagesView, ConversationPrefsView, ConversationReadView,
    ConversationRequestListView, ConversationRequestRespondView, MessageDetailView, MessageForwardView,
    MessageHideView, MessageListSendView, MessagePinView, MessageReactionView, MessageReportView, UnreadCountView,
)

urlpatterns = [
    path("conversations/", ConversationListCreateView.as_view(), name="conversation_list_create"),
    path("conversations/unread-count/", UnreadCountView.as_view(), name="unread_count"),
    path("search/", ChatSearchView.as_view(), name="chat_search"),
    path("requests/", ConversationRequestListView.as_view(), name="chat_request_list"),
    path("requests/<int:pk>/respond/", ConversationRequestRespondView.as_view(), name="chat_request_respond"),
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
    path("messages/<int:message_id>/", MessageDetailView.as_view(), name="message_detail"),
    path("messages/<int:message_id>/hide/", MessageHideView.as_view(), name="message_hide"),
    path("messages/<int:message_id>/forward/", MessageForwardView.as_view(), name="message_forward"),
    path("messages/<int:message_id>/report/", MessageReportView.as_view(), name="message_report"),
    path("messages/<int:message_id>/pin/", MessagePinView.as_view(), name="message_pin"),
    path("messages/<int:message_id>/reactions/", MessageReactionView.as_view(), name="message_reaction"),
    path("conversations/<int:pk>/read/", ConversationReadView.as_view(), name="conversation_read"),
    path("conversations/<int:pk>/ask-ai/", AskAIView.as_view(), name="chat_ask_ai"),
    path("conversations/<int:pk>/pinned/", ConversationPinnedMessagesView.as_view(), name="chat_pinned_messages"),
    path("conversations/<int:pk>/files/", ConversationFilesView.as_view(), name="chat_conversation_files"),
    path("conversations/<int:pk>/prefs/", ConversationPrefsView.as_view(), name="conversation_prefs"),
    path("attachments/", AttachmentUploadView.as_view(), name="attachment_upload"),
    path("attachments/<int:pk>/download/", ChatAttachmentDownloadView.as_view(), name="chat_attachment_download"),
]
