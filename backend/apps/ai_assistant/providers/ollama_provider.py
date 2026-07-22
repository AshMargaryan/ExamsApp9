from django.conf import settings

from .base import AIRequest, AIResponse, BaseAIProvider


class OllamaProvider(BaseAIProvider):
    """Not implemented yet — placeholder so swapping AI_PROVIDER=ollama later
    is a one-file implementation, not a new architecture."""

    name = "ollama"

    def __init__(self):
        self.base_url = getattr(settings, "OLLAMA_BASE_URL", "http://localhost:11434")
        self.model = getattr(settings, "OLLAMA_MODEL", "llama3")

    def generate(self, request: AIRequest) -> AIResponse:
        raise NotImplementedError("OllamaProvider is not implemented yet.")
