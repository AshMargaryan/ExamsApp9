from django.conf import settings

from .base import AIMessage, AIRequest, AIResponse, BaseAIProvider

_OPENAI_ROLES = {"system", "user", "assistant"}


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

    def generate(self, request: AIRequest) -> AIResponse:
        if not self.api_key:
            raise RuntimeError(
                "OPENAI_API_KEY is not set — add it to backend/.env and set AI_PROVIDER=openai."
            )

        from openai import OpenAI  # local import: keeps the SDK optional for AI_PROVIDER=mock/ollama

        client = OpenAI(api_key=self.api_key)
        messages = [{"role": "system", "content": request.system_prompt}]
        messages.extend(self._to_openai_message(m) for m in request.messages)

        try:
            response = client.chat.completions.create(model=self.model, messages=messages)
        except Exception as exc:
            raise RuntimeError(f"OpenAI request failed: {exc}") from exc

        choice = response.choices[0]
        usage = response.usage

        return AIResponse(
            content=choice.message.content or "",
            model_used=response.model,
            finish_reason=choice.finish_reason or "stop",
            token_usage={
                "prompt_tokens": usage.prompt_tokens,
                "completion_tokens": usage.completion_tokens,
                "total_tokens": usage.total_tokens,
            } if usage else None,
            tool_calls=None,
        )

    def _to_openai_message(self, message: AIMessage) -> dict:
        role = message.role if message.role in _OPENAI_ROLES else "user"

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
