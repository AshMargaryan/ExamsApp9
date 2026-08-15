from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.flashcards.models import Flashcard, FlashcardDeck, FlashcardReview
from apps.mock_exams.models import MockExam, MockExamAnswer, MockExamAttempt, MockExamDifficulty, MockExamQuestion, MockExamQuestionType
from apps.practice.models import AttemptAnswer, PracticeAttempt, Question, QuestionType, Subject, Subtopic, Tier, Topic, Domain

from .models import DataSufficiency, SubjectMastery, TopicMastery
from .scoring import compute_mastery
from .services import recompute_subject_mastery, recompute_topic_mastery

User = get_user_model()


def _make_user(username="alice", **extra):
    return User.objects.create_user(username=username, email=f"{username}@example.com", password="pw123456", **extra)


def _make_subtopic():
    subject = Subject.objects.create(name="Մաթեմատիկա")
    domain = Domain.objects.create(subject=subject, name="Algebra")
    topic = Topic.objects.create(domain=domain, name="Equations")
    return Subtopic.objects.create(topic=topic, name="Linear equations")


def _make_question(subtopic, n=1):
    return Question.objects.create(
        subtopic=subtopic, tier=Tier.EASY, question_type=QuestionType.MULTIPLE_CHOICE,
        text=f"q{n}", dataset_id=f"ds-{subtopic.id}-{n}",
    )


class ScoringTests(TestCase):
    def test_no_events_returns_none_score(self):
        result = compute_mastery([])
        self.assertIsNone(result["mastery_score"])
        self.assertEqual(result["data_sufficiency"], DataSufficiency.LOW)

    def test_all_correct_recent_events_near_100(self):
        now = timezone.now()
        events = [(now - timedelta(days=i), True) for i in range(10)]
        result = compute_mastery(events, now=now)
        self.assertGreater(result["mastery_score"], 95)

    def test_recency_decay_weights_recent_more(self):
        now = timezone.now()
        # Old wrong answers, recent right answers -> should skew high.
        events = [(now - timedelta(days=200), False)] * 5 + [(now - timedelta(days=1), True)] * 5
        result = compute_mastery(events, now=now)
        self.assertGreater(result["mastery_score"], 70)

    def test_data_sufficiency_thresholds(self):
        now = timezone.now()
        low = compute_mastery([(now, True)] * 3, now=now)
        medium = compute_mastery([(now, True)] * 10, now=now)
        high = compute_mastery([(now, True)] * 20, now=now)
        self.assertEqual(low["data_sufficiency"], DataSufficiency.LOW)
        self.assertEqual(medium["data_sufficiency"], DataSufficiency.MEDIUM)
        self.assertEqual(high["data_sufficiency"], DataSufficiency.HIGH)


class PracticeMasterySignalTests(TestCase):
    def setUp(self):
        self.user = _make_user()
        self.subtopic = _make_subtopic()
        self.question = _make_question(self.subtopic)
        self.attempt = PracticeAttempt.objects.create(
            user=self.user, subtopic=self.subtopic, tier=Tier.EASY, completed_at=timezone.now(),
        )

    def test_correct_answer_updates_topic_and_subject_mastery(self):
        AttemptAnswer.objects.create(attempt=self.attempt, question=self.question, is_correct=True)

        topic_mastery = TopicMastery.objects.get(user=self.user, subtopic=self.subtopic)
        self.assertEqual(topic_mastery.mastery_score, 100.0)

        subject_mastery = SubjectMastery.objects.get(user=self.user, subject_key="math")
        self.assertEqual(subject_mastery.mastery_score, 100.0)

    def test_correct_answer_schedules_spaced_review(self):
        AttemptAnswer.objects.create(attempt=self.attempt, question=self.question, is_correct=True)
        topic_mastery = TopicMastery.objects.get(user=self.user, subtopic=self.subtopic)
        self.assertEqual(topic_mastery.interval_days, 1)
        self.assertIsNotNone(topic_mastery.next_review_at)

    def test_incorrect_answer_resets_review_schedule(self):
        AttemptAnswer.objects.create(attempt=self.attempt, question=self.question, is_correct=False)
        topic_mastery = TopicMastery.objects.get(user=self.user, subtopic=self.subtopic)
        self.assertEqual(topic_mastery.interval_days, 0)

    def test_revealed_answers_excluded(self):
        self.attempt.revealed_answers = True
        self.attempt.save()
        AttemptAnswer.objects.create(attempt=self.attempt, question=self.question, is_correct=True)

        topic_mastery = TopicMastery.objects.get(user=self.user, subtopic=self.subtopic)
        self.assertIsNone(topic_mastery.mastery_score)
        self.assertEqual(topic_mastery.attempts_count, 0)

    def test_incomplete_attempt_excluded(self):
        self.attempt.completed_at = None
        self.attempt.save()
        AttemptAnswer.objects.create(attempt=self.attempt, question=self.question, is_correct=True)

        topic_mastery = TopicMastery.objects.get(user=self.user, subtopic=self.subtopic)
        self.assertIsNone(topic_mastery.mastery_score)

    def test_mastery_isolated_per_user(self):
        other = _make_user("bob")
        AttemptAnswer.objects.create(attempt=self.attempt, question=self.question, is_correct=True)
        self.assertFalse(SubjectMastery.objects.filter(user=other).exists())


