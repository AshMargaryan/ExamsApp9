from django.contrib.auth import get_user_model
from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Attachment, Conversation, ConversationType, Message, MessageReport
from .permissions import IsConversationParticipant, IsGroupOwner, is_participant
from .serializers import (
    AddParticipantsSerializer, AttachmentSearchResultSerializer, AttachmentSerializer, AttachmentUploadSerializer,
    ConversationRequestRespondSerializer, ConversationSerializer, CreateGroupConversationSerializer,
    CreatePrivateConversationSerializer, EditMessageSerializer, GroupSettingsSerializer, MessageReportSerializer,
    MessageSearchResultSerializer, MessageSerializer, SendMessageSerializer,
)
from .services import ai_service, conversation_service, group_service, message_service, reaction_service, read_service

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
            try:
                conversation, _ = conversation_service.get_or_create_private(
                    request.user, serializer.validated_data["user_id"]
                )
            except ValueError as e:
                return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        elif conv_type == ConversationType.GROUP:
            serializer = CreateGroupConversationSerializer(data=request.data, context={"request": request})
            serializer.is_valid(raise_exception=True)
            conversation = conversation_service.create_group(
                request.user,
                serializer.validated_data["name"],
                serializer.validated_data["participant_ids"],
                description=serializer.validated_data["description"],
                subject=serializer.validated_data["subject"],
                grade=serializer.validated_data["grade"],
                privacy=serializer.validated_data["privacy"],
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
        if not group_service.is_manager(conversation, request.user):
            return Response(
                {"detail": "Այս գործողությունը հասանելի է միայն խմբի ադմինիստրատորներին։"},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = GroupSettingsSerializer(conversation, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        if "name" in serializer.validated_data:
            group_service.rename(conversation, serializer.validated_data["name"])
        if "image" in serializer.validated_data:
            group_service.update_image(conversation, serializer.validated_data["image"])
        other_fields = {
            k: v for k, v in serializer.validated_data.items() if k in ("description", "subject", "grade", "privacy")
        }
        if other_fields:
            group_service.update_settings(conversation, **other_fields)

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

        messages, has_more = message_service.list_messages(
            conversation, request.user, before_id=before_id, limit=limit
        )
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
                reply_to_id=serializer.validated_data["reply_to_id"],
                context_type=serializer.validated_data["context_type"],
                context_id=serializer.validated_data["context_id"],
            )
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            MessageSerializer(message, context={"request": request}).data, status=status.HTTP_201_CREATED
        )


class MessageDetailView(APIView):
    """
    PATCH /api/chat/messages/<id>/ {text} — edit (sender only, text
    messages only, not after deletion).
    DELETE /api/chat/messages/<id>/ — "delete for everyone" (sender only):
    the message becomes a tombstone visible to all participants, per
    message_service.delete_message_for_everyone.
    """

    permission_classes = [permissions.IsAuthenticated]

    def _get_message(self, request, message_id):
        message = get_object_or_404(Message, pk=message_id)
        if not is_participant(message.conversation_id, request.user):
            raise Http404
        return message

    def patch(self, request, message_id):
        message = self._get_message(request, message_id)
        serializer = EditMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            message = message_service.edit_message(message, request.user, serializer.validated_data["text"])
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(MessageSerializer(message, context={"request": request}).data)

    def delete(self, request, message_id):
        message = self._get_message(request, message_id)
        try:
            message = message_service.delete_message_for_everyone(message, request.user)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(MessageSerializer(message, context={"request": request}).data)


class MessageHideView(APIView):
    """POST /api/chat/messages/<id>/hide/ — "delete for me": no effect on other participants."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, message_id):
        message = get_object_or_404(Message, pk=message_id)
        if not is_participant(message.conversation_id, request.user):
            raise Http404
        message_service.hide_message_for_me(message, request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MessagePinView(APIView):
    """
    POST /api/chat/messages/<id>/pin/ , DELETE to unpin — group owner/admin
    only (spec #33). Pinning a private-conversation message doesn't mean
    anything (no group info panel to surface it in), so it's rejected
    outright rather than silently no-op'd.
    """

    permission_classes = [permissions.IsAuthenticated]

    def _get_message(self, request, message_id):
        message = get_object_or_404(Message, pk=message_id)
        if message.conversation.type != ConversationType.GROUP:
            raise Http404
        # Not-a-participant and not-a-manager must look identical (404
        # either way) — otherwise a 403-vs-404 split leaks which group
        # message ids exist to someone who was never in that conversation.
        if not is_participant(message.conversation_id, request.user):
            raise Http404
        if not group_service.is_manager(message.conversation, request.user):
            return None
        return message

    def post(self, request, message_id):
        message = self._get_message(request, message_id)
        if message is None:
            return Response(
                {"detail": "Այս գործողությունը հասանելի է միայն խմբի ադմինիստրատորներին։"},
                status=status.HTTP_403_FORBIDDEN,
            )
        message = group_service.pin_message(message)
        return Response(MessageSerializer(message, context={"request": request}).data)

    def delete(self, request, message_id):
        message = self._get_message(request, message_id)
        if message is None:
            return Response(
                {"detail": "Այս գործողությունը հասանելի է միայն խմբի ադմինիստրատորներին։"},
                status=status.HTTP_403_FORBIDDEN,
            )
        message = group_service.unpin_message(message)
        return Response(MessageSerializer(message, context={"request": request}).data)


class ConversationPinnedMessagesView(APIView):
    """GET /api/chat/conversations/<id>/pinned/ — every currently-pinned message, newest-pinned first."""

    permission_classes = [permissions.IsAuthenticated, IsConversationParticipant]

    def get(self, request, pk):
        conversation = get_object_or_404(Conversation, pk=pk)
        self.check_object_permissions(request, conversation)
        messages = group_service.list_pinned(conversation)
        return Response(MessageSerializer(messages, many=True, context={"request": request}).data)


class ConversationFilesView(APIView):
    """GET /api/chat/conversations/<id>/files/ — every attachment ever sent in this conversation, newest first."""

    permission_classes = [permissions.IsAuthenticated, IsConversationParticipant]

    def get(self, request, pk):
        conversation = get_object_or_404(Conversation, pk=pk)
        self.check_object_permissions(request, conversation)
        files = conversation.attachments.filter(message__isnull=False).order_by("-uploaded_at")
        return Response(AttachmentSerializer(files, many=True, context={"request": request}).data)


class MessageReportView(APIView):
    """POST /api/chat/messages/<id>/report/ {reason, details?} — flags a message for moderator review."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, message_id):
        message = get_object_or_404(Message, pk=message_id)
        if not is_participant(message.conversation_id, request.user):
            raise Http404
        serializer = MessageReportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        MessageReport.objects.create(
            message=message, reporter=request.user,
            reason=serializer.validated_data["reason"], details=serializer.validated_data["details"],
        )
        return Response(status=status.HTTP_201_CREATED)


class ConversationRequestListView(APIView):
    """GET /api/chat/requests/ — the caller's own pending message requests (see spec #7/#50)."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        conversations = conversation_service.list_requests(request.user)
        return Response(ConversationSerializer(conversations, many=True, context={"request": request}).data)


class ConversationRequestRespondView(APIView):
    """POST /api/chat/requests/<id>/respond/ {action: accept|decline|block}."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        conversation = get_object_or_404(Conversation, pk=pk)
        serializer = ConversationRequestRespondSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            conversation_service.respond_to_request(conversation, request.user, serializer.validated_data["action"])
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MessageForwardView(APIView):
    """
    POST /api/chat/messages/<message_id>/forward/ {conversation_id} — sends
    a copy of an existing message into another conversation. Requires
    participation in both: the source (to have ever seen the message) and
    the target (to send there).
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, message_id):
        message = get_object_or_404(Message, pk=message_id)
        if not is_participant(message.conversation_id, request.user):
            raise Http404

        target = get_object_or_404(Conversation, pk=request.data.get("conversation_id"))
        if not is_participant(target.id, request.user):
            return Response(
                {"detail": "Դուք այս զրույցի մասնակից չեք։"}, status=status.HTTP_403_FORBIDDEN
            )

        forwarded = message_service.forward_message(message, target, request.user)
        return Response(
            MessageSerializer(forwarded, context={"request": request}).data, status=status.HTTP_201_CREATED
        )


class MessageReactionView(APIView):
    """
    POST /api/chat/messages/<message_id>/reactions/ {emoji} — set the
    caller's reaction on a message. Re-sending the same emoji clears it;
    a different emoji replaces it (see reaction_service.set_reaction).
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, message_id):
        message = get_object_or_404(Message, pk=message_id)
        if not is_participant(message.conversation_id, request.user):
            raise Http404

        emoji = request.data.get("emoji")
        if not emoji:
            return Response({"detail": "emoji-ն պարտադիր է։"}, status=status.HTTP_400_BAD_REQUEST)

        message = reaction_service.set_reaction(message, request.user, emoji)
        return Response(MessageSerializer(message, context={"request": request}).data)


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


class AskAIView(APIView):
    """
    POST /api/chat/conversations/<id>/ask-ai/ {message_id} — "Ask Gitus AI"
    on any message in the conversation (a question, a shared result card,
    or just a chat message). Posts the answer back into the SAME
    conversation as a message from the Gitus AI bot user, so it's visible
    to every participant, not just whoever asked (spec #37).
    """

    permission_classes = [permissions.IsAuthenticated, IsConversationParticipant]

    def post(self, request, pk):
        conversation = get_object_or_404(Conversation, pk=pk)
        self.check_object_permissions(request, conversation)

        source_message = get_object_or_404(Message, pk=request.data.get("message_id"), conversation=conversation)
        try:
            ai_message = ai_service.ask_ai(conversation, source_message)
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            MessageSerializer(ai_message, context={"request": request}).data, status=status.HTTP_201_CREATED
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


class ConversationPrefsView(APIView):
    """
    PATCH /api/chat/conversations/<id>/prefs/ {pinned?, muted?} — per-user
    view preferences (see ConversationParticipant.pinned/muted). Any
    participant can set their own; there's nothing here for anyone else to
    touch, so no owner/admin check beyond membership.
    """

    permission_classes = [permissions.IsAuthenticated, IsConversationParticipant]

    def patch(self, request, pk):
        conversation = get_object_or_404(Conversation, pk=pk)
        self.check_object_permissions(request, conversation)

        pinned = request.data.get("pinned")
        muted = request.data.get("muted")
        conversation_service.set_prefs(
            conversation, request.user,
            pinned=bool(pinned) if pinned is not None else None,
            muted=bool(muted) if muted is not None else None,
        )

        conversation_service.attach_summary(conversation, request.user)
        return Response(ConversationSerializer(conversation, context={"request": request}).data)


class ChatSearchView(APIView):
    """
    GET /api/chat/search/?q=... — messages and files across every
    conversation the caller participates in. People/group search reuses
    apps.friends' existing user search and chat's own conversation-name
    filter (listConversations?q=) rather than duplicating that here.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        query = request.query_params.get("q", "").strip()
        if not query:
            return Response({"messages": [], "files": []})

        messages, files = conversation_service.search(request.user, query)
        return Response({
            "messages": MessageSearchResultSerializer(messages, many=True, context={"request": request}).data,
            "files": AttachmentSearchResultSerializer(files, many=True, context={"request": request}).data,
        })


class UnreadCountView(APIView):
    """GET /api/chat/conversations/unread-count/ — total unread across every conversation, for a header badge."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response({"unread_count": conversation_service.total_unread_count(request.user)})
