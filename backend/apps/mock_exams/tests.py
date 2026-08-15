from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.knowledge.models import DataSufficiency, SubjectMastery
from apps.mistakes.models import ErrorCategory, MistakeEntry, MistakeEntrySource, MistakeType
from apps.profiles.models import LearningEvent, LearningEventType

from .models import MockExam, MockExamAnswer, MockExamAttempt, MockExamDifficulty, MockExamQuestion, MockExamQuestionType

User = get_user_model()


def _make_user(username="alice", **extra):
    return User.objects.create_user(username=username, email=f"{username}@example.com", password="pw123456", **extra)


def _make_exam(subject="math"):
    return MockExam.objects.create(exam_id=f"e-{subject}", title="Exam", question_count=2, subject=subject)


def _make_question(exam, n=1):
    return MockExamQuestion.objects.create(
        exam=exam, number=n, question_type=MockExamQuestionType.SINGLE_CHOICE,
        text=f"q{n}", difficulty=MockExamDifficulty.EASY, dataset_id=f"{exam.exam_id}-{n}",
    )


class AttemptAutopsyViewTests(TestCase):
    def setUp(self):
        self.user = _make_user()
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.exam = _make_exam(subject="physics")
        self.q1 = _make_question(self.exam, 1)
        self.q2 = _make_question(self.exam, 2)
        self.attempt = MockExamAttempt.objects.create(user=self.user, exam=self.exam)

    def _wrong_answer(self, question):
        return MockExamAnswer.objects.create(attempt=self.attempt, question=question, is_correct=False)

    def _mistake_entry(self, question, *, error_category=None, classified=True):
        return MistakeEntry.objects.create(
            user=self.user, source=MistakeEntrySource.MOCK_EXAM, mistake_type=MistakeType.INCORRECT,
            subject_name="Ֆիզիկա", topic_label="", question_type="single_choice",
            question_text=question.text, your_answer_text="a", correct_answer_text="b",
            content_object=question,
            error_category=error_category or ErrorCategory.UNCLASSIFIED,
            classified_at=timezone.now() if classified else None,
        )

    def test_autopsy_returns_empty_state_with_no_data(self):
        resp = self.client.get(f"/api/mock-exams/attempts/{self.attempt.id}/autopsy/")
        self.assertEqual(resp.status_code, 200)
        self.assertIsNone(resp.data["subject_mastery"])
        self.assertIsNone(resp.data["dominant_error_category"])
        self.assertEqual(resp.data["mistakes_by_question"], {})

    def test_includes_current_subject_mastery(self):
        SubjectMastery.objects.create(
            user=self.user, subject_key="physics", mastery_score=55, data_sufficiency=DataSufficiency.MEDIUM,
        )
        resp = self.client.get(f"/api/mock-exams/attempts/{self.attempt.id}/autopsy/")
        self.assertEqual(resp.data["subject_mastery"]["mastery_score"], 55)

    def test_maps_wrong_questions_to_classified_mistakes(self):
        self._wrong_answer(self.q1)
        entry = self._mistake_entry(self.q1, error_category=ErrorCategory.CONCEPTUAL_GAP)

        resp = self.client.get(f"/api/mock-exams/attempts/{self.attempt.id}/autopsy/")

        data = resp.data["mistakes_by_question"][str(self.q1.id)]
        self.assertEqual(data["mistake_entry_id"], entry.id)
        self.assertEqual(data["error_category"], "conceptual_gap")
        self.assertEqual(resp.data["dominant_error_category"], "conceptual_gap")

    def test_unclassified_mistakes_excluded_from_dominant_category(self):
        self._wrong_answer(self.q1)
        self._mistake_entry(self.q1, classified=False)

        resp = self.client.get(f"/api/mock-exams/attempts/{self.attempt.id}/autopsy/")

        self.assertIsNone(resp.data["dominant_error_category"])
        self.assertIn(str(self.q1.id), resp.data["mistakes_by_question"])

    def test_most_recent_mistake_entry_wins_for_a_question(self):
        self._wrong_answer(self.q1)
        self._mistake_entry(self.q1, error_category=ErrorCategory.CARELESS_SLIP)
        newer = self._mistake_entry(self.q1, error_category=ErrorCategory.PROCESS_ERROR)

        resp = self.client.get(f"/api/mock-exams/attempts/{self.attempt.id}/autopsy/")

        data = resp.data["mistakes_by_question"][str(self.q1.id)]
        self.assertEqual(data["mistake_entry_id"], newer.id)
        self.assertEqual(data["error_category"], "process_error")

    def test_correctly_answered_questions_excluded(self):
        MockExamAnswer.objects.create(attempt=self.attempt, question=self.q1, is_correct=True)
        resp = self.client.get(f"/api/mock-exams/attempts/{self.attempt.id}/autopsy/")
        self.assertEqual(resp.data["mistakes_by_question"], {})

    def test_cannot_view_another_users_attempt_autopsy(self):
        other = _make_user("bob")
        other_attempt = MockExamAttempt.objects.create(user=other, exam=self.exam)
        resp = self.client.get(f"/api/mock-exams/attempts/{other_attempt.id}/autopsy/")
        self.assertEqual(resp.status_code, 404)


