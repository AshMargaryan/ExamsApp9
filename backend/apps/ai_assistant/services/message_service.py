import json
from typing import Iterator

from django.utils import timezone

from apps.mock_exams.models import MockExamSubject
from apps.profiles.models import LearningEventType
from apps.profiles.services import record_event

from ..models import (
    Attachment, Conversation, Message, MessageRole, MessageStatus,
    ToolCall, ToolCallStatus,
)
from ..providers.base import AIMessage
from ..serializers import MessageSerializer
from ..tools import registry as tool_registry
from . import conversation_service
from .ai_service import AIProviderError, AIService
from .prompt_builder import PromptBuilder
from .rag_service import EducationalContext, RAGService

# Hard cap on tool round-trips within a single turn, so a model that keeps
# requesting tools (buggy provider, bad prompt) can't loop forever.
MAX_TOOL_ITERATIONS = 3

# Conversation modes that represent a distinct, nameable learning event with
# no other structured home (see apps.profiles.models.LearningEvent). Modes
# not listed here (solving_question, learning, revision, general_chat,
# homework_solver) are the default chat experience, not a discrete event.
_MODE_TO_EVENT_TYPE = {
    "explain_mode": LearningEventType.EXPLANATION_REQUESTED,
    "why_am_i_wrong": LearningEventType.EXPLANATION_REQUESTED,
    "teach_it_to_me": LearningEventType.CONCEPT_REVIEWED,
}


