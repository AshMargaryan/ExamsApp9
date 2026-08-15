from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.profiles.models import LearningEvent, LearningEventType

from .models import (
    DailyProblemAttempt, Domain, MistakeSource, Question, QuestionType,
    Subject, Subtopic, Tier, Topic, TopicMistake,
)
from .services import get_daily_question, get_daily_question_reason

User = get_user_model()


def _make_user(username="alice"):
    return User.objects.create_user(username=username, email=f"{username}@example.com", password="pw123456")


def _make_subtopic(subject_name="Մաթեմատիկա", topic_name="Ֆունկցիաներ", subtopic_name="Ածանցյալ"):
    subject, _ = Subject.objects.get_or_create(name=subject_name)
    domain, _ = Domain.objects.get_or_create(subject=subject, name="Վերլուծություն")
    topic, _ = Topic.objects.get_or_create(domain=domain, name=topic_name)
    return Subtopic.objects.create(topic=topic, name=subtopic_name)


def _make_question(subtopic, tier=Tier.EASY, dataset_id="q1"):
    return Question.objects.create(
        subtopic=subtopic, tier=tier, question_type=QuestionType.SHORT_ANSWER,
        text="2+2=?", correct_answer_text="4", dataset_id=dataset_id,
    )


class DailyQuestionPersonalizationTests(TestCase):
    def setUp(self):
        self.user = _make_user()
        self.other_subtopic = _make_subtopic(subtopic_name="Ինտեգրալ")
        _make_question(self.other_subtopic, dataset_id="other-1")

        self.weak_subtopic = _make_subtopic(subtopic_name="Ածանցյալ")
        self.weak_question = _make_question(self.weak_subtopic, dataset_id="weak-1")

        TopicMistake.objects.create(
            student=self.user, source=MistakeSource.PRACTICE,
            subject_name="Մաթեմատիկա", topic_label="Ածանցյալ",
            subtopic=self.weak_subtopic, incorrect_count=3,
            last_incorrect_at=timezone.now(),
        )

    def test_prefers_weak_subtopic_question(self):
        question = get_daily_question(self.user, timezone.localdate())
        self.assertEqual(question.subtopic_id, self.weak_subtopic.id)

    def test_stable_across_repeat_calls_same_day(self):
        today = timezone.localdate()
        first = get_daily_question(self.user, today)
        second = get_daily_question(self.user, today)
        self.assertEqual(first.id, second.id)

    def test_falls_back_to_global_pick_without_personalization(self):
        other_user = _make_user("bob")
        question = get_daily_question(other_user, timezone.localdate())
        self.assertIsNotNone(question)

    def test_returns_stored_attempt_question_once_answered(self):
        today = timezone.localdate()
        attempt_question = _make_question(self.other_subtopic, dataset_id="answered-1")
        DailyProblemAttempt.objects.create(
            user=self.user, date=today, question=attempt_question, is_correct=True,
        )
        # Even though the weak subtopic would otherwise win, a stored answer
        # for today always wins — the shown question must match what was graded.
        question = get_daily_question(self.user, today)
        self.assertEqual(question.id, attempt_question.id)

    def test_reason_reflects_weak_topic(self):
        reason = get_daily_question_reason(self.user, self.weak_question)
        self.assertEqual(reason["kind"], "weak_topic")
        self.assertEqual(reason["incorrect_count"], 3)

    def test_reason_defaults_without_mistake_data(self):
        other_question = self.other_subtopic.questions.first()
        reason = get_daily_question_reason(self.user, other_question)
        self.assertEqual(reason["kind"], "default")

    def test_reason_defaults_for_anonymous(self):
        reason = get_daily_question_reason(None, self.weak_question)
        self.assertEqual(reason["kind"], "default")


class DailyProblemViewTests(TestCase):
    def setUp(self):
        self.user = _make_user()
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.subtopic = _make_subtopic()
        _make_question(self.subtopic, dataset_id="view-1")

    def test_get_includes_reason_and_breadcrumb(self):
        resp = self.client.get("/api/practice/daily-problem/")
        self.assertEqual(resp.status_code, 200)
        self.assertIn("reason", resp.data)
        self.assertIn("kind", resp.data["reason"])
        self.assertIn("topic_name", resp.data["question"])
        self.assertIn("subtopic_name", resp.data["question"])
        self.assertIn("subtopic_id", resp.data["question"])


class QuestionHintViewedTests(TestCase):
    def setUp(self):
        self.user = _make_user()
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.subtopic = _make_subtopic()
        self.question = _make_question(self.subtopic, dataset_id="hint-1")

    def test_records_hint_requested_event(self):
        resp = self.client.post(f"/api/practice/questions/{self.question.id}/hint-viewed/")
        self.assertEqual(resp.status_code, 204)

        event = LearningEvent.objects.get(user=self.user, event_type=LearningEventType.HINT_REQUESTED)
        self.assertEqual(event.subject_key, "math")
        self.assertEqual(event.topic_label, self.subtopic.name)
        self.assertEqual(event.source, "practice")
        self.assertEqual(event.target_id, self.question.id)

    def test_unmapped_subject_stores_blank_subject_key(self):
        subtopic = _make_subtopic(subject_name="Աշխարհագրություն", topic_name="T", subtopic_name="S")
        question = _make_question(subtopic, dataset_id="hint-2")
        resp = self.client.post(f"/api/practice/questions/{question.id}/hint-viewed/")
        self.assertEqual(resp.status_code, 204)
        event = LearningEvent.objects.get(user=self.user, event_type=LearningEventType.HINT_REQUESTED)
        self.assertEqual(event.subject_key, "")

    def test_404_for_unknown_question(self):
        resp = self.client.post("/api/practice/questions/999999/hint-viewed/")
        self.assertEqual(resp.status_code, 404)

    def test_requires_authentication(self):
        self.client.force_authenticate(None)
        resp = self.client.post(f"/api/practice/questions/{self.question.id}/hint-viewed/")
        self.assertEqual(resp.status_code, 401)
