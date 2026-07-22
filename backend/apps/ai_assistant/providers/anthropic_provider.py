from django.conf import settings

from .base import AIRequest, AIResponse, BaseAIProvider


class AnthropicProvider(BaseAIProvider):
    """Not implemented yet — placeholder so swapping AI_PROVIDER=anthropic
    later is a one-file implementation, not a new architecture."""

    name = "anthropic"

    def __init__(self):
        self.api_key = getattr(settings, "ANTHROPIC_API_KEY", "")
        self.model = getattr(settings, "ANTHROPIC_MODEL", "claude-sonnet-5")

    def generate(self, request: AIRequest) -> AIResponse:
        raise NotImplementedError("AnthropicProvider is not implemented yet.")
