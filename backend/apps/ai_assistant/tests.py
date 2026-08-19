import io
import json
from unittest import mock

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework.test import APIClient

from apps.mistakes.models import MistakeEntry, MistakeEntrySource
from apps.profiles.models import LearningEvent, LearningEventType, LearningPreferences

from .models import Conversation, Message, MessageRole, ToolCall

User = get_user_model()


def _make_user(username="alice", email="alice@example.com"):
    return User.objects.create_user(username=username, email=email, password="pw123456")


def _parse_sse_events(resp) -> list[dict]:
    """Consumes a StreamingHttpResponse's SSE body (send/regenerate views)
    into the list of JSON event dicts message_service yielded. Consuming it
    is also what actually runs the (lazy) streaming generator — a test that
    only cares about side effects (DB rows, learning events) still needs to
    call this, or the generator body never executes.

    Iterates `resp` itself, not `resp.streaming_content` — the view's
    stream is an async generator (required so Daphne flushes it
    incrementally in production instead of buffering the whole thing, see
    views.py), and `.streaming_content` returns that raw async generator
    unconverted. Only `StreamingHttpResponse.__iter__` (i.e. iterating the
    response object) has the fallback that bridges it to a sync iterable
    for a sync caller like this test."""
    body = b"".join(resp).decode("utf-8")
    events = []
    for block in body.split("\n\n"):
        for line in block.split("\n"):
            if line.startswith("data: "):
                events.append(json.loads(line[len("data: "):]))
    return events


def _terminal_event(events: list[dict]) -> dict:
    for event in reversed(events):
        if event["type"] in ("message", "error"):
            return event
    raise AssertionError(f"no terminal SSE event in {events}")


class ConversationApiTests(TestCase):
    def setUp(self):
        self.user = _make_user()
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_create_list_rename_archive_pin_soft_delete_restore(self):
        create_resp = self.client.post("/api/assistant/conversations/")
        self.assertEqual(create_resp.status_code, 201)
        conv_id = create_resp.data["id"]

        rename_resp = self.client.patch(f"/api/assistant/conversations/{conv_id}/", {"title": "My chat"})
        self.assertEqual(rename_resp.status_code, 200)
        self.assertEqual(rename_resp.data["title"], "My chat")

        archive_resp = self.client.post(f"/api/assistant/conversations/{conv_id}/archive/")
        self.assertTrue(archive_resp.data["is_archived"])

        pin_resp = self.client.post(f"/api/assistant/conversations/{conv_id}/pin/")
        self.assertTrue(pin_resp.data["is_pinned"])

        list_resp = self.client.get("/api/assistant/conversations/?archived=true")
        self.assertEqual(list_resp.data["results"][0]["id"], conv_id)

        delete_resp = self.client.delete(f"/api/assistant/conversations/{conv_id}/")
        self.assertEqual(delete_resp.status_code, 204)
        self.assertIsNotNone(Conversation.all_objects.get(pk=conv_id).deleted_at)

        list_after_delete = self.client.get("/api/assistant/conversations/")
        self.assertEqual(list_after_delete.data["count"], 0)

        restore_resp = self.client.post(f"/api/assistant/conversations/{conv_id}/restore/")
        self.assertEqual(restore_resp.status_code, 200)
        self.assertIsNone(Conversation.all_objects.get(pk=conv_id).deleted_at)

    def test_search_by_title(self):
        Conversation.objects.create(owner=self.user, title="Algebra help")
        Conversation.objects.create(owner=self.user, title="Physics revision")

        resp = self.client.get("/api/assistant/conversations/?q=algebra")
        self.assertEqual(resp.data["count"], 1)
        self.assertEqual(resp.data["results"][0]["title"], "Algebra help")


