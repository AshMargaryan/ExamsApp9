from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Conversation, ConversationType
from .permissions import IsConversationParticipant
from .serializers import (
    ConversationSerializer, CreateGroupConversationSerializer, CreatePrivateConversationSerializer,
)
from .services import conversation_service


class ConversationListCreateView(APIView):
    """
    GET /api/chat/conversations/?q=... — the caller's conversations, most
    recently active first.
    POST /api/chat/conversations/ {type: "private", user_id} or
    {type: "group", name, participant_ids} — start/resume a DM, or create a
    group.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        conversations = conversation_service.list_for_user(
            request.user, search=request.query_params.get("q", "")
        )
        return Response(
            ConversationSerializer(conversations, many=True, context={"request": request}).data
        )

    def post(self, request):
        conv_type = request.data.get("type")

        if conv_type == ConversationType.PRIVATE:
            serializer = CreatePrivateConversationSerializer(data=request.data, context={"request": request})
            serializer.is_valid(raise_exception=True)
            conversation, _ = conversation_service.get_or_create_private(
                request.user, serializer.validated_data["user_id"]
            )
        elif conv_type == ConversationType.GROUP:
            serializer = CreateGroupConversationSerializer(data=request.data, context={"request": request})
            serializer.is_valid(raise_exception=True)
            conversation = conversation_service.create_group(
                request.user,
                serializer.validated_data["name"],
                serializer.validated_data["participant_ids"],
            )
        else:
            return Response(
                {"detail": "type-ը պետք է լինի private կամ group։"}, status=status.HTTP_400_BAD_REQUEST
            )

        return Response(
            ConversationSerializer(conversation, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class ConversationDetailView(APIView):
    """GET /api/chat/conversations/<id>/ — a single conversation's header info."""

    permission_classes = [permissions.IsAuthenticated, IsConversationParticipant]

    def get(self, request, pk):
        conversation = get_object_or_404(
            Conversation.objects.prefetch_related("memberships__user__profile"), pk=pk
        )
        self.check_object_permissions(request, conversation)
        conversation_service.attach_summary(conversation, request.user)
        return Response(ConversationSerializer(conversation, context={"request": request}).data)