class MockExamMasterySignalTests(TestCase):
    def setUp(self):
        self.user = _make_user()
        self.exam = MockExam.objects.create(exam_id="e1", title="Exam 1", question_count=1, subject="physics")
        self.question = MockExamQuestion.objects.create(
            exam=self.exam, number=1, question_type=MockExamQuestionType.SINGLE_CHOICE,
            text="q", difficulty=MockExamDifficulty.EASY, dataset_id="e1-1",
        )
        self.attempt = MockExamAttempt.objects.create(user=self.user, exam=self.exam)

    def test_draft_answer_does_not_create_mastery_row(self):
        MockExamAnswer.objects.create(attempt=self.attempt, question=self.question, is_correct=None)
        self.assertFalse(SubjectMastery.objects.filter(user=self.user).exists())

    def test_graded_answer_updates_subject_mastery(self):
        MockExamAnswer.objects.create(attempt=self.attempt, question=self.question, is_correct=True)
        mastery = SubjectMastery.objects.get(user=self.user, subject_key="physics")
        self.assertEqual(mastery.mastery_score, 100.0)


class FlashcardMasterySignalTests(TestCase):
    def setUp(self):
        self.user = _make_user()
        self.deck = FlashcardDeck.objects.create(deck_id="d1", title="Deck 1", subject="biology")
        self.card = Flashcard.objects.create(deck=self.deck, number=1, front_text="f", back_text="b", dataset_id="d1-1")

    def test_again_grade_counts_as_incorrect(self):
        FlashcardReview.objects.create(user=self.user, card=self.card, grade="again")
        mastery = SubjectMastery.objects.get(user=self.user, subject_key="biology")
        self.assertEqual(mastery.mastery_score, 0.0)

    def test_good_grade_counts_as_correct(self):
        FlashcardReview.objects.create(user=self.user, card=self.card, grade="good")
        mastery = SubjectMastery.objects.get(user=self.user, subject_key="biology")
        self.assertEqual(mastery.mastery_score, 100.0)


class MasteryApiTests(TestCase):
    def setUp(self):
        self.user = _make_user()
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_list_subject_mastery_scoped_to_owner(self):
        other = _make_user("bob")
        SubjectMastery.objects.create(user=self.user, subject_key="math", mastery_score=80)
        SubjectMastery.objects.create(user=other, subject_key="math", mastery_score=10)

        resp = self.client.get("/api/knowledge/subjects/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 1)
        self.assertEqual(resp.data[0]["mastery_score"], 80)

    def test_list_topic_mastery_filtered_by_subject(self):
        subtopic = _make_subtopic()
        recompute_topic_mastery(self.user, subtopic)

        resp = self.client.get("/api/knowledge/topics/?subject_key=math")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 1)

        resp = self.client.get("/api/knowledge/topics/?subject_key=physics")
        self.assertEqual(resp.data, [])

    def test_requires_authentication(self):
        self.client.force_authenticate(None)
        resp = self.client.get("/api/knowledge/subjects/")
        self.assertEqual(resp.status_code, 401)


