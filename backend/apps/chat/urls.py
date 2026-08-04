from django.urls import path

from .views import ConversationDetailView, ConversationListCreateView

urlpatterns = [
    path("conversations/", ConversationListCreateView.as_view(), name="conversation_list_create"),
    path("conversations/<int:pk>/", ConversationDetailView.as_view(), name="conversation_detail"),
]
