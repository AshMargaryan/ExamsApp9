import json
from typing import Iterator

import requests
from django.conf import settings

from .base import AIRequest, AIResponse, AIStreamChunk, BaseAIProvider


class OllamaProvider(BaseAIProvider):
    """Calls a local/self-hosted Ollama server's /api/chat endpoint."""

    name = "ollama"

    def __init__(self):
        self.base_url = getattr(settings, "OLLAMA_BASE_URL", "http://localhost:11434")
        self.model = getattr(settings, "OLLAMA_MODEL", "qwen3:8b")
        self.timeout = getattr(settings, "OLLAMA_TIMEOUT_SECONDS", 60)
        # qwen3 and similar hybrid-reasoning models emit a long internal
        # "thinking" block by default; disabling it keeps chat replies fast.
        self.think = getattr(settings, "OLLAMA_THINK", False)

    def generate(self, request: AIRequest) -> AIResponse:
        messages = [{"role": "system", "content": request.system_prompt}]
        messages.extend({"role": m.role, "content": m.content} for m in request.messages)

        try:
            response = requests.post(
                f"{self.base_url}/api/chat",
                json={
                    "model": self.model,
                    "messages": messages,
                    "stream": False,
                    "think": self.think,
                },
                timeout=self.timeout,
            )
            response.raise_for_status()
        except requests.RequestException as exc:
            raise RuntimeError(f"Ollama request failed: {exc}") from exc

        data = response.json()
        content = data.get("message", {}).get("content", "")
        prompt_tokens = data.get("prompt_eval_count", 0)
        completion_tokens = data.get("eval_count", 0)

        return AIResponse(
            content=content,
            model_used=data.get("model", self.model),
            finish_reason="stop" if data.get("done", True) else "length",
            token_usage={
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
                "total_tokens": prompt_tokens + completion_tokens,
            },
            tool_calls=None,
        )

    def stream(self, request: AIRequest) -> Iterator[AIStreamChunk]:
        messages = [{"role": "system", "content": request.system_prompt}]
        messages.extend({"role": m.role, "content": m.content} for m in request.messages)

        try:
            response = requests.post(
                f"{self.base_url}/api/chat",
                json={
                    "model": self.model,
                    "messages": messages,
                    "stream": True,
                    "think": self.think,
                },
                timeout=self.timeout,
                stream=True,
            )
            response.raise_for_status()
        except requests.RequestException as exc:
            raise RuntimeError(f"Ollama request failed: {exc}") from exc

        model_used = self.model
        finish_reason = "stop"
        token_usage = None

        try:
            for line in response.iter_lines():
                if not line:
                    continue
                data = json.loads(line)
                model_used = data.get("model", model_used)
                content = data.get("message", {}).get("content", "")
                if content:
                    yield AIStreamChunk(delta=content)
                if data.get("done"):
                    finish_reason = "stop" if data.get("done_reason", "stop") == "stop" else "length"
                    prompt_tokens = data.get("prompt_eval_count", 0)
                    completion_tokens = data.get("eval_count", 0)
                    token_usage = {
                        "prompt_tokens": prompt_tokens,
                        "completion_tokens": completion_tokens,
                        "total_tokens": prompt_tokens + completion_tokens,
                    }
        except requests.RequestException as exc:
            raise RuntimeError(f"Ollama stream failed: {exc}") from exc
        finally:
            response.close()

        yield AIStreamChunk(
            is_final=True, finish_reason=finish_reason,
            model_used=model_used, token_usage=token_usage,
        )