class SpacedRepetitionTests(TestCase):
    def setUp(self):
        self.user = _make_user()
        self.subtopic = _make_subtopic()

    def test_omitting_latest_is_correct_leaves_schedule_untouched(self):
        obj = recompute_topic_mastery(self.user, self.subtopic)
        self.assertEqual(obj.interval_days, 0)
        self.assertIsNone(obj.next_review_at)
        self.assertEqual(obj.ease_factor, 2.5)

    def test_first_correct_answer_schedules_one_day_out(self):
        obj = recompute_topic_mastery(self.user, self.subtopic, latest_is_correct=True)
        self.assertEqual(obj.interval_days, 1)
        self.assertIsNotNone(obj.next_review_at)
        self.assertGreater(obj.ease_factor, 2.5)

    def test_second_correct_answer_grows_to_three_days(self):
        recompute_topic_mastery(self.user, self.subtopic, latest_is_correct=True)
        obj = recompute_topic_mastery(self.user, self.subtopic, latest_is_correct=True)
        self.assertEqual(obj.interval_days, 3)

    def test_third_correct_answer_grows_by_ease_factor(self):
        recompute_topic_mastery(self.user, self.subtopic, latest_is_correct=True)
        recompute_topic_mastery(self.user, self.subtopic, latest_is_correct=True)
        obj = recompute_topic_mastery(self.user, self.subtopic, latest_is_correct=True)
        self.assertEqual(obj.interval_days, round(3 * obj.ease_factor))

    def test_incorrect_answer_resets_interval_and_lowers_ease(self):
        recompute_topic_mastery(self.user, self.subtopic, latest_is_correct=True)
        recompute_topic_mastery(self.user, self.subtopic, latest_is_correct=True)
        obj = recompute_topic_mastery(self.user, self.subtopic, latest_is_correct=False)
        self.assertEqual(obj.interval_days, 0)
        self.assertLess(obj.ease_factor, 2.5)

    def test_ease_factor_never_drops_below_minimum(self):
        obj = None
        for _ in range(20):
            obj = recompute_topic_mastery(self.user, self.subtopic, latest_is_correct=False)
        self.assertGreaterEqual(obj.ease_factor, 1.3)

    def test_ease_factor_never_exceeds_maximum(self):
        obj = None
        for _ in range(40):
            obj = recompute_topic_mastery(self.user, self.subtopic, latest_is_correct=True)
        self.assertLessEqual(obj.ease_factor, 3.0)

    def test_interval_days_capped_after_long_correct_streak(self):
        obj = None
        for _ in range(40):
            obj = recompute_topic_mastery(self.user, self.subtopic, latest_is_correct=True)
        self.assertLessEqual(obj.interval_days, 365)


class BackfillMasteryCommandTests(TestCase):
    """The signal-driven engine already creates these rows the moment an
    AttemptAnswer is saved, so to test the backfill's actual purpose
    (recovering data that predates the engine) we delete the auto-created
    rows first, simulating history that accumulated before signals.py
    existed, then confirm the command reconstructs them from raw events."""

    def setUp(self):
        self.user = _make_user()
        self.subtopic = _make_subtopic()
        self.question = _make_question(self.subtopic)
        attempt = PracticeAttempt.objects.create(
            user=self.user, subtopic=self.subtopic, tier=Tier.EASY, completed_at=timezone.now(),
        )
        AttemptAnswer.objects.create(attempt=attempt, question=self.question, is_correct=True)
        SubjectMastery.objects.all().delete()
        TopicMastery.objects.all().delete()

    def test_backfill_reconstructs_deleted_mastery_rows(self):
        self.assertFalse(SubjectMastery.objects.filter(user=self.user, subject_key="math").exists())
        self.assertFalse(TopicMastery.objects.filter(user=self.user, subtopic=self.subtopic).exists())

        call_command("backfill_mastery")

        subject = SubjectMastery.objects.get(user=self.user, subject_key="math")
        self.assertEqual(subject.mastery_score, 100.0)
        topic = TopicMastery.objects.get(user=self.user, subtopic=self.subtopic)
        self.assertEqual(topic.mastery_score, 100.0)

    def test_backfill_does_not_set_spaced_repetition_schedule(self):
        """Backfilled rows shouldn't fabricate a fake 'last answer' schedule
        — spacing should only start from the next real new answer."""
        call_command("backfill_mastery")
        topic = TopicMastery.objects.get(user=self.user, subtopic=self.subtopic)
        self.assertEqual(topic.interval_days, 0)
        self.assertIsNone(topic.next_review_at)

    def test_backfill_is_idempotent(self):
        call_command("backfill_mastery")
        call_command("backfill_mastery")
        self.assertEqual(SubjectMastery.objects.filter(user=self.user, subject_key="math").count(), 1)
