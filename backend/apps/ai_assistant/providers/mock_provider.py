import random
import time
from typing import Iterator

from .base import AIRequest, AIResponse, AIStreamChunk, BaseAIProvider

# Dev/testing-only stand-in for a real model's reasoning about when to call a
# tool: a real provider (e.g. OpenAI) decides this itself from the schema and
# conversation via actual function-calling. Since AI_PROVIDER=mock is this
# project's default and no API key is configured out of the box, this
# keyword heuristic is what makes the tool-calling pipeline (registry ->
# ToolCall persistence -> follow-up answer) exercisable without one.
_TOOL_KEYWORDS = {
    "get_mistakes": ["սխալ", "mistake"],
    "get_study_plan": ["պլան", "plan"],
    "get_progress": ["առաջընթաց", "ինչպես եմ", "progress", "թույլ", "ուժեղ", "weak", "strong", "accuracy", "ճշգրտություն"],
    # "xp" deliberately excluded: as a bare substring it false-matches inside
    # ordinary English words (e.g. "explain" contains "xp"). "level"/"profile"/
    # "streak" already cover the English trigger space for this tool.
    "get_profile": ["պրոֆիլ", "իմ մասին", "ով եմ", "մակարդակ", "level", "profile", "streak", "սթրիք"],
}


class MockAIProvider(BaseAIProvider):
    """
    The only functional provider today. Produces a deterministic, clearly
    labeled canned response so the whole pipeline (RAG -> PromptBuilder ->
    provider -> persisted Message -> serialized response) can be exercised
    end-to-end without a real model or API key.
    """

    name = "mock"

    def generate(self, request: AIRequest) -> AIResponse:
        # Simulate a small amount of "thinking" time.
        time.sleep(random.uniform(0.2, 0.5))
        return self._build_response(request)

    def stream(self, request: AIRequest) -> Iterator[AIStreamChunk]:
        # Same "thinking" delay as generate() before the first chunk.
        time.sleep(random.uniform(0.2, 0.5))
        response = self._build_response(request)

        if response.tool_calls:
            # A real model resolves a tool-call turn fast and emits no
            # visible content for it — reflect that instead of chunking.
            yield AIStreamChunk(
                is_final=True, tool_calls=response.tool_calls,
                finish_reason=response.finish_reason, model_used=response.model_used,
                token_usage=response.token_usage,
            )
            return

        # Chunk into small word-groups with a tiny variable delay between
        # them so local/dev testing exercises real incremental rendering
        # instead of one instant dump — this is server-side cadence for a
        # provider stand-in, not a frontend typewriter effect.
        words = response.content.split(" ")
        chunk_size = 3
        for i in range(0, len(words), chunk_size):
            group = words[i:i + chunk_size]
            text = " ".join(group)
            if i + chunk_size < len(words):
                text += " "
            yield AIStreamChunk(delta=text)
            time.sleep(random.uniform(0.015, 0.05))

        yield AIStreamChunk(
            is_final=True, finish_reason=response.finish_reason,
            model_used=response.model_used, token_usage=response.token_usage,
        )

    def _build_response(self, request: AIRequest) -> AIResponse:
        last_message = request.messages[-1] if request.messages else None

        if request.tools and last_message and last_message.role == "tool":
            return self._reply_from_tool_result(last_message)

        if request.tools and last_message and last_message.role == "user":
            tool_name = self._match_tool(last_message.content)
            if tool_name:
                return AIResponse(
                    content="",
                    model_used="mock-v1",
                    finish_reason="tool_calls",
                    tool_calls=[{"id": f"call_{tool_name}_0", "name": tool_name, "arguments": {}}],
                )

        last_user_message = next(
            (m for m in reversed(request.messages) if m.role == "user"), None
        )
        user_text = last_user_message.content if last_user_message else ""

        context = request.educational_context or {}
        subtopic = context.get("subtopic")
        subject = context.get("subject")

        intro = "[Mock AI] "
        if subtopic:
            intro += f"I can see you're working on *{subtopic}*"
            if subject:
                intro += f" ({subject})"
            intro += ". "
        elif subject:
            intro += f"I can see this is about *{subject}*. "

        reply = (
            f"{intro}Here's a placeholder response to: \"{user_text[:200]}\". "
            "This is a mock reply standing in for a real AI provider — once "
            "OLLAMA_PROVIDER/OPENAI_PROVIDER/etc. is configured, this text "
            "will be replaced by a real model's answer."
        )

        prompt_tokens = sum(len(m.content.split()) for m in request.messages) + len(
            request.system_prompt.split()
        )
        completion_tokens = len(reply.split())

        return AIResponse(
            content=reply,
            model_used="mock-v1",
            finish_reason="stop",
            token_usage={
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
                "total_tokens": prompt_tokens + completion_tokens,
            },
            tool_calls=None,
        )

    def _match_tool(self, user_text: str) -> str | None:
        lowered = user_text.lower()
        for tool_name, keywords in _TOOL_KEYWORDS.items():
            if any(keyword in lowered for keyword in keywords):
                return tool_name
        return None

    def _reply_from_tool_result(self, tool_message) -> AIResponse:
        reply = (
            f"[Mock AI] Here's what I found: {tool_message.content[:400]}. "
            "This is a mock reply standing in for a real AI provider — once "
            "OLLAMA_PROVIDER/OPENAI_PROVIDER/etc. is configured, this text "
            "will be replaced by a real model's answer grounded in the data above."
        )
        return AIResponse(
            content=reply,
            model_used="mock-v1",
            finish_reason="stop",
            tool_calls=None,
        )
