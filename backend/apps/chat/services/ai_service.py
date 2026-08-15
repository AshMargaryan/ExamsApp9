from django.contrib.auth import get_user_model

from apps.ai_assistant.prompts import BASE_SYSTEM_PROMPT
from apps.ai_assistant.providers.base import AIMessage, AIRequest
from apps.ai_assistant.services.ai_service import AIProviderError, AIService

from ..models import Conversation, Message
from . import message_service

User = get_user_model()

# Not a real account anyone logs into (is_active=False, unusable password) —
# just a stable identity for the sender FK so AI replies flow through the
# exact same Message/serializer/WS-broadcast path as anything else in the
# conversation, instead of needing a parallel "system message" concept.
AI_BOT_USERNAME = "gitus_ai"


def get_ai_bot_user():
    user, created = User.objects.get_or_create(
        username=AI_BOT_USERNAME,
        defaults={"email": "gitus-ai@system.local", "first_name": "Gitus", "last_name": "AI", "is_active": False},
    )
    if created:
        user.set_unusable_password()
        user.save(update_fields=["password"])
    return user


def _describe_source(message: Message) -> str:
    """
    Turns whatever was asked-about into a plain-language prompt. A shared
    rich-content card has no useful `text` (see chat.services.context_service)
    so it needs its own translation; a plain message just asks about itself.
    """
    data = message.context_data or {}
    if message.context_type == "mock_exam_result":
        return (
            f"Ուսանողի քննության արդյունքն է․ {data.get('exam_title')} ({data.get('subject')}), "
            f"միավոր {data.get('scaled_score')}/20, ճիշտ պատասխաններ {data.get('raw_score')}/{data.get('question_count')}։ "
            "Կարճ մեկնաբանիր արդյունքը և առաջարկիր, թե ինչի վրա կենտրոնանալ հաջորդիվ։"
        )
    if message.context_type == "achievement":
        return f"Ուսանողն ապակողպել է «{data.get('name')}» նվաճումը։ Շնորհավորիր կարճ և ջերմ կերպով։"
    if message.context_type == "profile":
        return f"Սա {data.get('username')} օգտատիրոջ պրոֆիլի քարտն է։ Բարևիր կարճ ու ընկերական կերպով։"
    return message.text


def ask_ai(conversation: Conversation, source_message: Message) -> Message:
    if source_message.conversation_id != conversation.id:
        raise ValueError("Հաղորդագրությունը այս զրույցից չէ։")
    prompt = _describe_source(source_message).strip()
    if not prompt:
        raise ValueError("Հարցնելու համար բովանդակություն չկա։")

    request = AIRequest(messages=[AIMessage(role="user", content=prompt)], system_prompt=BASE_SYSTEM_PROMPT)
    try:
        response, _response_time_ms = AIService().generate(request)
    except AIProviderError as e:
        raise ValueError("AI Օգնականը ներկայումս անհասանելի է։") from e

    bot = get_ai_bot_user()
    return message_service.send_message(
        conversation, bot, text=response.content, reply_to_id=source_message.id,
    )
