"""
Combines system prompt + conversation history + RAG context + attachments
metadata + the current user message into a single AIRequest object. The
provider only ever receives this one final object — it never assembles a
prompt itself.
"""

import base64
from typing import Optional

from django.conf import settings

from ..models import Conversation, MessageRole, MessageStatus
from ..prompts import BASE_SYSTEM_PROMPT, CONVERSATION_MODE_FRAMING
from ..providers.base import AIMessage, AIRequest
from .rag_service import ContextChunk, EducationalContext


class PromptBuilder:
    def build(
        self,
        conversation: Conversation,
        user_text: str,
        educational_context: EducationalContext,
        retrieved_chunks: list[ContextChunk],
        attachments: Optional[list] = None,
        tool_results: Optional[list[dict]] = None,
    ) -> AIRequest:
        system_prompt = self._build_system_prompt(educational_context, retrieved_chunks)
        messages = self._history_messages(conversation)
        messages.append(
            AIMessage(
                role=MessageRole.USER,
                content=user_text,
                attachments=self._attachment_metadata(attachments, embed_images=True),
            )
        )
        if tool_results:
            for result in tool_results:
                messages.append(AIMessage(role=MessageRole.TOOL, content=str(result)))

        return AIRequest(
            messages=messages,
            system_prompt=system_prompt,
            educational_context=educational_context.to_dict()
            if not educational_context.is_empty()
            else None,
        )

    def _build_system_prompt(
        self, context: EducationalContext, chunks: list[ContextChunk]
    ) -> str:
        parts = [BASE_SYSTEM_PROMPT]

        if context.conversation_mode and context.conversation_mode in CONVERSATION_MODE_FRAMING:
            parts.append(CONVERSATION_MODE_FRAMING[context.conversation_mode])

        if chunks:
            parts.append("--- Educational context ---")
            parts.extend(chunk.to_prompt_text() for chunk in chunks)
            parts.append("--- End of educational context ---")

        return "\n\n".join(parts)

    def _history_messages(self, conversation: Conversation) -> list[AIMessage]:
        window = getattr(settings, "AI_ASSISTANT_HISTORY_WINDOW", 20)
        history = list(
            conversation.messages
            .filter(is_active_response=True, status=MessageStatus.SENT)
            .exclude(role=MessageRole.SYSTEM)
            .prefetch_related("attachments")
            .order_by("-created_at")[:window]
        )
        history.reverse()
        return [
            # embed_images=False: re-encoding every past image on every turn would
            # multiply token cost with conversation length. Only the newest
            # message's images are ever sent as pixels (see build()) — if the
            # model needs to see an older photo again, it'll ask the student to
            # resend it rather than silently losing track of it.
            AIMessage(
                role=m.role, content=m.content,
                attachments=self._attachment_metadata(m.attachments.all(), embed_images=False),
            )
            for m in history
        ]

    def _attachment_metadata(self, attachments, embed_images: bool) -> Optional[list[dict]]:
        if not attachments:
            return None
        return [
            {
                "filename": a.original_filename,
                "attachment_type": a.attachment_type,
                "mime_type": a.mime_type,
                "data_url": self._image_data_url(a) if embed_images else None,
            }
            for a in attachments
        ]

    def _image_data_url(self, attachment) -> Optional[str]:
        """Base64 data URI for image attachments only, so a vision-capable
        provider can actually see them — capped so a huge upload doesn't
        blow up the request instead of silently degrading to text-only."""
        if attachment.attachment_type != "image":
            return None
        max_bytes = getattr(settings, "AI_ASSISTANT_MAX_VISION_IMAGE_MB", 10) * 1024 * 1024
        if attachment.size > max_bytes:
            return None
        with attachment.file.open("rb") as f:
            encoded = base64.b64encode(f.read()).decode("ascii")
        return f"data:{attachment.mime_type};base64,{encoded}"