class FinishAttemptLearningEventTests(TestCase):
    def setUp(self):
        self.user = _make_user()
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.exam = _make_exam(subject="physics")
        self.q1 = _make_question(self.exam, 1)
        self.attempt = MockExamAttempt.objects.create(user=self.user, exam=self.exam)

    def test_finishing_an_attempt_records_exam_completed_event(self):
        resp = self.client.post(f"/api/mock-exams/attempts/{self.attempt.id}/finish/", {"answers": []}, format="json")
        self.assertEqual(resp.status_code, 200)

        event = LearningEvent.objects.get(user=self.user, event_type=LearningEventType.EXAM_COMPLETED)
        self.assertEqual(event.subject_key, "physics")
        self.assertEqual(event.source, "mock_exams")
        self.assertEqual(event.target_id, self.attempt.id)
        self.assertEqual(event.result, "0/1")

    def test_no_event_recorded_if_already_completed(self):
        self.client.post(f"/api/mock-exams/attempts/{self.attempt.id}/finish/", {"answers": []}, format="json")
        resp = self.client.post(f"/api/mock-exams/attempts/{self.attempt.id}/finish/", {"answers": []}, format="json")
        self.assertEqual(resp.status_code, 409)
        self.assertEqual(LearningEvent.objects.filter(user=self.user, event_type=LearningEventType.EXAM_COMPLETED).count(), 1)


class QuestionHintViewedTests(TestCase):
    def setUp(self):
        self.user = _make_user()
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.exam = _make_exam(subject="chemistry")
        self.question = _make_question(self.exam, 1)
        self.question.topic = "Ատոմային կառուցվածք"
        self.question.save(update_fields=["topic"])

    def test_records_hint_requested_event(self):
        resp = self.client.post(f"/api/mock-exams/questions/{self.question.id}/hint-viewed/")
        self.assertEqual(resp.status_code, 204)

        event = LearningEvent.objects.get(user=self.user, event_type=LearningEventType.HINT_REQUESTED)
        self.assertEqual(event.subject_key, "chemistry")
        self.assertEqual(event.topic_label, "Ատոմային կառուցվածք")
        self.assertEqual(event.source, "mock_exams")
        self.assertEqual(event.target_id, self.question.id)

    def test_404_for_unknown_question(self):
        resp = self.client.post("/api/mock-exams/questions/999999/hint-viewed/")
        self.assertEqual(resp.status_code, 404)

    def test_requires_authentication(self):
        self.client.force_authenticate(None)
        resp = self.client.post(f"/api/mock-exams/questions/{self.question.id}/hint-viewed/")
        self.assertEqual(resp.status_code, 401)