@override_settings(AI_PROVIDER="mock")
class MessageApiTests(TestCase):
    def setUp(self):
        self.user = _make_user()
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.conversation = Conversation.objects.create(owner=self.user)

    def test_send_message_generates_mock_reply_and_updates_conversation(self):
        resp = self.client.post(
            f"/api/assistant/conversations/{self.conversation.id}/messages/",
            {"content": "What is a derivative?"},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        events = _parse_sse_events(resp)
        user_event = next(e for e in events if e["type"] == "user_message")
        final_event = _terminal_event(events)

        self.assertEqual(user_event["message"]["role"], "user")
        self.assertEqual(final_event["type"], "message")
        self.assertEqual(final_event["message"]["role"], "assistant")
        self.assertEqual(final_event["message"]["status"], "sent")
        self.assertIn("Mock AI", final_event["message"]["content"])

        self.conversation.refresh_from_db()
        self.assertIsNotNone(self.conversation.last_message_at)
        self.assertEqual(self.conversation.title, "What is a derivative?")

    def test_send_message_with_educational_context_is_reflected_in_reply(self):
        resp = self.client.post(
            f"/api/assistant/conversations/{self.conversation.id}/messages/",
            {
                "content": "Help me with this",
                "educational_context": {"subject": "Mathematics", "subtopic": "Ածանցյալ"},
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        final_event = _terminal_event(_parse_sse_events(resp))
        self.assertIn("Ածանցյալ", final_event["message"]["content"])

    def test_new_tutor_modes_are_accepted(self):
        for mode in ["explain_mode", "teach_it_to_me", "why_am_i_wrong"]:
            resp = self.client.post(
                f"/api/assistant/conversations/{self.conversation.id}/messages/",
                {"content": "Help", "educational_context": {"conversation_mode": mode}},
                format="json",
            )
            self.assertEqual(resp.status_code, 200, f"mode {mode} was rejected")
            self.assertEqual(_terminal_event(_parse_sse_events(resp))["type"], "message")

    def test_invalid_conversation_mode_is_rejected(self):
        resp = self.client.post(
            f"/api/assistant/conversations/{self.conversation.id}/messages/",
            {"content": "Help", "educational_context": {"conversation_mode": "not_a_real_mode"}},
            format="json",
        )
        self.assertEqual(resp.status_code, 400)

    def test_regenerate_marks_old_response_inactive(self):
        send_resp = self.client.post(
            f"/api/assistant/conversations/{self.conversation.id}/messages/",
            {"content": "Explain logarithms"},
            format="json",
        )
        assistant_id = _terminal_event(_parse_sse_events(send_resp))["message"]["id"]

        regen_resp = self.client.post(f"/api/assistant/messages/{assistant_id}/regenerate/")
        self.assertEqual(regen_resp.status_code, 200)
        new_id = _terminal_event(_parse_sse_events(regen_resp))["message"]["id"]
        self.assertNotEqual(new_id, assistant_id)

        old_message = Message.objects.get(pk=assistant_id)
        self.assertFalse(old_message.is_active_response)

        list_resp = self.client.get(f"/api/assistant/conversations/{self.conversation.id}/messages/")
        assistant_messages = [m for m in list_resp.data if m["role"] == "assistant"]
        self.assertEqual(len(assistant_messages), 1)
        self.assertEqual(assistant_messages[0]["id"], new_id)

    def test_edit_user_message(self):
        send_resp = self.client.post(
            f"/api/assistant/conversations/{self.conversation.id}/messages/",
            {"content": "original"},
            format="json",
        )
        events = _parse_sse_events(send_resp)
        user_id = next(e for e in events if e["type"] == "user_message")["message"]["id"]

        edit_resp = self.client.patch(f"/api/assistant/messages/{user_id}/", {"content": "edited"})
        self.assertEqual(edit_resp.status_code, 200)
        self.assertEqual(edit_resp.data["content"], "edited")
        self.assertIsNotNone(edit_resp.data["edited_at"])

    def test_cannot_edit_assistant_message(self):
        send_resp = self.client.post(
            f"/api/assistant/conversations/{self.conversation.id}/messages/",
            {"content": "hi"},
            format="json",
        )
        assistant_id = _terminal_event(_parse_sse_events(send_resp))["message"]["id"]
        edit_resp = self.client.patch(f"/api/assistant/messages/{assistant_id}/", {"content": "hacked"})
        self.assertEqual(edit_resp.status_code, 400)


@override_settings(AI_PROVIDER="mock")
class ToolCallingTests(TestCase):
    def setUp(self):
        self.user = _make_user()
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.conversation = Conversation.objects.create(owner=self.user)

    def _send(self, content):
        return self.client.post(
            f"/api/assistant/conversations/{self.conversation.id}/messages/",
            {"content": content},
            format="json",
        )

    def test_get_profile_tool_call(self):
        resp = self._send("Ինչ մակարդակի (level) վրա եմ ես?")
        self.assertEqual(resp.status_code, 200)
        events = _parse_sse_events(resp)
        self.assertIn({"type": "tool_call", "tool_name": "get_profile"}, events)
        final = _terminal_event(events)
        assistant_id = final["message"]["id"]
        tool_calls = final["message"]["tool_calls"]
        self.assertEqual(len(tool_calls), 1)
        self.assertEqual(tool_calls[0]["tool_name"], "get_profile")
        self.assertEqual(tool_calls[0]["status"], "success")
        self.assertIn("level", tool_calls[0]["result"])
        self.assertEqual(ToolCall.objects.filter(message_id=assistant_id).count(), 1)

    def test_get_study_plan_tool_call(self):
        resp = self._send("Ինչ պլան ունեմ այսօր?")
        self.assertEqual(resp.status_code, 200)
        tool_calls = _terminal_event(_parse_sse_events(resp))["message"]["tool_calls"]
        self.assertEqual(tool_calls[0]["tool_name"], "get_study_plan")
        self.assertEqual(tool_calls[0]["status"], "success")
        self.assertIn("headline", tool_calls[0]["result"])

    def test_get_mistakes_tool_call(self):
        MistakeEntry.objects.create(
            user=self.user, source=MistakeEntrySource.PRACTICE,
            subject_name="Mathematics", topic_label="Algebra",
            question_type="multiple_choice", question_text="2+2=?",
            your_answer_text="5", correct_answer_text="4",
        )
        resp = self._send("Ինչ սխալներ ունեմ վերջերս?")
        self.assertEqual(resp.status_code, 200)
        tool_calls = _terminal_event(_parse_sse_events(resp))["message"]["tool_calls"]
        self.assertEqual(tool_calls[0]["tool_name"], "get_mistakes")
        self.assertEqual(tool_calls[0]["status"], "success")
        # Canonicalized to the Armenian label the student actually sees,
        # whichever spelling the source app snapshotted.
        self.assertEqual(tool_calls[0]["result"]["groups"][0]["subject_name"], "Մաթեմատիկա")

    def test_get_progress_tool_call(self):
        resp = self._send("Ինչպիսի՞ առաջընթաց ունեմ, ո՞ր թեմաներում եմ թույլ")
        self.assertEqual(resp.status_code, 200)
        tool_calls = _terminal_event(_parse_sse_events(resp))["message"]["tool_calls"]
        self.assertEqual(tool_calls[0]["tool_name"], "get_progress")
        self.assertEqual(tool_calls[0]["status"], "success")
        self.assertIn("weak_topics", tool_calls[0]["result"])

    def test_message_without_trigger_keyword_has_no_tool_calls(self):
        resp = self._send("Explain derivatives to me")
        self.assertEqual(resp.status_code, 200)
        final = _terminal_event(_parse_sse_events(resp))
        self.assertEqual(final["message"]["tool_calls"], [])
        self.assertIn("Mock AI", final["message"]["content"])
        self.assertEqual(ToolCall.objects.count(), 0)

    def test_tool_error_does_not_fail_the_turn(self):
        def _raise(*, user):
            raise RuntimeError("boom")

        with mock.patch.dict("apps.ai_assistant.tools.registry.TOOLS", {"get_profile": _raise}):
            resp = self._send("Ցույց տուր իմ պրոֆիլը")
            # Consuming the (lazy) SSE stream is what actually executes the
            # tool call — it must happen while the patch is still active.
            events = _parse_sse_events(resp)

        self.assertEqual(resp.status_code, 200)
        tool_calls = _terminal_event(events)["message"]["tool_calls"]
        self.assertEqual(tool_calls[0]["status"], "error")
        self.assertIn("boom", tool_calls[0]["result"]["error"])


class CrossUserIsolationTests(TestCase):
    def setUp(self):
        self.alice = _make_user("alice", "alice@example.com")
        self.bob = _make_user("bob", "bob@example.com")
        self.conversation = Conversation.objects.create(owner=self.alice)
        self.message = Message.objects.create(
            conversation=self.conversation, role=MessageRole.USER, content="secret"
        )
        self.client = APIClient()
        self.client.force_authenticate(self.bob)

    def test_other_user_cannot_access_conversation(self):
        resp = self.client.get(f"/api/assistant/conversations/{self.conversation.id}/")
        self.assertEqual(resp.status_code, 404)

    def test_other_user_cannot_edit_message(self):
        resp = self.client.patch(f"/api/assistant/messages/{self.message.id}/", {"content": "hacked"})
        self.assertEqual(resp.status_code, 404)


class AttachmentUploadTests(TestCase):
    def setUp(self):
        self.user = _make_user()
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.conversation = Conversation.objects.create(owner=self.user)

    def _upload(self, filename, content, content_type):
        file_obj = io.BytesIO(content)
        file_obj.name = filename
        return self.client.post(
            "/api/assistant/attachments/",
            {"conversation": self.conversation.id, "file": file_obj},
            format="multipart",
        )

    def test_rejects_disallowed_extension(self):
        resp = self._upload("virus.exe", b"MZ\x90\x00", "application/octet-stream")
        self.assertEqual(resp.status_code, 400)

    def test_rejects_spoofed_extension(self):
        # A tiny valid PNG signature won't match ".txt".
        png_bytes = b"\x89PNG\r\n\x1a\n" + b"\x00" * 20
        resp = self._upload("fake.txt", png_bytes, "text/plain")
        self.assertEqual(resp.status_code, 400)

    def test_accepts_plain_text_file(self):
        resp = self._upload("notes.txt", b"hello world", "text/plain")
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data["attachment_type"], "text")


class PromptBuilderTutorModeTests(TestCase):
    def setUp(self):
        self.user = _make_user()
        self.conversation = Conversation.objects.create(owner=self.user)

    def _system_prompt_for_mode(self, mode):
        from .services.prompt_builder import PromptBuilder
        from .services.rag_service import EducationalContext

        builder = PromptBuilder()
        context = EducationalContext(conversation_mode=mode)
        request = builder.build(self.conversation, "help", context, [])
        return request.system_prompt

    def test_explain_mode_framing_is_included(self):
        prompt = self._system_prompt_for_mode("explain_mode")
        self.assertIn("not a", prompt)
        self.assertIn("Socratic", prompt)

    def test_teach_it_to_me_framing_is_included(self):
        prompt = self._system_prompt_for_mode("teach_it_to_me")
        self.assertIn("Feynman", prompt)

    def test_why_am_i_wrong_framing_is_included(self):
        prompt = self._system_prompt_for_mode("why_am_i_wrong")
        self.assertIn("misconception", prompt)
        self.assertIn("error category", prompt)

    def test_unknown_mode_is_silently_ignored(self):
        prompt = self._system_prompt_for_mode("not_a_real_mode")
        self.assertNotIn("Feynman", prompt)
        self.assertNotIn("RIGHT NOW", prompt)

    def test_learner_context_appears_when_present(self):
        from apps.profiles.models import StudentSubject

        StudentSubject.objects.create(user=self.user, subject_key="math", priority="high")
        prompt = self._system_prompt_for_mode(None)
        self.assertIn("Student profile", prompt)
        self.assertIn("math", prompt)

    def test_learner_context_omitted_when_empty(self):
        prompt = self._system_prompt_for_mode(None)
        self.assertNotIn("Student profile", prompt)


class LearningPreferenceDirectiveTests(TestCase):
    def setUp(self):
        self.user = _make_user()
        self.conversation = Conversation.objects.create(owner=self.user)

    def _system_prompt(self, mode=None):
        from .services.prompt_builder import PromptBuilder
        from .services.rag_service import EducationalContext

        builder = PromptBuilder()
        context = EducationalContext(conversation_mode=mode)
        request = builder.build(self.conversation, "help", context, [])
        return request.system_prompt

    def test_direct_style_defaults_to_explain_mode_framing_when_no_mode_set(self):
        LearningPreferences.objects.create(user=self.user, explanation_style="direct")
        prompt = self._system_prompt()
        self.assertIn("not a", prompt)
        self.assertIn("Socratic back-and-forth", prompt)

    def test_explicit_mode_overrides_preference_default(self):
        LearningPreferences.objects.create(user=self.user, explanation_style="direct")
        prompt = self._system_prompt(mode="teach_it_to_me")
        self.assertIn("Feynman", prompt)
        self.assertNotIn("Socratic back-and-forth", prompt)

    def test_hints_before_answers_false_adds_opt_out_directive(self):
        LearningPreferences.objects.create(user=self.user, hints_before_answers=False)
        prompt = self._system_prompt()
        self.assertIn("opted out of hints-first", prompt)

    def test_preferred_language_adds_directive(self):
        LearningPreferences.objects.create(user=self.user, preferred_language="en")
        prompt = self._system_prompt()
        self.assertIn("Always respond in English", prompt)

    def test_no_preferences_no_directives(self):
        prompt = self._system_prompt()
        self.assertNotIn("opted out of hints-first", prompt)
        self.assertNotIn("Always respond in", prompt)


@override_settings(AI_PROVIDER="mock")
class LearningEventRecordingTests(TestCase):
    def setUp(self):
        self.user = _make_user()
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.conversation = Conversation.objects.create(owner=self.user)

    def _send(self, mode):
        resp = self.client.post(
            f"/api/assistant/conversations/{self.conversation.id}/messages/",
            {"content": "Help", "educational_context": {"conversation_mode": mode, "subject": "math"}},
            format="json",
        )
        _parse_sse_events(resp)  # drives the (lazy) generator so side effects actually run
        return resp

    def test_explain_mode_records_explanation_requested(self):
        self._send("explain_mode")
        event = LearningEvent.objects.get(user=self.user, event_type=LearningEventType.EXPLANATION_REQUESTED)
        self.assertEqual(event.subject_key, "math")
        self.assertEqual(event.source, "ai_assistant")

    def test_why_am_i_wrong_records_explanation_requested(self):
        self._send("why_am_i_wrong")
        self.assertTrue(
            LearningEvent.objects.filter(user=self.user, event_type=LearningEventType.EXPLANATION_REQUESTED).exists()
        )

    def test_teach_it_to_me_records_concept_reviewed(self):
        self._send("teach_it_to_me")
        self.assertTrue(
            LearningEvent.objects.filter(user=self.user, event_type=LearningEventType.CONCEPT_REVIEWED).exists()
        )

    def test_default_chat_mode_records_no_event(self):
        self._send("general_chat")
        self.assertFalse(LearningEvent.objects.filter(user=self.user).exists())

    def test_invalid_subject_key_stored_as_blank(self):
        resp = self.client.post(
            f"/api/assistant/conversations/{self.conversation.id}/messages/",
            {"content": "Help", "educational_context": {"conversation_mode": "explain_mode", "subject": "not_a_real_subject"}},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        _parse_sse_events(resp)  # drives the (lazy) generator so side effects actually run
        event = LearningEvent.objects.get(user=self.user, event_type=LearningEventType.EXPLANATION_REQUESTED)
        self.assertEqual(event.subject_key, "")


class LearnerContextFormattingTests(TestCase):
    """The learner briefing goes into the system prompt of every single turn,
    so anything malformed in it is paid for on every message. These lock down
    the two things that were wrong: a raw dict repr leaking into the prompt,
    and an activity line the tutor couldn't act on."""

    def setUp(self):
        self.user = _make_user()
        self.conversation = Conversation.objects.create(owner=self.user)

    def _system_prompt(self):
        from .services.prompt_builder import PromptBuilder
        from .services.rag_service import EducationalContext

        return PromptBuilder().build(
            self.conversation, "help", EducationalContext(), []
        ).system_prompt

    def test_goal_progress_is_rendered_as_numbers_not_a_dict_repr(self):
        from apps.profiles.models import GoalType, PersonalGoal

        PersonalGoal.objects.create(user=self.user, goal_type=GoalType.STREAK_DAYS, target_value=14)
        prompt = self._system_prompt()
        self.assertIn("streak_days", prompt)
        self.assertIn("/14", prompt)
        # analytics.goal_progress() returns a dict; it used to be interpolated
        # straight into the prompt as "{'current': 5, ...}% done".
        self.assertNotIn("'is_complete'", prompt)
        self.assertNotIn("'percent'", prompt)

    def test_grade_is_included_so_the_tutor_can_pitch_the_level(self):
        self.user.grade = 9
        self.user.save(update_fields=["grade"])
        self.assertIn("School grade: 9", self._system_prompt())

    def test_recent_events_carry_topic_and_result_not_just_a_type(self):
        from apps.profiles.models import LearningEvent, LearningEventType

        LearningEvent.objects.create(
            user=self.user, event_type=LearningEventType.QUESTION_ANSWERED,
            subject_key="math", topic_label="Ածանցյալ", result="incorrect",
        )
        prompt = self._system_prompt()
        self.assertIn("question_answered (Ածանցյալ): incorrect", prompt)

    def test_conversation_mode_is_the_last_thing_in_the_prompt(self):
        """The per-message mode is the narrowest rule in the prompt and the
        one the model is most likely to drop, so it sits closest to the
        student's message — and, being the only volatile section, last is
        also where it costs the least cached prefix."""
        from apps.profiles.models import StudentSubject
        from .services.prompt_builder import PromptBuilder
        from .services.rag_service import EducationalContext

        StudentSubject.objects.create(user=self.user, subject_key="math", priority="high")
        prompt = PromptBuilder().build(
            self.conversation, "help",
            EducationalContext(conversation_mode="solving_question"), [],
        ).system_prompt
        self.assertGreater(prompt.index("RIGHT NOW"), prompt.index("--- Student profile ---"))


class ToolSubjectFilterTests(TestCase):
    """A `subject` filter that matched a display name silently returned an
    empty result for at least one of its two data sources, whichever name was
    passed — and an empty result reads to the model as "this student has no
    mistakes", which is how it ends up inventing a list of weak topics."""

    def setUp(self):
        self.user = _make_user()

    def _mistake(self, subject_name, topic, mistake_type=None):
        from apps.mistakes.models import MistakeType

        return MistakeEntry.objects.create(
            user=self.user, source=MistakeEntrySource.PRACTICE,
            mistake_type=mistake_type or MistakeType.INCORRECT,
            subject_name=subject_name, topic_label=topic,
            question_type="multiple_choice", question_text="2+2=?",
            your_answer_text="5", correct_answer_text="4",
        )

    def test_every_spelling_of_a_subject_resolves_to_the_same_key(self):
        from .tools.handlers import _resolve_subject_key

        for value in ["math", "Math", "Mathematics", "Մաթեմատիկա"]:
            self.assertEqual(_resolve_subject_key(value), "math", value)
        self.assertEqual(_resolve_subject_key("Կենսաբանություն"), "biology")
        self.assertIsNone(_resolve_subject_key(None))

    def test_unknown_subject_reports_the_valid_keys_instead_of_filtering_to_nothing(self):
        from .tools import registry

        result = registry.execute("get_mistakes", {"subject": "Հանրահաշիվ"}, user=self.user)
        self.assertIn("error", result)
        self.assertIn("math", result["error"])

    def test_mistakes_filter_matches_both_stored_spellings(self):
        from .tools import handlers

        self._mistake("Մաթեմատիկա", "Անհավասարումներ")
        self._mistake("Mathematics", "Անհավասարումներ")
        self._mistake("Ֆիզիկա", "Ուժեր")

        groups = handlers.get_mistakes(user=self.user, subject="math")["groups"]
        self.assertEqual(len(groups), 1, groups)
        # Same subject, two spellings, one group — not two half-sized ones.
        self.assertEqual(groups[0]["subject_name"], "Մաթեմատիկա")
        self.assertEqual(groups[0]["mistake_count"], 2)

    def test_blank_answers_are_counted_separately_from_wrong_ones(self):
        from apps.mistakes.models import MistakeType

        from .tools import handlers

        self._mistake("Մաթեմատիկա", "Անհավասարումներ")
        self._mistake("Մաթեմատիկա", "Անհավասարումներ", MistakeType.NOT_ATTEMPTED)

        group = handlers.get_mistakes(user=self.user, subject="math")["groups"][0]
        self.assertEqual(group["mistake_count"], 2)
        self.assertEqual(group["not_attempted_count"], 1)

    def test_progress_filters_mock_exams_by_key_not_display_name(self):
        from apps.mock_exams.models import (
            MockExam, MockExamAttempt, MockExamAttemptStatus, MockExamSubject,
        )

        from .tools import handlers

        for key in [MockExamSubject.MATH, MockExamSubject.PHYSICS]:
            exam = MockExam.objects.create(
                exam_id=f"{key}-1", title=f"{key} exam", subject=key, question_count=65,
            )
            MockExamAttempt.objects.create(
                user=self.user, exam=exam, status=MockExamAttemptStatus.COMPLETED,
                scaled_score=10,
            )

        result = handlers.get_progress(user=self.user, subject="math")
        self.assertEqual(len(result["recent_mock_exams"]), 1)
        self.assertEqual(result["recent_mock_exams"][0]["subject_name"], "Mathematics")

    def test_subject_arguments_are_declared_as_an_enum_of_keys(self):
        from .tools.definitions import SUBJECT_KEYS, TOOL_DEFINITIONS

        self.assertEqual(SUBJECT_KEYS, ["biology", "chemistry", "english", "math", "physics"])
        for definition in TOOL_DEFINITIONS:
            subject = definition["function"]["parameters"]["properties"].get("subject")
            if subject is not None:
                self.assertEqual(subject["enum"], SUBJECT_KEYS, definition["function"]["name"])


class RenderingContractTests(TestCase):
    """The prompt is one half of a contract with the frontend renderer. If
    these names drift apart, the student sees raw `:::` markers or literal
    LaTeX — so the contract is asserted here rather than left to review.

    Frontend side: frontend/src/lib/assistantContent/parse.ts (CALLOUT_NAMES,
    DIAGNOSIS_STEPS, NEXT_MAX_ITEM_CHARS) and frontend/src/components/
    MathText.tsx (MATH_SPLIT)."""

    def test_every_directive_the_renderer_understands_is_documented(self):
        from .prompts import BASE_SYSTEM_PROMPT

        for name in ["concept", "example", "mistake", "tip", "important",
                     "checkpoint", "diagnosis", "next"]:
            self.assertIn(f":::{name}", BASE_SYSTEM_PROMPT, name)
        for sub_marker in ["::hint", "::answer", "::drift", "::correct", "::practice"]:
            self.assertIn(f"`{sub_marker}`", BASE_SYSTEM_PROMPT, sub_marker)
        self.assertIn("under 40 ", BASE_SYSTEM_PROMPT)

    def test_math_delimiters_match_the_renderer_and_nothing_contradicts_them(self):
        from .prompts import BASE_SYSTEM_PROMPT

        self.assertIn("`$...$`", BASE_SYSTEM_PROMPT)
        self.assertIn("`$$...$$`", BASE_SYSTEM_PROMPT)
        # The old VOICE section told the model to put formulas in code
        # fences, which is exactly where the renderer refuses to see math.
        self.assertIn("never for formulas", BASE_SYSTEM_PROMPT)
        self.assertIn("never put math inside a code fence", BASE_SYSTEM_PROMPT)

    def test_armenian_is_the_default_output_language(self):
        from .prompts import BASE_SYSTEM_PROMPT

        self.assertIn("answer in Armenian by default", BASE_SYSTEM_PROMPT)
