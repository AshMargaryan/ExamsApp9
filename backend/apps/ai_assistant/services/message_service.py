from django.utils import timezone

from ..models import Attachment, Conversation, Message, MessageRole, MessageStatus
from . import conversation_service
from .ai_service import AIProviderError, AIService
from .prompt_builder import PromptBuilder
from .rag_service import EducationalContext, RAGService


def _link_attachments(conversation: Conversation, message: Message, attachment_ids: list[int]):
    if not attachment_ids:
        return
    Attachment.objects.filter(
        id__in=attachment_ids, conversation=conversation, message__isnull=True,
    ).update(message=message)


def send_message(
    conversation: Conversation,
    user,
    content: str,
    attachment_ids: list[int] | None = None,
    educational_context: dict | None = None,
) -> tuple[Message, Message]:
    """Creates the user message, runs RAG -> PromptBuilder -> AIService, and
    persists the assistant's reply (or a failed placeholder on error)."""

    context = EducationalContext.from_dict(educational_context)

    user_message = Message.objects.create(
        conversation=conversation,
        role=MessageRole.USER,
        content=content,
        status=MessageStatus.SENT,
        educational_context=context.to_dict() if not context.is_empty() else None,
    )
    _link_attachments(conversation, user_message, attachment_ids or [])

    conversation_service.auto_title_from_first_message(conversation, content)

    assistant_message = _generate_reply(conversation, user_message, context)

    conversation.last_message_at = timezone.now()
    conversation.save(update_fields=["last_message_at", "updated_at"])

    return user_message, assistant_message


def _generate_reply(
    conversation: Conversation, user_message: Message, context: EducationalContext
) -> Message:
    rag_service = RAGService()
    retrieved_chunks = rag_service.build_context(context, user_message.content)

    prompt_builder = PromptBuilder()
    ai_request = prompt_builder.build(
        conversation=conversation,
        user_text=user_message.content,
        educational_context=context,
        retrieved_chunks=retrieved_chunks,
        attachments=list(user_message.attachments.all()),
    )

    ai_service = AIService()
    try:
        ai_response, response_time_ms = ai_service.generate(ai_request)
    except AIProviderError as exc:
        return Message.objects.create(
            conversation=conversation,
            role=MessageRole.ASSISTANT,
            content="",
            status=MessageStatus.FAILED,
            error_message=str(exc)[:500],
            provider=ai_service.provider.name,
        )

    return Message.objects.create(
        conversation=conversation,
        role=MessageRole.ASSISTANT,
        content=ai_response.content,
        status=MessageStatus.SENT,
        model_used=ai_response.model_used,
        provider=ai_service.provider.name,
        response_time_ms=response_time_ms,
        token_usage=ai_response.token_usage,
        educational_context=context.to_dict() if not context.is_empty() else None,
    )


def regenerate(assistant_message: Message) -> Message:
    """Creates a new assistant Message replacing the given one, reusing the
    preceding user message's content and stored educational context."""

    conversation = assistant_message.conversation
    preceding_user_message = (
        conversation.messages
        .filter(role=MessageRole.USER, created_at__lt=assistant_message.created_at)
        .order_by("-created_at")
        .first()
    )
    if preceding_user_message is None:
        raise ValueError("No preceding user message to regenerate a response for.")

    context = EducationalContext.from_dict(preceding_user_message.educational_context)
    new_message = _generate_reply(conversation, preceding_user_message, context)
    new_message.regenerated_from = assistant_message
    new_message.save(update_fields=["regenerated_from"])

    assistant_message.is_active_response = False
    assistant_message.save(update_fields=["is_active_response"])

    conversation.last_message_at = timezone.now()
    conversation.save(update_fields=["last_message_at", "updated_at"])

    return new_message


def edit_message(message: Message, new_content: str) -> Message:
    message.content = new_content
    message.edited_at = timezone.now()
    message.save(update_fields=["content", "edited_at"])
    return message


def delete_message(message: Message) -> None:
    message.delete()