def _record_learning_event(user, context: "EducationalContext", assistant_message: Message) -> None:
    event_type = _MODE_TO_EVENT_TYPE.get(context.conversation_mode)
    if event_type is None or assistant_message.status != MessageStatus.SENT:
        return
    subject_key = context.subject if context.subject in MockExamSubject.values else ""
    record_event(
        user, event_type,
        subject_key=subject_key, topic_label=context.topic or "", source="ai_assistant",
        target_id=assistant_message.id, metadata={"conversation_mode": context.conversation_mode},
    )


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
    _record_learning_event(user, context, assistant_message)

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
    executed_tool_calls = []

    for _iteration in range(MAX_TOOL_ITERATIONS):
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

        if not ai_response.tool_calls:
            break

        ai_request.messages.append(
            AIMessage(role=MessageRole.ASSISTANT, content=ai_response.content or "",
                      tool_calls=ai_response.tool_calls)
        )
        for call in ai_response.tool_calls:
            arguments = call.get("arguments") or {}
            result = tool_registry.execute(call["name"], arguments, user=conversation.owner)
            status = (
                ToolCallStatus.ERROR if isinstance(result, dict) and "error" in result
                else ToolCallStatus.SUCCESS
            )
            executed_tool_calls.append({
                "tool_name": call["name"], "arguments": arguments,
                "result": result, "status": status,
            })
            ai_request.messages.append(
                AIMessage(role=MessageRole.TOOL, content=json.dumps(result, default=str),
                          tool_call_id=call.get("id"))
            )
    else:
        # Exhausted MAX_TOOL_ITERATIONS still requesting tools — force a
        # final plain-text answer so the turn always terminates.
        ai_request.tools = None
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

    assistant_message = Message.objects.create(
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
    if executed_tool_calls:
        ToolCall.objects.bulk_create([
            ToolCall(
                message=assistant_message, tool_name=tc["tool_name"],
                arguments=tc["arguments"], result=tc["result"], status=tc["status"],
            )
            for tc in executed_tool_calls
        ])
    return assistant_message


def _serialize_message(message: Message, request=None) -> dict:
    return MessageSerializer(message, context={"request": request}).data


def stream_send_message(
    conversation: Conversation,
    content: str,
    attachment_ids: list[int] | None = None,
    educational_context: dict | None = None,
    request=None,
) -> Iterator[dict]:
    """Streaming counterpart to send_message(): same persistence sequence,
    but yields SSE-shaped event dicts as the reply is generated instead of
    returning only once it's complete."""

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

    yield {"type": "user_message", "message": _serialize_message(user_message, request)}
    yield from _stream_reply(conversation, user_message, context, request=request)


def _resolve_regenerate_target(assistant_message: Message) -> tuple[Conversation, Message, EducationalContext]:
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
    return conversation, preceding_user_message, context


def stream_regenerate(assistant_message: Message, request=None) -> Iterator[dict]:
    """Streaming counterpart to regenerate(): same preceding-user-message
    lookup and is_active_response handoff, streamed instead of awaited.

    Deliberately NOT a generator function itself (no `yield` in this body) —
    a generator function defers *all* of its code, including the ValueError
    lookup below, until first iteration, which would be too late for the
    view to still respond 400 instead of starting a 200 SSE stream. Doing
    the validation eagerly here and only returning (not yielding from) the
    actual stream keeps that validation synchronous while the stream itself
    stays lazy.
    """
    conversation, preceding_user_message, context = _resolve_regenerate_target(assistant_message)

    assistant_message.is_active_response = False
    assistant_message.save(update_fields=["is_active_response"])

    return _stream_reply(
        conversation, preceding_user_message, context,
        request=request, regenerated_from=assistant_message,
    )


def _stream_reply(
    conversation: Conversation, user_message: Message, context: EducationalContext,
    *, request=None, regenerated_from: Message | None = None,
) -> Iterator[dict]:
    """Shared core of stream_send_message/stream_regenerate: runs the same
    tool-calling loop as _generate_reply, but forwards each provider chunk
    to the client live as it arrives instead of only returning the whole
    answer at the end.

    A turn that resolves to a tool call is the one case a provider might
    stream visible commentary that must never reach the user (today's
    non-streaming code already drops it silently — see _generate_reply). To
    keep the common no-tool-call path truly zero-latency instead of
    buffering every iteration "just in case", any content streamed during
    an iteration that turns out to end in tool_calls is retracted via a
    tool_call_reset event telling the client to clear it, before tool
    execution continues.

    Regardless of how this generator ends — a clean finish, a provider
    error, or the client disconnecting (Stop button / network drop, which
    surfaces here as GeneratorExit) — the finally block guarantees exactly
    one assistant Message is persisted and the conversation/learning-event
    bookkeeping _generate_reply's callers normally do afterward still runs.
    """
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

    ai_service = None
    executed_tool_calls = []
    accumulated_content = ""
    model_used = ""
    token_usage = None
    assistant_message = None
    terminal_event_yielded = False

    try:
        ai_service = AIService()
        yield {"type": "heartbeat"}

        for _iteration in range(MAX_TOOL_ITERATIONS):
            iteration_content = ""
            tool_calls = None

            try:
                for stream_chunk in ai_service.stream(ai_request):
                    if not stream_chunk.is_final:
                        if stream_chunk.delta:
                            iteration_content += stream_chunk.delta
                            accumulated_content += stream_chunk.delta
                            yield {"type": "delta", "content": stream_chunk.delta}
                        continue
                    tool_calls = stream_chunk.tool_calls
                    model_used = stream_chunk.model_used or model_used
                    token_usage = stream_chunk.token_usage
            except AIProviderError as exc:
                assistant_message = Message.objects.create(
                    conversation=conversation, role=MessageRole.ASSISTANT,
                    content=accumulated_content, status=MessageStatus.FAILED,
                    error_message=str(exc)[:500], provider=ai_service.provider.name,
                )
                yield {"type": "error", "message": _serialize_message(assistant_message, request)}
                terminal_event_yielded = True
                return

            if not tool_calls:
                break  # terminal iteration — accumulated_content is the real answer

            if iteration_content:
                # Commentary alongside a tool call was already streamed live —
                # retract it, it was never meant to be shown (or persisted).
                accumulated_content = accumulated_content[: -len(iteration_content)]
                yield {"type": "tool_call_reset"}

            ai_request.messages.append(
                AIMessage(role=MessageRole.ASSISTANT, content=iteration_content or "",
                          tool_calls=tool_calls)
            )
            for call in tool_calls:
                arguments = call.get("arguments") or {}
                yield {"type": "tool_call", "tool_name": call["name"]}
                result = tool_registry.execute(call["name"], arguments, user=conversation.owner)
                call_status = (
                    ToolCallStatus.ERROR if isinstance(result, dict) and "error" in result
                    else ToolCallStatus.SUCCESS
                )
                executed_tool_calls.append({
                    "tool_name": call["name"], "arguments": arguments,
                    "result": result, "status": call_status,
                })
                ai_request.messages.append(
                    AIMessage(role=MessageRole.TOOL, content=json.dumps(result, default=str),
                              tool_call_id=call.get("id"))
                )
        else:
            # Exhausted MAX_TOOL_ITERATIONS still requesting tools — force a
            # final plain-text answer so the turn always terminates.
            ai_request.tools = None
            try:
                for stream_chunk in ai_service.stream(ai_request):
                    if not stream_chunk.is_final:
                        if stream_chunk.delta:
                            accumulated_content += stream_chunk.delta
                            yield {"type": "delta", "content": stream_chunk.delta}
                        continue
                    model_used = stream_chunk.model_used or model_used
                    token_usage = stream_chunk.token_usage
            except AIProviderError as exc:
                assistant_message = Message.objects.create(
                    conversation=conversation, role=MessageRole.ASSISTANT,
                    content=accumulated_content, status=MessageStatus.FAILED,
                    error_message=str(exc)[:500], provider=ai_service.provider.name,
                )
                yield {"type": "error", "message": _serialize_message(assistant_message, request)}
                terminal_event_yielded = True
                return

        assistant_message = Message.objects.create(
            conversation=conversation, role=MessageRole.ASSISTANT,
            content=accumulated_content, status=MessageStatus.SENT,
            model_used=model_used, provider=ai_service.provider.name,
            token_usage=token_usage,
            educational_context=context.to_dict() if not context.is_empty() else None,
            regenerated_from=regenerated_from,
        )
        if executed_tool_calls:
            ToolCall.objects.bulk_create([
                ToolCall(
                    message=assistant_message, tool_name=tc["tool_name"],
                    arguments=tc["arguments"], result=tc["result"], status=tc["status"],
                )
                for tc in executed_tool_calls
            ])
        yield {"type": "message", "message": _serialize_message(assistant_message, request)}
        terminal_event_yielded = True
    finally:
        if assistant_message is None:
            # Aborted (Stop button / disconnect) before any terminal event —
            # never erase what streamed so far.
            assistant_message = Message.objects.create(
                conversation=conversation, role=MessageRole.ASSISTANT,
                content=accumulated_content, status=MessageStatus.STOPPED,
                provider=ai_service.provider.name if ai_service else "",
                regenerated_from=regenerated_from,
            )
        elif not terminal_event_yielded:
            # A terminal Message was created (FAILED/SENT) but yielding the
            # matching event was itself interrupted mid-flight — the row
            # already reflects reality, nothing further to persist.
            pass

        conversation.last_message_at = timezone.now()
        conversation.save(update_fields=["last_message_at", "updated_at"])
        _record_learning_event(conversation.owner, context, assistant_message)


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
    _record_learning_event(conversation.owner, context, new_message)
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
