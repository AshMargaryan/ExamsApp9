from django.conf import settings

from .base import AIRequest, AIResponse, BaseAIProvider


class GeminiProvider(BaseAIProvider):
    """Not implemented yet — placeholder so swapping AI_PROVIDER=gemini later
    is a one-file implementation, not a new architecture."""

    name = "gemini"

    def __init__(self):
        self.api_key = getattr(settings, "GEMINI_API_KEY", "")
        self.model = getattr(settings, "GEMINI_MODEL", "gemini-1.5-flash")

    def generate(self, request: AIRequest) -> AIResponse:
        raise NotImplementedError("GeminiProvider is not implemented yet.")
