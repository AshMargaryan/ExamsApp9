"""
Combines system prompt + conversation history + RAG context + attachments
metadata + the current user message into a single AIRequest object. The
provider only ever receives this one final object — it never assembles a
prompt itself.
"""

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
                attachments=self._attachment_metadata(attachments),
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
            AIMessage(role=m.role, content=m.content, attachments=self._attachment_metadata(m.attachments.all()))
            for m in history
        ]

    def _attachment_metadata(self, attachments) -> Optional[list[dict]]:
        if not attachments:
            return None
        return [
            {
                "filename": a.original_filename,
                "attachment_type": a.attachment_type,
                "mime_type": a.mime_type,
            }
            for a in attachments
        ]
