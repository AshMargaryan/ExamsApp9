from django.conf import settings

from .base import AIMessage, AIRequest, AIResponse, BaseAIProvider

_GEMINI_ROLES = {"user": "user", "assistant": "model"}


class GeminiProvider(BaseAIProvider):
    """Talks to Google's Gemini API (generateContent REST endpoint) directly
    over `requests`, so no extra SDK dependency is needed. Supports vision
    the same way OpenAIProvider does: image attachments become inline_data
    parts alongside the text."""

    name = "gemini"

    def __init__(self):
        self.api_key = getattr(settings, "GEMINI_API_KEY", "")
        self.model = getattr(settings, "GEMINI_MODEL", "gemini-flash-latest")

    def generate(self, request: AIRequest) -> AIResponse:
        if not self.api_key:
            raise RuntimeError(
                "GEMINI_API_KEY is not set — add it to backend/.env and set AI_PROVIDER=gemini."
            )

        import requests

        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{self.model}:generateContent"
        )
        payload = {
            "system_instruction": {"parts": [{"text": request.system_prompt}]},
            "contents": [self._to_gemini_content(m) for m in request.messages],
        }

        try:
            response = requests.post(
                url,
                params={"key": self.api_key},
                json=payload,
                timeout=60,
            )
            response.raise_for_status()
        except requests.RequestException as exc:
            detail = exc.response.text if exc.response is not None else str(exc)
            raise RuntimeError(f"Gemini request failed: {detail}") from exc

        data = response.json()
        candidates = data.get("candidates") or []
        if not candidates:
            raise RuntimeError(f"Gemini returned no candidates: {data}")

        candidate = candidates[0]
        parts = candidate.get("content", {}).get("parts", [])
        content = "".join(p.get("text", "") for p in parts)
        usage = data.get("usageMetadata")

        return AIResponse(
            content=content,
            model_used=data.get("modelVersion", self.model),
            finish_reason=(candidate.get("finishReason") or "stop").lower(),
            token_usage={
                "prompt_tokens": usage.get("promptTokenCount"),
                "completion_tokens": usage.get("candidatesTokenCount"),
                "total_tokens": usage.get("totalTokenCount"),
            } if usage else None,
            tool_calls=None,
        )

    def _to_gemini_content(self, message: AIMessage) -> dict:
        role = _GEMINI_ROLES.get(message.role, "user")

        parts = []
        if message.content:
            parts.append({"text": message.content})

        for attachment in message.attachments or []:
            if attachment.get("attachment_type") != "image" or not attachment.get("data_url"):
                continue
            mime_type, _, encoded = attachment["data_url"].partition(";base64,")
            mime_type = mime_type.removeprefix("data:")
            parts.append({"inline_data": {"mime_type": mime_type, "data": encoded}})

        return {"role": role, "parts": parts or [{"text": ""}]}
