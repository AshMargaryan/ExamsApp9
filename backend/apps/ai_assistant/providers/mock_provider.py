import random
import time

from .base import AIRequest, AIResponse, BaseAIProvider


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
