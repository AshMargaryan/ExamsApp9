from django.conf import settings

from .base import AIRequest, AIResponse, BaseAIProvider


class OpenAIProvider(BaseAIProvider):
    """Not implemented yet — placeholder so swapping AI_PROVIDER=openai later
    is a one-file implementation, not a new architecture. The `openai` SDK is
    already in requirements.txt for when this is built out."""

    name = "openai"

    def __init__(self):
        self.api_key = getattr(settings, "OPENAI_API_KEY", "")
        self.model = getattr(settings, "OPENAI_MODEL", "gpt-4o-mini")

    def generate(self, request: AIRequest) -> AIResponse:
        raise NotImplementedError("OpenAIProvider is not implemented yet.")
