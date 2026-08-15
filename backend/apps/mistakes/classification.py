"""
AI-assisted classification of *why* a mistake happened, not just that it
was wrong — the "Mistake Intelligence" layer future systems (Misconception
Engine, AI Tutor's "Why am I wrong?" mode) can build on. Mirrors
apps.study_plan.services._ai_narrate's resilience pattern: best-effort AI
call, graceful no-op on any failure, never raises into the caller.

Classification is lazy — triggered on demand via MistakeClassifyView, not
run automatically when the mistake is first recorded — so a timed mock-exam
submission never blocks on an LLM call, and a student who never opens their
mistake notebook never costs an AI call at all.
"""

import json

from django.utils import timezone

from .models import ErrorCategory, MistakeType

_VALID_CATEGORIES = {c.value for c in ErrorCategory if c != ErrorCategory.UNCLASSIFIED}

_PROMPT_TEMPLATE = (
    "Աշակերտը սխալ է պատասխանել այս հարցին։ Դասակարգիր սխալի ՊԱՏՃԱՌԸ հետևյալ "
    "կատեգորիաներից մեկով.\n"
    "- careless_slip: գիտեր նյութը, բայց անուշադրության սխալ է թույլ տվել\n"
    "- conceptual_gap: հիմնարար թյուրիմացություն կամ չիմացություն\n"
    "- process_error: սխալ մեթոդ կամ քայլեր է կիրառել\n"
    "- misread_question: սխալ է հասկացել հարցի ձևակերպումը\n\n"
    "Հարց. {question_text}\n"
    "Ճիշտ պատասխան. {correct_answer_text}\n"
    "Աշակերտի պատասխանը. {your_answer_text}\n\n"
    "Պատասխանիր ԲԱՑԱՌԱՊԵՍ այս JSON ձևաչափով, առանց այլ տեքստի.\n"
    '{{"category": "careless_slip|conceptual_gap|process_error|misread_question", '
    '"explanation": "մեկ կարճ նախադասությամբ բացատրություն հայերենով"}}'
)


def classify_mistake(entry) -> bool:
    """Best-effort. Returns True if `entry` was (re)classified just now,
    False if skipped (already classified, not attempted, or the AI call
    failed/returned something unusable) — callers don't need to branch on
    this; they just re-read `entry.error_category` either way."""
    if entry.classified_at is not None:
        return False
    if entry.mistake_type == MistakeType.NOT_ATTEMPTED:
        return False

    from apps.ai_assistant.providers.base import AIMessage, AIRequest
    from apps.ai_assistant.services.ai_service import AIProviderError, AIService

    prompt = _PROMPT_TEMPLATE.format(
        question_text=entry.question_text,
        correct_answer_text=entry.correct_answer_text,
        your_answer_text=entry.your_answer_text,
    )
    request = AIRequest(
        messages=[AIMessage(role="user", content=prompt)],
        system_prompt="You output strictly valid JSON matching the requested schema, and nothing else.",
    )
    try:
        response, _response_time_ms = AIService().generate(request)
        data = json.loads(response.content)
        category = str(data["category"])
        if category not in _VALID_CATEGORIES:
            return False
        explanation = str(data.get("explanation", "")).strip()
    except (AIProviderError, ValueError, KeyError, TypeError):
        return False

    entry.error_category = category
    entry.error_explanation = explanation
    entry.classified_at = timezone.now()
    entry.save(update_fields=["error_category", "error_explanation", "classified_at"])
    return True
