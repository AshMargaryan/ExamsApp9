from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from apps.knowledge.models import DataSufficiency, SubjectMastery, TopicMastery
from apps.mistakes.models import ErrorCategory, MistakeEntry, MistakeEntrySource, MistakeType
from apps.practice.models import Domain, Question, QuestionType, Subject, Subtopic, Tier, Topic

from . import services

User = get_user_model()


def _make_user(username="alice", **extra):
    return User.objects.create_user(username=username, email=f"{username}@example.com", password="pw123456", **extra)


def _make_subtopic(subject_name="Մաթեմատիկա"):
    subject = Subject.objects.create(name=subject_name)
    domain = Domain.objects.create(subject=subject, name="Algebra")
    topic = Topic.objects.create(domain=domain, name="Equations")
    subtopic = Subtopic.objects.create(topic=topic, name="Linear equations")
    Question.objects.create(
        subtopic=subtopic, tier=Tier.EASY, question_type=QuestionType.MULTIPLE_CHOICE,
        text="q", dataset_id=f"ds-{subtopic.id}",
    )
    return subtopic


def _make_mistake(user, *, error_category=None, classified=True):
    return MistakeEntry.objects.create(
        user=user, source=MistakeEntrySource.PRACTICE, mistake_type=MistakeType.INCORRECT,
        subject_name="Մաթեմատիկա", topic_label="Ածանցյալ", question_type="multiple_choice",
        question_text="q", your_answer_text="a", correct_answer_text="b",
        error_category=error_category or ErrorCategory.UNCLASSIFIED,
        classified_at=timezone.now() if classified else None,
    )


class DominantErrorCategoryTests(TestCase):
    def setUp(self):
        self.user = _make_user()

    def test_none_when_nothing_classified(self):
        _make_mistake(self.user, classified=False)
        self.assertIsNone(services._dominant_error_category(list(MistakeEntry.objects.all())))

    def test_returns_most_common_classified_category(self):
        _make_mistake(self.user, error_category=ErrorCategory.CARELESS_SLIP)
        _make_mistake(self.user, error_category=ErrorCategory.CARELESS_SLIP)
        _make_mistake(self.user, error_category=ErrorCategory.CONCEPTUAL_GAP)
        result = services._dominant_error_category(list(MistakeEntry.objects.all()))
        self.assertEqual(result, ErrorCategory.CARELESS_SLIP)


class MistakeCandidatesTests(TestCase):
    def setUp(self):
        self.user = _make_user()

    def test_blurb_reflects_dominant_category_when_classified(self):
        for _ in range(3):
            MistakeEntry.objects.create(
                user=self.user, source=MistakeEntrySource.PRACTICE, mistake_type=MistakeType.INCORRECT,
                subject_name="Մաթեմատիկա", topic_label="Ածանցյալ", question_type="multiple_choice",
                question_text="q", your_answer_text="a", correct_answer_text="b",
                error_category=ErrorCategory.CONCEPTUAL_GAP, classified_at=timezone.now(),
            )
        candidates = services._mistake_candidates(self.user)
        self.assertEqual(len(candidates), 1)
        self.assertIn("հասկացողության բաց", candidates[0]["blurb"])

    def test_blurb_falls_back_when_unclassified(self):
        _make_mistake(self.user, classified=False)
        candidates = services._mistake_candidates(self.user)
        self.assertEqual(candidates[0]["blurb"], "Այս հարցերում սխալվել ես վերջերս, փորձիր նորից։")


class PracticeCandidatesMasteryTests(TestCase):
    def setUp(self):
        self.user = _make_user()

    def test_high_mastery_topic_is_filtered_out(self):
        subtopic = _make_subtopic()
        TopicMastery.objects.create(
            user=self.user, subtopic=subtopic, mastery_score=90,
            data_sufficiency=DataSufficiency.HIGH, attempts_count=20, correct_count=18,
        )
        candidates = services._practice_candidates(self.user)
        self.assertEqual(candidates, [])

    def test_low_sufficiency_high_score_is_not_filtered(self):
        subtopic = _make_subtopic()
        TopicMastery.objects.create(
            user=self.user, subtopic=subtopic, mastery_score=90,
            data_sufficiency=DataSufficiency.LOW, attempts_count=2, correct_count=2,
        )
        candidates = services._practice_candidates(self.user)
        self.assertEqual(len(candidates), 1)

    def test_mastery_score_shown_in_blurb(self):
        subtopic = _make_subtopic()
        TopicMastery.objects.create(
            user=self.user, subtopic=subtopic, mastery_score=42,
            data_sufficiency=DataSufficiency.MEDIUM, attempts_count=8, correct_count=3,
        )
        candidates = services._practice_candidates(self.user)
        self.assertEqual(len(candidates), 1)
        self.assertIn("42%", candidates[0]["blurb"])

    def test_no_mastery_row_falls_back_to_not_started_blurb(self):
        _make_subtopic()
        candidates = services._practice_candidates(self.user)
        self.assertEqual(len(candidates), 1)
        self.assertEqual(candidates[0]["blurb"], "Այս թեման դեռ չես սկսել։")


