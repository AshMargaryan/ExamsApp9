import json

import requests
from asgiref.sync import sync_to_async
from django.conf import settings
from django.http import HttpResponse, StreamingHttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .models import Attachment, Conversation, Message, MessageRole
from .permissions import IsConversationOwner, IsMessageOwner
from .serializers import (
    AttachmentSerializer, AttachmentUploadSerializer,
    ConversationRenameSerializer, ConversationSerializer,
    EditMessageSerializer, MessageSerializer, SendMessageSerializer,
    VoiceSynthesizeSerializer,
)
from .services import conversation_service, message_service


async def _sse_stream(event_iterator):
    """Formats a message_service event-dict generator as Server-Sent
    Events.

    This MUST be an async generator, not a plain sync one. Django's ASGI
    handler (StreamingHttpResponse.__aiter__, django/http/response.py)
    async-iterates the response body; handed a sync iterator it falls back
    to `for part in await sync_to_async(list)(self.streaming_content)` —
    which drains the ENTIRE underlying generator (every provider chunk,
    every tool call) into a list FIRST, before sending a single byte to the
    client. That silently defeats streaming end-to-end: the browser would
    see one huge delayed write instead of a live trickle, no matter how
    correct the generator or the frontend renderer are.

    event_iterator itself is a plain sync generator (message_service's DB
    calls and the OpenAI SDK's HTTP client are both synchronous), so each
    next() call is individually bridged via sync_to_async — meaning control
    returns to the event loop, and Daphne can flush the chunk, after every
    single event, not just once the whole response is done.

    next() is wrapped rather than called directly: asyncio's Future
    machinery explicitly forbids a bare StopIteration from crossing a
    sync_to_async boundary ("StopIteration interacts badly with generators
    and cannot be raised into a Future") — so the sentinel below catches
    exhaustion *inside* the sync call, before it ever has to propagate
    through the Future.
    """
    _exhausted = object()

    def _next_or_exhausted(iterator):
        try:
            return next(iterator)
        except StopIteration:
            return _exhausted

    it = iter(event_iterator)
    next_event = sync_to_async(_next_or_exhausted, thread_sensitive=True)
    while True:
        event = await next_event(it)
        if event is _exhausted:
            break
        if event.get("type") == "heartbeat":
            yield b": keep-alive\n\n"
            continue
        yield f"data: {json.dumps(event, default=str)}\n\n".encode("utf-8")


def _sse_response(event_iterator) -> StreamingHttpResponse:
    response = StreamingHttpResponse(_sse_stream(event_iterator), content_type="text/event-stream")
    response["Cache-Control"] = "no-cache"
    # Tells nginx (see nginx/nginx.conf) not to buffer this specific
    # response — the standard per-response alternative to a proxy_buffering
    # off location block, so the SSE bytes reach the browser as they're
    # written instead of only once the connection closes.
    response["X-Accel-Buffering"] = "no"
    return response


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
    # POST bills an OpenAI call; scope covers both verbs on this view since
    # DRF throttles per-view, not per-method — see DEFAULT_THROTTLE_RATES.
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "ai-assistant"

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
            .prefetch_related("attachments", "tool_calls")
        )
        return Response(MessageSerializer(messages, many=True, context={"request": request}).data)

    def post(self, request, conversation_id):
        conversation = self._get_conversation(request, conversation_id)
        serializer = SendMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        event_iterator = message_service.stream_send_message(
            conversation=conversation,
            content=d["content"],
            attachment_ids=d.get("attachment_ids", []),
            educational_context=d.get("educational_context"),
            request=request,
        )
        return _sse_response(event_iterator)


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
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "ai-assistant"

    def post(self, request, pk):
        message = get_object_or_404(Message, pk=pk, conversation__owner=request.user)
        self.check_object_permissions(request, message)
        if message.role != MessageRole.ASSISTANT:
            return Response(
                {"detail": "Only assistant messages can be regenerated."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            event_iterator = message_service.stream_regenerate(message, request=request)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return _sse_response(event_iterator)


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


# ---------------------------------------------------------------------------
# Voice (STT/TTS) — thin proxies to the standalone voice_benchmark sidecar.
# Chosen over embedding faster-whisper/ctranslate2/torch directly in Django:
# keeps the production image light, same pattern already used for Ollama.
# ---------------------------------------------------------------------------

class VoiceTranscribeView(APIView):
    """POST an audio file, get back {"text": "..."} via OpenAI's
    gpt-4o-mini-transcribe, called through the voice sidecar. Deliberately doesn't
    persist the audio or create an Attachment — the transcript just becomes
    normal message text, so no schema change was needed for this first slice.
    """
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "ai-voice"

    def post(self, request):
        audio_file = request.FILES.get("audio")
        if not audio_file:
            return Response({"detail": "Missing 'audio' file."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            response = requests.post(
                f"{settings.VOICE_SERVICE_URL}/api/stt/transcribe",
                files={"audio": (audio_file.name, audio_file.read(), audio_file.content_type)},
                timeout=settings.VOICE_SERVICE_TIMEOUT_SECONDS,
            )
        except requests.RequestException as exc:
            return Response(
                {"detail": f"Voice service unreachable: {exc}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        if not response.ok:
            detail = response.json().get("detail", "Transcription failed") if response.content else "Transcription failed"
            return Response({"detail": detail}, status=status.HTTP_502_BAD_GATEWAY)

        data = response.json()
        return Response({"text": data.get("transcript", "")})


class VoiceSynthesizeView(APIView):
    """POST {"text": ..., "voice": "nova"|"onyx"}, get back playable audio/wav
    bytes via OpenAI TTS (gpt-4o-mini-tts, called by the sidecar, which holds
    the OpenAI key — Django never sees it).
    """
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "ai-voice"

    def post(self, request):
        serializer = VoiceSynthesizeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        try:
            response = requests.post(
                f"{settings.VOICE_SERVICE_URL}/api/tts/synthesize",
                data={"text": d["text"], "voice": d.get("voice", "")},
                timeout=settings.VOICE_SERVICE_TIMEOUT_SECONDS,
            )
        except requests.RequestException as exc:
            return Response(
                {"detail": f"Voice service unreachable: {exc}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        if not response.ok:
            detail = response.json().get("detail", "Speech synthesis failed") if response.content else "Speech synthesis failed"
            return Response({"detail": detail}, status=status.HTTP_502_BAD_GATEWAY)

        return HttpResponse(response.content, content_type="audio/wav")
