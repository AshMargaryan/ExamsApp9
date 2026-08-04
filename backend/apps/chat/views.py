from django.contrib.auth import get_user_model
from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Attachment, Conversation, ConversationType
from .permissions import IsConversationParticipant, IsGroupOwner, is_participant
from .serializers import (
    AddParticipantsSerializer, AttachmentSerializer, AttachmentUploadSerializer, ConversationSerializer,
    CreateGroupConversationSerializer, CreatePrivateConversationSerializer, GroupSettingsSerializer,
    MessageSerializer, SendMessageSerializer,
)
from .services import conversation_service, group_service, message_service, read_service

User = get_user_model()


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
    """
    GET /api/chat/conversations/<id>/ — a single conversation's header info.
    PATCH — group name/image (owner only, group only).
    """

    permission_classes = [permissions.IsAuthenticated, IsConversationParticipant]
    parser_classes = [MultiPartParser, FormParser, *APIView.parser_classes]

    def _get_conversation(self, request, pk):
        conversation = get_object_or_404(
            Conversation.objects.prefetch_related("memberships__user__profile"), pk=pk
        )
        self.check_object_permissions(request, conversation)
        return conversation

    def get(self, request, pk):
        conversation = self._get_conversation(request, pk)
        conversation_service.attach_summary(conversation, request.user)
        return Response(ConversationSerializer(conversation, context={"request": request}).data)

    def patch(self, request, pk):
        conversation = self._get_conversation(request, pk)
        if conversation.type != ConversationType.GROUP:
            return Response(
                {"detail": "Միայն խմբերն ունեն անուն/նկար։"}, status=status.HTTP_400_BAD_REQUEST
            )
        if not group_service.is_owner(conversation, request.user):
            return Response(
                {"detail": "Այս գործողությունը հասանելի է միայն խմբի սեփականատիրոջը։"},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = GroupSettingsSerializer(conversation, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        if "name" in serializer.validated_data:
            group_service.rename(conversation, serializer.validated_data["name"])
        if "image" in serializer.validated_data:
            group_service.update_image(conversation, serializer.validated_data["image"])

        return Response(ConversationSerializer(conversation, context={"request": request}).data)


class ConversationParticipantsView(APIView):
    """POST /api/chat/conversations/<id>/participants/ {user_ids: [...]} — owner adds members to a group."""

    permission_classes = [permissions.IsAuthenticated, IsConversationParticipant, IsGroupOwner]

    def post(self, request, pk):
        conversation = get_object_or_404(Conversation, pk=pk)
        self.check_object_permissions(request, conversation)
        if conversation.type != ConversationType.GROUP:
            return Response(
                {"detail": "Մասնակիցներ կարելի է ավելացնել միայն խմբերում։"}, status=status.HTTP_400_BAD_REQUEST
            )

        serializer = AddParticipantsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        group_service.add_participants(conversation, serializer.validated_data["user_ids"])

        conversation_service.attach_summary(conversation, request.user)
        return Response(
            ConversationSerializer(conversation, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class ConversationParticipantDetailView(APIView):
    """
    DELETE /api/chat/conversations/<id>/participants/<user_id>/ — remove a
    member. The owner can remove anyone; anyone can remove themselves
    (leave the group).
    """

    permission_classes = [permissions.IsAuthenticated, IsConversationParticipant]

    def delete(self, request, pk, user_id):
        conversation = get_object_or_404(Conversation, pk=pk)
        self.check_object_permissions(request, conversation)
        if conversation.type != ConversationType.GROUP:
            return Response(
                {"detail": "Մասնակիցներ կարելի է հեռացնել միայն խմբերից։"}, status=status.HTTP_400_BAD_REQUEST
            )

        is_self = user_id == request.user.id
        if not is_self and not group_service.is_owner(conversation, request.user):
            return Response(
                {"detail": "Այս գործողությունը հասանելի է միայն խմբի սեփականատիրոջը։"},
                status=status.HTTP_403_FORBIDDEN,
            )

        target = get_object_or_404(User, pk=user_id)
        group_service.remove_participant(conversation, target)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MessageListSendView(APIView):
    """
    GET /api/chat/conversations/<id>/messages/?before=<message_id>&limit=30
    — cursor-paginated history (newest page by default; pass the oldest
    loaded message's id as `before` to load older ones for infinite
    scroll). See message_service.list_messages for why this isn't
    PageNumberPagination.

    POST {text?, attachment_ids?} — REST fallback for sending (e.g. right
    after an attachment upload, or for a client that isn't
    WebSocket-connected). Calls the exact same message_service.send_message
    as ChatConsumer, so a message sent this way still broadcasts live to
    everyone connected via WebSocket.
    """

    permission_classes = [permissions.IsAuthenticated, IsConversationParticipant]

    def _get_conversation(self, request, pk):
        conversation = get_object_or_404(Conversation, pk=pk)
        self.check_object_permissions(request, conversation)
        return conversation

    def get(self, request, pk):
        conversation = self._get_conversation(request, pk)

        before = request.query_params.get("before")
        try:
            before_id = int(before) if before is not None else None
            limit = int(request.query_params.get("limit", message_service.DEFAULT_PAGE_SIZE))
        except ValueError:
            return Response({"detail": "before/limit-ը պետք է լինեն թվեր։"}, status=status.HTTP_400_BAD_REQUEST)

        messages, has_more = message_service.list_messages(conversation, before_id=before_id, limit=limit)
        return Response({
            "results": MessageSerializer(messages, many=True, context={"request": request}).data,
            "has_more": has_more,
        })

    def post(self, request, pk):
        conversation = self._get_conversation(request, pk)

        serializer = SendMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            message = message_service.send_message(
                conversation, request.user,
                text=serializer.validated_data["text"],
                attachment_ids=serializer.validated_data["attachment_ids"],
            )
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            MessageSerializer(message, context={"request": request}).data, status=status.HTTP_201_CREATED
        )


class AttachmentUploadView(APIView):
    """
    POST /api/chat/attachments/ (multipart: conversation, file) — validated
    upload, independent of any Message (see Attachment model docstring for
    the "upload first, attach on send" flow). Requires the uploader to
    already be a participant of the target conversation.
    """

    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        serializer = AttachmentUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        conversation = d["conversation"]
        if not is_participant(conversation.id, request.user):
            return Response(
                {"detail": "Դուք այս զրույցի մասնակից չեք։"}, status=status.HTTP_403_FORBIDDEN
            )

        uploaded_file = d["file"]
        attachment = Attachment.objects.create(
            conversation=conversation,
            uploaded_by=request.user,
            file=uploaded_file,
            original_filename=uploaded_file.name,
            mime_type=d["mime_type"],
            file_size=uploaded_file.size,
            file_type=d["file_type"],
        )
        return Response(
            AttachmentSerializer(attachment, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class ChatAttachmentDownloadView(APIView):
    """
    GET /api/chat/attachments/<id>/download/ — the only sanctioned way to
    read an attachment's bytes (see AttachmentSerializer.get_download_url).
    Enforces requirement #7 itself instead of relying on an unguessable
    storage path: any active participant of the conversation may download
    once it's attached to a sent message; before that, only the uploader
    can (it's still just a draft they might discard).
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        attachment = get_object_or_404(Attachment, pk=pk)

        if attachment.message_id is None:
            allowed = attachment.uploaded_by_id == request.user.id
        else:
            allowed = is_participant(attachment.conversation_id, request.user)
        if not allowed:
            raise Http404

        return FileResponse(
            attachment.file.open("rb"), filename=attachment.original_filename, content_type=attachment.mime_type,
        )


class ConversationReadView(APIView):
    """
    POST /api/chat/conversations/<id>/read/ {message_id?} — REST
    equivalent of ChatConsumer's "read" action, for marking read without a
    live WebSocket connection (e.g. from a conversation-list preview).
    Omit message_id to mark everything read.
    """

    permission_classes = [permissions.IsAuthenticated, IsConversationParticipant]

    def post(self, request, pk):
        conversation = get_object_or_404(Conversation, pk=pk)
        self.check_object_permissions(request, conversation)

        message_id = request.data.get("message_id")
        read_service.mark_read(conversation, request.user, up_to_message_id=message_id)

        conversation_service.attach_summary(conversation, request.user)
        return Response(ConversationSerializer(conversation, context={"request": request}).data)


class UnreadCountView(APIView):
    """GET /api/chat/conversations/unread-count/ — total unread across every conversation, for a header badge."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response({"unread_count": conversation_service.total_unread_count(request.user)})
