import json
from typing import Iterator

from django.conf import settings

from .base import AIMessage, AIRequest, AIResponse, AIStreamChunk, BaseAIProvider

_OPENAI_ROLES = {"system", "user", "assistant", "tool"}


class OpenAIProvider(BaseAIProvider):
    """Talks to OpenAI's Chat Completions API. Supports vision: a message
    whose attachments include an embedded image (see PromptBuilder — only
    the newest turn's images carry pixel data) is sent as a multi-part
    content list instead of plain text, so gpt-4o-mini etc. can actually
    see the photo."""

    name = "openai"

    def __init__(self):
        self.api_key = getattr(settings, "OPENAI_API_KEY", "")
        self.model = getattr(settings, "OPENAI_MODEL", "gpt-4o-mini")
        # The SDK's own default is 600s. Several of these calls happen inside
        # a page request — apps.study_plan narrates the daily plan during the
        # first GET of the day — so an unbounded wait means a student staring
        # at a loading skeleton for minutes with no way out. Bounded, the call
        # raises, and every caller already has a deterministic fallback.
        # Mirrors OLLAMA_TIMEOUT_SECONDS in the sibling provider.
        self.timeout = getattr(settings, "OPENAI_TIMEOUT_SECONDS", 45)

    def generate(self, request: AIRequest) -> AIResponse:
        if not self.api_key:
            raise RuntimeError(
                "OPENAI_API_KEY is not set — add it to backend/.env and set AI_PROVIDER=openai."
            )

        from openai import OpenAI  # local import: keeps the SDK optional for AI_PROVIDER=mock/ollama

        client = OpenAI(api_key=self.api_key, timeout=self.timeout)
        messages = [{"role": "system", "content": request.system_prompt}]
        messages.extend(self._to_openai_message(m) for m in request.messages)

        kwargs = {}
        if request.tools:
            kwargs["tools"] = request.tools
            kwargs["tool_choice"] = "auto"

        try:
            response = client.chat.completions.create(model=self.model, messages=messages, **kwargs)
        except Exception as exc:
            raise RuntimeError(f"OpenAI request failed: {exc}") from exc

        choice = response.choices[0]
        usage = response.usage

        tool_calls = None
        if choice.message.tool_calls:
            tool_calls = [
                {
                    "id": tc.id,
                    "name": tc.function.name,
                    "arguments": json.loads(tc.function.arguments or "{}"),
                }
                for tc in choice.message.tool_calls
            ]

        return AIResponse(
            content=choice.message.content or "",
            model_used=response.model,
            finish_reason=choice.finish_reason or "stop",
            token_usage={
                "prompt_tokens": usage.prompt_tokens,
                "completion_tokens": usage.completion_tokens,
                "total_tokens": usage.total_tokens,
            } if usage else None,
            tool_calls=tool_calls,
        )

    def stream(self, request: AIRequest) -> Iterator[AIStreamChunk]:
        if not self.api_key:
            raise RuntimeError(
                "OPENAI_API_KEY is not set — add it to backend/.env and set AI_PROVIDER=openai."
            )

        from openai import OpenAI

        client = OpenAI(api_key=self.api_key, timeout=self.timeout)
        messages = [{"role": "system", "content": request.system_prompt}]
        messages.extend(self._to_openai_message(m) for m in request.messages)

        kwargs = {}
        if request.tools:
            kwargs["tools"] = request.tools
            kwargs["tool_choice"] = "auto"

        try:
            response_stream = client.chat.completions.create(
                model=self.model, messages=messages, stream=True,
                stream_options={"include_usage": True}, **kwargs,
            )
        except Exception as exc:
            raise RuntimeError(f"OpenAI request failed: {exc}") from exc

        model_used = self.model
        finish_reason = "stop"
        token_usage = None
        # index -> {"id": str, "name": str, "arguments": str} — OpenAI streams
        # each tool call's name once and its JSON arguments incrementally as
        # string fragments, keyed by position rather than id.
        tool_call_buffers: dict[int, dict] = {}

        try:
            for chunk in response_stream:
                if chunk.model:
                    model_used = chunk.model
                if chunk.usage:
                    token_usage = {
                        "prompt_tokens": chunk.usage.prompt_tokens,
                        "completion_tokens": chunk.usage.completion_tokens,
                        "total_tokens": chunk.usage.total_tokens,
                    }
                if not chunk.choices:
                    # The trailing usage-only chunk (stream_options include_usage)
                    # carries an empty choices list — nothing else to read here.
                    continue

                choice = chunk.choices[0]
                delta = choice.delta

                if choice.finish_reason:
                    finish_reason = choice.finish_reason

                if delta and delta.content:
                    yield AIStreamChunk(delta=delta.content)

                if delta and delta.tool_calls:
                    for tc_delta in delta.tool_calls:
                        buf = tool_call_buffers.setdefault(
                            tc_delta.index, {"id": None, "name": None, "arguments": ""}
                        )
                        if tc_delta.id:
                            buf["id"] = tc_delta.id
                        if tc_delta.function and tc_delta.function.name:
                            buf["name"] = tc_delta.function.name
                        if tc_delta.function and tc_delta.function.arguments:
                            buf["arguments"] += tc_delta.function.arguments
        except Exception as exc:
            raise RuntimeError(f"OpenAI stream failed: {exc}") from exc

        tool_calls = None
        if tool_call_buffers:
            tool_calls = [
                {
                    "id": buf["id"],
                    "name": buf["name"],
                    "arguments": json.loads(buf["arguments"] or "{}"),
                }
                for _, buf in sorted(tool_call_buffers.items())
            ]

        yield AIStreamChunk(
            is_final=True, tool_calls=tool_calls, finish_reason=finish_reason,
            model_used=model_used, token_usage=token_usage,
        )

    def _to_openai_message(self, message: AIMessage) -> dict:
        role = message.role if message.role in _OPENAI_ROLES else "user"

        if role == "tool":
            return {"role": "tool", "tool_call_id": message.tool_call_id, "content": message.content}

        if role == "assistant" and message.tool_calls:
            return {
                "role": "assistant",
                "content": message.content or None,
                "tool_calls": [
                    {
                        "id": tc["id"],
                        "type": "function",
                        "function": {"name": tc["name"], "arguments": json.dumps(tc.get("arguments") or {})},
                    }
                    for tc in message.tool_calls
                ],
            }

        image_urls = [
            a["data_url"] for a in (message.attachments or [])
            if a.get("attachment_type") == "image" and a.get("data_url")
        ]
        if not image_urls:
            return {"role": role, "content": message.content}

        content = []
        if message.content:
            content.append({"type": "text", "text": message.content})
        content.extend({"type": "image_url", "image_url": {"url": url}} for url in image_urls)
        return {"role": role, "content": content}
