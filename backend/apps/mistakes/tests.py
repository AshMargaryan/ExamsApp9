import json
from unittest import mock

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.ai_assistant.providers.base import AIResponse
from apps.ai_assistant.services.ai_service import AIProviderError

from .classification import classify_mistake
from .models import ErrorCategory, MistakeEntry, MistakeEntrySource, MistakeType

User = get_user_model()


def _make_user(username="alice", **extra):
    return User.objects.create_user(username=username, email=f"{username}@example.com", password="pw123456", **extra)


def _make_entry(user, **overrides):
    defaults = dict(
        user=user, source=MistakeEntrySource.PRACTICE, mistake_type=MistakeType.INCORRECT,
        subject_name="Մաթեմատիկա", topic_label="Ածանցյալ", question_type="multiple_choice",
        question_text="2+2=?", your_answer_text="5", correct_answer_text="4",
    )
    defaults.update(overrides)
    return MistakeEntry.objects.create(**defaults)


def _mock_ai_response(payload: dict):
    return (AIResponse(content=json.dumps(payload), model_used="test"), 10)


class ClassifyMistakeServiceTests(TestCase):
    def setUp(self):
        self.user = _make_user()

    @mock.patch("apps.ai_assistant.services.ai_service.AIService.generate")
    def test_classifies_and_caches_result(self, mock_generate):
        mock_generate.return_value = _mock_ai_response(
            {"category": "careless_slip", "explanation": "Just a slip."}
        )
        entry = _make_entry(self.user)

        classified = classify_mistake(entry)

        self.assertTrue(classified)
        entry.refresh_from_db()
        self.assertEqual(entry.error_category, ErrorCategory.CARELESS_SLIP)
        self.assertEqual(entry.error_explanation, "Just a slip.")
        self.assertIsNotNone(entry.classified_at)
        mock_generate.assert_called_once()

    @mock.patch("apps.ai_assistant.services.ai_service.AIService.generate")
    def test_second_call_is_a_no_op(self, mock_generate):
        mock_generate.return_value = _mock_ai_response(
            {"category": "process_error", "explanation": "Wrong method."}
        )
        entry = _make_entry(self.user)
        classify_mistake(entry)
        mock_generate.reset_mock()

        classified_again = classify_mistake(entry)

        self.assertFalse(classified_again)
        mock_generate.assert_not_called()

    @mock.patch("apps.ai_assistant.services.ai_service.AIService.generate")
    def test_not_attempted_entries_are_skipped(self, mock_generate):
        entry = _make_entry(self.user, mistake_type=MistakeType.NOT_ATTEMPTED)

        classified = classify_mistake(entry)

        self.assertFalse(classified)
        mock_generate.assert_not_called()
        self.assertEqual(entry.error_category, ErrorCategory.UNCLASSIFIED)

    @mock.patch("apps.ai_assistant.services.ai_service.AIService.generate")
    def test_provider_failure_leaves_entry_unclassified(self, mock_generate):
        mock_generate.side_effect = AIProviderError("boom")
        entry = _make_entry(self.user)

        classified = classify_mistake(entry)

        self.assertFalse(classified)
        entry.refresh_from_db()
        self.assertEqual(entry.error_category, ErrorCategory.UNCLASSIFIED)
        self.assertIsNone(entry.classified_at)

    @mock.patch("apps.ai_assistant.services.ai_service.AIService.generate")
    def test_malformed_json_leaves_entry_unclassified(self, mock_generate):
        mock_generate.return_value = (AIResponse(content="not json at all", model_used="test"), 5)
        entry = _make_entry(self.user)

        classified = classify_mistake(entry)

        self.assertFalse(classified)
        entry.refresh_from_db()
        self.assertEqual(entry.error_category, ErrorCategory.UNCLASSIFIED)

    @mock.patch("apps.ai_assistant.services.ai_service.AIService.generate")
    def test_unknown_category_leaves_entry_unclassified(self, mock_generate):
        mock_generate.return_value = _mock_ai_response({"category": "not_a_real_category", "explanation": "x"})
        entry = _make_entry(self.user)

        classified = classify_mistake(entry)

        self.assertFalse(classified)
        entry.refresh_from_db()
        self.assertEqual(entry.error_category, ErrorCategory.UNCLASSIFIED)


class MistakeClassifyViewTests(TestCase):
    def setUp(self):
        self.user = _make_user()
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    @mock.patch("apps.ai_assistant.services.ai_service.AIService.generate")
    def test_classify_endpoint_returns_updated_entry(self, mock_generate):
        mock_generate.return_value = _mock_ai_response(
            {"category": "conceptual_gap", "explanation": "Doesn't understand X."}
        )
        entry = _make_entry(self.user)

        resp = self.client.post(f"/api/mistakes/{entry.id}/classify/")

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["error_category"], "conceptual_gap")
        self.assertEqual(resp.data["error_explanation"], "Doesn't understand X.")
        self.assertIsNotNone(resp.data["classified_at"])

    def test_cannot_classify_another_users_mistake(self):
        other = _make_user("bob")
        entry = _make_entry(other)

        resp = self.client.post(f"/api/mistakes/{entry.id}/classify/")

        self.assertEqual(resp.status_code, 404)

    @mock.patch("apps.ai_assistant.services.ai_service.AIService.generate")
    def test_classify_second_call_does_not_recall_ai(self, mock_generate):
        mock_generate.return_value = _mock_ai_response({"category": "careless_slip", "explanation": "x"})
        entry = _make_entry(self.user)

        self.client.post(f"/api/mistakes/{entry.id}/classify/")
        mock_generate.reset_mock()
        resp = self.client.post(f"/api/mistakes/{entry.id}/classify/")

        self.assertEqual(resp.status_code, 200)
        mock_generate.assert_not_called()
