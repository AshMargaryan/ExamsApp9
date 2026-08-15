from django.conf import settings

from .base import AIMessage, AIRequest, AIResponse, AIStreamChunk, BaseAIProvider

_PROVIDER_CLASSES = {
    "mock": "apps.ai_assistant.providers.mock_provider.MockAIProvider",
    "ollama": "apps.ai_assistant.providers.ollama_provider.OllamaProvider",
    "openai": "apps.ai_assistant.providers.openai_provider.OpenAIProvider",
    "anthropic": "apps.ai_assistant.providers.anthropic_provider.AnthropicProvider",
}


def get_provider(name: str | None = None) -> BaseAIProvider:
    """
    Factory: the single seam the rest of the app depends on. AIService never
    imports a concrete provider directly — swapping AI_PROVIDER in settings
    (or passing `name` explicitly) is the only thing that changes.
    """
    from django.utils.module_loading import import_string

    provider_name = (name or getattr(settings, "AI_PROVIDER", "mock")).lower()
    try:
        provider_path = _PROVIDER_CLASSES[provider_name]
    except KeyError:
        raise ValueError(
            f"Unknown AI_PROVIDER '{provider_name}'. Valid options: "
            f"{', '.join(_PROVIDER_CLASSES)}"
        )
    provider_class = import_string(provider_path)
    return provider_class()


__all__ = [
    "AIMessage", "AIRequest", "AIResponse", "AIStreamChunk", "BaseAIProvider",
    "get_provider",
]
