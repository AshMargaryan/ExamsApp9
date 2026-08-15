"""
Provider abstraction: the single contract every AI backend (Mock, Ollama,
OpenAI, Anthropic, ...) and every caller (AIService) depends on.

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
    # Present on an assistant message that requested tool calls, so a
    # provider can replay its own prior turn when the tool loop continues.
    tool_calls: Optional[list[dict]] = None
    # Present on a role="tool" message: the id of the call this answers.
    tool_call_id: Optional[str] = None


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
    # Standardized shape across all providers: [{"id": str, "name": str, "arguments": dict}, ...]
    tool_calls: Optional[list[dict]] = None


@dataclass
class AIStreamChunk:
    delta: str = ""
    is_final: bool = False
    # Only populated on the final chunk of a stream (is_final=True) — mirrors
    # the corresponding AIResponse fields once the provider knows them.
    tool_calls: Optional[list[dict]] = None
    finish_reason: Optional[str] = None
    model_used: Optional[str] = None
    token_usage: Optional[dict] = None


class BaseAIProvider(ABC):
    """Every concrete provider implements at least generate()."""

    name: str = "base"

    @abstractmethod
    def generate(self, request: AIRequest) -> AIResponse:
        ...

    def stream(self, request: AIRequest) -> Iterator[AIStreamChunk]:
        """
        A provider opts in by overriding this method — no interface change
        required upstream. Not every provider implements it (e.g. Anthropic
        is still an unconfigured stub).
        """
        raise NotImplementedError(f"{self.__class__.__name__} does not support streaming yet.")
