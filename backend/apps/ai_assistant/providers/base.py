"""
Provider abstraction: the single contract every AI backend (Mock, Ollama,
OpenAI, Anthropic, Gemini, ...) and every caller (AIService) depends on.

Keeping this as plain dataclasses (not Django models) means providers stay
fully decoupled from the ORM/storage layer — attachments are passed in as
lightweight metadata dicts, never raw file bytes.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Iterator, Optional


@dataclass
class AIMessage:
    role: str
    content: str
    attachments: Optional[list[dict]] = None


@dataclass
class AIRequest:
    messages: list[AIMessage]
    system_prompt: str
    educational_context: Optional[dict] = None
    tools: Optional[list[dict]] = None
    stream: bool = False


@dataclass
class AIResponse:
    content: str
    model_used: str
    finish_reason: str = "stop"
    token_usage: Optional[dict] = None
    tool_calls: Optional[list[dict]] = None


@dataclass
class AIStreamChunk:
    delta: str
    is_final: bool = False


class BaseAIProvider(ABC):
    """Every concrete provider implements at least generate()."""

    name: str = "base"

    @abstractmethod
    def generate(self, request: AIRequest) -> AIResponse:
        ...

    def stream(self, request: AIRequest) -> Iterator[AIStreamChunk]:
        """
        Streaming is not implemented yet anywhere in the app (see project
        spec: design for it, don't build it). A provider opts in later by
        overriding just this method — no interface change required upstream.
        """
        raise NotImplementedError(f"{self.__class__.__name__} does not support streaming yet.")