class DueReviewCandidatesTests(TestCase):
    def setUp(self):
        self.user = _make_user()

    def test_overdue_topic_is_a_candidate(self):
        subtopic = _make_subtopic()
        TopicMastery.objects.create(
            user=self.user, subtopic=subtopic, interval_days=3,
            next_review_at=timezone.now() - timezone.timedelta(hours=1),
        )
        candidates = services._due_review_candidates(self.user)
        self.assertEqual(len(candidates), 1)
        self.assertEqual(candidates[0]["target_id"], subtopic.id)

    def test_not_yet_due_topic_excluded(self):
        subtopic = _make_subtopic()
        TopicMastery.objects.create(
            user=self.user, subtopic=subtopic, interval_days=3,
            next_review_at=timezone.now() + timezone.timedelta(days=2),
        )
        candidates = services._due_review_candidates(self.user)
        self.assertEqual(candidates, [])

    def test_never_scheduled_topic_excluded(self):
        subtopic = _make_subtopic()
        TopicMastery.objects.create(user=self.user, subtopic=subtopic, interval_days=0, next_review_at=None)
        candidates = services._due_review_candidates(self.user)
        self.assertEqual(candidates, [])

    def test_excluded_subtopic_ids_respected(self):
        subtopic = _make_subtopic()
        TopicMastery.objects.create(
            user=self.user, subtopic=subtopic, interval_days=3,
            next_review_at=timezone.now() - timezone.timedelta(hours=1),
        )
        candidates = services._due_review_candidates(self.user, exclude_subtopic_ids={subtopic.id})
        self.assertEqual(candidates, [])

    def test_most_overdue_first(self):
        older = _make_subtopic()
        TopicMastery.objects.create(
            user=self.user, subtopic=older, interval_days=3,
            next_review_at=timezone.now() - timezone.timedelta(days=5),
        )
        newer = _make_subtopic(subject_name="Ֆիզիկա")
        TopicMastery.objects.create(
            user=self.user, subtopic=newer, interval_days=3,
            next_review_at=timezone.now() - timezone.timedelta(hours=1),
        )
        candidates = services._due_review_candidates(self.user, limit=10)
        self.assertEqual(candidates[0]["target_id"], older.id)


class BuildCandidatesDueReviewIntegrationTests(TestCase):
    def setUp(self):
        self.user = _make_user()

    def test_due_review_included_without_duplicating_weak_topic(self):
        weak = _make_subtopic()
        TopicMastery.objects.create(
            user=self.user, subtopic=weak, interval_days=3,
            next_review_at=timezone.now() - timezone.timedelta(hours=1),
            mastery_score=20, data_sufficiency=DataSufficiency.MEDIUM,
        )
        candidates = services.build_candidates(self.user)
        target_ids = [c["target_id"] for c in candidates if c["task_type"] == "practice_weak_topic"]
        # Present via _practice_candidates (it's weak), not duplicated by _due_review_candidates.
        self.assertEqual(target_ids.count(weak.id), 1)

    def test_due_review_surfaces_topic_not_in_weak_list(self):
        mastered_but_due = _make_subtopic()
        TopicMastery.objects.create(
            user=self.user, subtopic=mastered_but_due, interval_days=10,
            next_review_at=timezone.now() - timezone.timedelta(hours=1),
            mastery_score=95, data_sufficiency=DataSufficiency.HIGH,
        )
        candidates = services.build_candidates(self.user)
        target_ids = [c["target_id"] for c in candidates]
        self.assertIn(mastered_but_due.id, target_ids)


class StudentContextLinesTests(TestCase):
    def setUp(self):
        self.user = _make_user()

    def test_includes_weakest_subject_mastery(self):
        SubjectMastery.objects.create(
            user=self.user, subject_key="physics", mastery_score=30, data_sufficiency=DataSufficiency.MEDIUM,
        )
        SubjectMastery.objects.create(
            user=self.user, subject_key="math", mastery_score=80, data_sufficiency=DataSufficiency.HIGH,
        )
        lines = services._student_context_lines(self.user)
        self.assertTrue(any("30%" in line for line in lines))

    def test_excludes_low_sufficiency_mastery(self):
        SubjectMastery.objects.create(
            user=self.user, subject_key="physics", mastery_score=10, data_sufficiency=DataSufficiency.LOW,
        )
        lines = services._student_context_lines(self.user)
        self.assertFalse(any("10%" in line for line in lines))

    def test_includes_dominant_mistake_category(self):
        for _ in range(2):
            _make_mistake(self.user, error_category=ErrorCategory.PROCESS_ERROR)
        lines = services._student_context_lines(self.user)
        self.assertTrue(any("մեթոդական" in line for line in lines))
