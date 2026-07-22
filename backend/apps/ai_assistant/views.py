from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Attachment, Conversation, Message, MessageRole
from .permissions import IsConversationOwner, IsMessageOwner
from .serializers import (
    AttachmentSerializer, AttachmentUploadSerializer,
    ConversationRenameSerializer, ConversationSerializer,
    EditMessageSerializer, MessageSerializer,
    SendMessageResponseSerializer, SendMessageSerializer,
)
from .services import conversation_service, message_service


# ---------------------------------------------------------------------------
# Conversations
# ---------------------------------------------------------------------------

class ConversationListCreateView(generics.ListCreateAPIView):
    """GET /api/assistant/conversations/?q=&archived=  |  POST to create."""
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        archived_param = self.request.query_params.get("archived")
        archived = None
        if archived_param is not None:
            archived = archived_param.lower() == "true"
        return conversation_service.list_for_user(
            self.request.user,
            search=self.request.query_params.get("q", ""),
            archived=archived,
        )

    def perform_create(self, serializer):
        conversation = conversation_service.create(self.request.user)
        serializer.instance = conversation


class ConversationDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET (retrieve) / PATCH (rename, {"title": ...}) / DELETE (soft delete)."""
    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated, IsConversationOwner]

    def get_queryset(self):
        return Conversation.objects.filter(owner=self.request.user)

    def patch(self, request, *args, **kwargs):
        conversation = self.get_object()
        serializer = ConversationRenameSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        conversation_service.rename(conversation, serializer.validated_data["title"])
        return Response(ConversationSerializer(conversation).data)

    def destroy(self, request, *args, **kwargs):
        conversation = self.get_object()
        conversation_service.soft_delete(conversation)
        return Response(status=status.HTTP_204_NO_CONTENT)


class ConversationActionView(APIView):
    """POST /conversations/<id>/<action>/ for restore/archive/unarchive/pin/unpin."""
    permission_classes = [permissions.IsAuthenticated, IsConversationOwner]

    ACTIONS = {
        "restore": conversation_service.restore,
        "archive": conversation_service.archive,
        "unarchive": conversation_service.unarchive,
        "pin": conversation_service.pin,
        "unpin": conversation_service.unpin,
    }

    def post(self, request, pk, action):
        handler = self.ACTIONS.get(action)
        if handler is None:
            return Response({"detail": "Unknown action."}, status=status.HTTP_404_NOT_FOUND)

        manager = Conversation.all_objects if action == "restore" else Conversation.objects
        conversation = get_object_or_404(manager, pk=pk, owner=request.user)
        self.check_object_permissions(request, conversation)

        handler(conversation)
        return Response(ConversationSerializer(conversation).data)


# ---------------------------------------------------------------------------
# Messages
# ---------------------------------------------------------------------------

class MessageListSendView(APIView):
    """GET (paginated-ish list of active messages) / POST (send a message)."""
    permission_classes = [permissions.IsAuthenticated]

    def _get_conversation(self, request, conversation_id):
        conversation = get_object_or_404(
            Conversation.objects.filter(owner=request.user), pk=conversation_id
        )
        return conversation

    def get(self, request, conversation_id):
        conversation = self._get_conversation(request, conversation_id)
        messages = (
            conversation.messages
            .filter(is_active_response=True)
            .prefetch_related("attachments")
        )
        return Response(MessageSerializer(messages, many=True, context={"request": request}).data)

    def post(self, request, conversation_id):
        conversation = self._get_conversation(request, conversation_id)
        serializer = SendMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        user_message, assistant_message = message_service.send_message(
            conversation=conversation,
            user=request.user,
            content=d["content"],
            attachment_ids=d.get("attachment_ids", []),
            educational_context=d.get("educational_context"),
        )
        response_data = SendMessageResponseSerializer(
            {"user_message": user_message, "assistant_message": assistant_message},
            context={"request": request},
        ).data
        return Response(response_data, status=status.HTTP_201_CREATED)


class MessageDetailView(APIView):
    """PATCH (edit user message content) / DELETE."""
    permission_classes = [permissions.IsAuthenticated, IsMessageOwner]

    def _get_message(self, request, pk):
        message = get_object_or_404(Message, pk=pk, conversation__owner=request.user)
        self.check_object_permissions(request, message)
        return message

    def patch(self, request, pk):
        message = self._get_message(request, pk)
        if message.role != MessageRole.USER:
            return Response(
                {"detail": "Only user messages can be edited."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = EditMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        message_service.edit_message(message, serializer.validated_data["content"])
        return Response(MessageSerializer(message, context={"request": request}).data)

    def delete(self, request, pk):
        message = self._get_message(request, pk)
        message_service.delete_message(message)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MessageRegenerateView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsMessageOwner]

    def post(self, request, pk):
        message = get_object_or_404(Message, pk=pk, conversation__owner=request.user)
        self.check_object_permissions(request, message)
        if message.role != MessageRole.ASSISTANT:
            return Response(
                {"detail": "Only assistant messages can be regenerated."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            new_message = message_service.regenerate(message)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(
            MessageSerializer(new_message, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


# ---------------------------------------------------------------------------
# Attachments
# ---------------------------------------------------------------------------

class AttachmentUploadView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        serializer = AttachmentUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        conversation = d["conversation"]
        if conversation.owner_id != request.user.id:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        uploaded_file = d["file"]
        attachment = Attachment.objects.create(
            owner=request.user,
            conversation=conversation,
            file=uploaded_file,
            original_filename=uploaded_file.name,
            mime_type=d["mime_type"],
            size=uploaded_file.size,
            attachment_type=d["attachment_type"],
        )
        return Response(
            AttachmentSerializer(attachment, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class AttachmentDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, pk):
        attachment = get_object_or_404(Attachment, pk=pk, owner=request.user)
        if attachment.message_id is not None:
            return Response(
                {"detail": "Cannot delete an attachment already sent in a message."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        attachment.file.delete(save=False)
        attachment.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
