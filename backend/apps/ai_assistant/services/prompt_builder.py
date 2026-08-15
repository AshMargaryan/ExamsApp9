"""
Combines system prompt + conversation history + RAG context + attachments
metadata + the current user message into a single AIRequest object. The
provider only ever receives this one final object — it never assembles a
prompt itself.
"""

import base64
from typing import Optional

from django.conf import settings

from apps.profiles.context import get_learner_context

from ..models import Conversation, MessageRole, MessageStatus
from ..prompts import BASE_SYSTEM_PROMPT, CONVERSATION_MODE_FRAMING, TOOLS_SYSTEM_ADDENDUM
from ..providers.base import AIMessage, AIRequest
from ..tools.definitions import TOOL_DEFINITIONS
from .rag_service import ContextChunk, EducationalContext

# Kept small and read-only-summary — this goes into every turn's system
# prompt, so it must stay cheap in tokens. Not the full get_learner_context()
# payload (see apps.profiles.context docstring: callers should only pull
# what they'll use).
_LEARNER_CONTEXT_EVENTS_LIMIT = 5


class PromptBuilder:
    def build(
        self,
        conversation: Conversation,
        user_text: str,
        educational_context: EducationalContext,
        retrieved_chunks: list[ContextChunk],
        attachments: Optional[list] = None,
    ) -> AIRequest:
        system_prompt = self._build_system_prompt(educational_context, conversation.owner)
        messages = self._history_messages(conversation)
        messages.append(
            AIMessage(
                role=MessageRole.USER,
                content=self._with_educational_context(user_text, retrieved_chunks),
                attachments=self._attachment_metadata(attachments, embed_images=True),
            )
        )

        return AIRequest(
            messages=messages,
            system_prompt=system_prompt,
            educational_context=educational_context.to_dict()
            if not educational_context.is_empty()
            else None,
            tools=TOOL_DEFINITIONS,
        )

    def _with_educational_context(self, user_text: str, chunks: list[ContextChunk]) -> str:
        """RAG chunks are retrieved fresh from the CURRENT message's content
        every turn, so they must never land in the system prompt: that
        message sits before the whole conversation history in the request,
        and OpenAI's automatic prompt caching matches on an exact prefix —
        one changed token there invalidates the cache for every message
        behind it too, not just the chunk section. Keeping chunks on the
        latest (always-uncached-anyway) user message instead lets the
        stable system prompt + growing history stay a cache hit turn over
        turn."""
        if not chunks:
            return user_text
        context_block = "\n\n".join(
            ["--- Educational context ---"]
            + [chunk.to_prompt_text() for chunk in chunks]
            + ["--- End of educational context ---"]
        )
        return f"{context_block}\n\n{user_text}"

    def _build_system_prompt(
        self, context: EducationalContext, user
    ) -> str:
        parts = [BASE_SYSTEM_PROMPT, TOOLS_SYSTEM_ADDENDUM]

        mode_explicitly_set = bool(context.conversation_mode and context.conversation_mode in CONVERSATION_MODE_FRAMING)
        if mode_explicitly_set:
            parts.append(CONVERSATION_MODE_FRAMING[context.conversation_mode])

        learner_ctx = get_learner_context(user, recent_events_limit=_LEARNER_CONTEXT_EVENTS_LIMIT)

        directives = self._preference_directives(learner_ctx["learning_preferences"], mode_explicitly_set)
        parts.extend(directives)

        learner_section = self._format_learner_context(learner_ctx)
        if learner_section:
            parts.append(learner_section)

        return "\n\n".join(parts)

    def _preference_directives(self, preferences: Optional[dict], mode_explicitly_set: bool) -> list[str]:
        """Declared AI Tutor preferences (apps.profiles.LearningPreferences).
        Only fill in a default *mode* framing when the student hasn't picked
        one for this turn — an explicit per-message conversation_mode always
        wins over the standing preference."""
        if preferences is None:
            return []
        directives = []

        if not mode_explicitly_set and preferences["explanation_style"] == "direct":
            directives.append(CONVERSATION_MODE_FRAMING["explain_mode"])
        elif not mode_explicitly_set and preferences["explanation_style"] == "socratic":
            directives.append(
                "This student has asked for a strongly Socratic default: lean "
                "even more on guided questions and hold back direct "
                "explanations longer than usual, beyond the baseline."
            )

        if not preferences["hints_before_answers"]:
            directives.append(
                "This student has opted out of hints-first — you don't need "
                "to wait for an attempted step before explaining; you can "
                "give a more direct answer sooner when they ask for help."
            )

        if preferences["preferred_language"]:
            language_name = {"hy": "Armenian", "en": "English"}.get(
                preferences["preferred_language"], preferences["preferred_language"]
            )
            directives.append(f"Always respond in {language_name}, regardless of what language the student writes in.")

        return directives

    def _format_learner_context(self, ctx: dict) -> str:
        """Compact, human-readable summary of the learner profile (goals,
        active subjects, upcoming exams, availability, recent activity) —
        not the raw dict, so the model reads it like a briefing, not JSON."""
        lines = []

        profile = ctx["profile"]
        if profile and profile.get("target_major"):
            target = f"Aiming for: {profile['target_major']}"
            if profile.get("target_exam_date"):
                target += f" (target date {profile['target_exam_date']})"
            lines.append(target)

        if ctx["active_subjects"]:
            lines.append("Active subjects: " + ", ".join(
                f"{s['subject_key']} (priority: {s['priority']})" for s in ctx["active_subjects"]
            ))

        if ctx["upcoming_exams"]:
            lines.append("Upcoming exams: " + ", ".join(
                f"{e['name']} ({e['subject_key']}) on {e['exam_date']}"
                for e in ctx["upcoming_exams"][:3]
            ))

        if ctx["goals"]:
            goal_lines = []
            for g in ctx["goals"][:3]:
                label = g["goal_type"] + (f" [{g['subject_name']}]" if g["subject_name"] else "")
                if g["progress"] is not None:
                    label += f" — {g['progress']}% done"
                goal_lines.append(label)
            lines.append("Active goals: " + ", ".join(goal_lines))

        availability = ctx["study_availability"]
        if availability and availability.get("typical_session_minutes"):
            lines.append(f"Typically studies ~{availability['typical_session_minutes']} min/session")

        if ctx["recent_events"]:
            lines.append("Recent activity: " + ", ".join(
                e["event_type"] for e in ctx["recent_events"][:3]
            ))

        if not lines:
            return ""
        return "--- Student profile ---\n" + "\n".join(lines) + "\n--- End of student profile ---"

    def _history_messages(self, conversation: Conversation) -> list[AIMessage]:
        window = getattr(settings, "AI_ASSISTANT_HISTORY_WINDOW", 20)
        history = list(
            conversation.messages
            .filter(is_active_response=True, status=MessageStatus.SENT)
            .exclude(role=MessageRole.SYSTEM)
            .prefetch_related("attachments")
            .order_by("-created_at")[:window]
        )
        history.reverse()
        return [
            # embed_images=False: re-encoding every past image on every turn would
            # multiply token cost with conversation length. Only the newest
            # message's images are ever sent as pixels (see build()) — if the
            # model needs to see an older photo again, it'll ask the student to
            # resend it rather than silently losing track of it.
            AIMessage(
                role=m.role, content=m.content,
                attachments=self._attachment_metadata(m.attachments.all(), embed_images=False),
            )
            for m in history
        ]

    def _attachment_metadata(self, attachments, embed_images: bool) -> Optional[list[dict]]:
        if not attachments:
            return None
        return [
            {
                "filename": a.original_filename,
                "attachment_type": a.attachment_type,
                "mime_type": a.mime_type,
                "data_url": self._image_data_url(a) if embed_images else None,
            }
            for a in attachments
        ]

    def _image_data_url(self, attachment) -> Optional[str]:
        """Base64 data URI for image attachments only, so a vision-capable
        provider can actually see them — capped so a huge upload doesn't
        blow up the request instead of silently degrading to text-only."""
        if attachment.attachment_type != "image":
            return None
        max_bytes = getattr(settings, "AI_ASSISTANT_MAX_VISION_IMAGE_MB", 10) * 1024 * 1024
        if attachment.size > max_bytes:
            return None
        with attachment.file.open("rb") as f:
            encoded = base64.b64encode(f.read()).decode("ascii")
        return f"data:{attachment.mime_type};base64,{encoded}"
