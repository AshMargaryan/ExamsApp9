import time
from typing import Iterator

from ..providers import AIRequest, AIResponse, AIStreamChunk, get_provider


class AIProviderError(Exception):
    """Raised when the configured provider fails to generate a response.
    message_service catches this and persists a failed Message instead of
    letting the request 500."""


class AIService:
    """Thin orchestration layer: fetches whichever provider is configured
    and times the call centrally, so providers only need to return content
    + usage, not measure their own latency."""

    def __init__(self, provider_name: str | None = None):
        self.provider = get_provider(provider_name)

    def generate(self, request: AIRequest) -> tuple[AIResponse, int]:
        start = time.monotonic()
        try:
            response = self.provider.generate(request)
        except Exception as exc:
            raise AIProviderError(str(exc)) from exc
        response_time_ms = int((time.monotonic() - start) * 1000)
        return response, response_time_ms

    def stream(self, request: AIRequest) -> Iterator[AIStreamChunk]:
        """Wraps provider.stream(), converting exceptions raised mid-iteration
        (not just at call time — the provider's stream is a generator, so an
        HTTP/SDK error can surface on any next()) into AIProviderError."""
        try:
            yield from self.provider.stream(request)
        except AIProviderError:
            raise
        except Exception as exc:
            raise AIProviderError(str(exc)) from exc
