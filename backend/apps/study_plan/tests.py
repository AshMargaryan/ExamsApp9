from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from apps.knowledge.models import DataSufficiency, SubjectMastery, TopicMastery
from apps.mistakes.models import ErrorCategory, MistakeEntry, MistakeEntrySource, MistakeType
from apps.practice.models import Domain, Question, QuestionType, Subject, Subtopic, Tier, Topic

from . import services
from .models import DailyStudyPlan, StudyTaskType

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


class MockExamCadenceTests(TestCase):
    """A full sitting is an hour of a student's evening. The plan may only
    propose one on the days they chose, and only until the weekly quota they
    set is spent — see apps.profiles.CoachPreferences."""

    def setUp(self):
        from apps.mock_exams.models import MockExam

        self.user = _make_user()
        self.exam = MockExam.objects.create(
            exam_id="math-2026", title="Մաթեմատիկա 2026", subject="math", question_count=12,
        )
        self._complete_attempt(days_ago=10)  # old enough not to spend this week's quota

    def _complete_attempt(self, days_ago=0):
        from apps.mock_exams.models import MockExamAttempt, MockExamAttemptStatus

        return MockExamAttempt.objects.create(
            user=self.user, exam=self.exam, status=MockExamAttemptStatus.COMPLETED,
            completed_at=timezone.now() - timedelta(days=days_ago), duration_minutes=60,
            easy_correct=1, easy_total=4, medium_correct=1, medium_total=4,
            hard_correct=0, hard_total=4,
        )

    def _prefs(self, **kwargs):
        defaults = {"mock_exams_per_week": 1, "preferred_test_days": [], "preferred_test_time": None}
        defaults.update(kwargs)
        return defaults

    def test_no_preferences_keeps_the_previous_behaviour(self):
        self.assertTrue(services._mock_exams_allowed_today(self.user, None))

    def test_zero_per_week_disables_full_exams_entirely(self):
        self.assertFalse(
            services._mock_exams_allowed_today(self.user, self._prefs(mock_exams_per_week=0))
        )

    def test_blocked_outside_the_chosen_weekdays(self):
        today = timezone.localdate().weekday()
        other_day = (today + 1) % 7
        self.assertFalse(
            services._mock_exams_allowed_today(self.user, self._prefs(preferred_test_days=[other_day]))
        )

    def test_allowed_on_a_chosen_weekday(self):
        today = timezone.localdate().weekday()
        self.assertTrue(
            services._mock_exams_allowed_today(self.user, self._prefs(preferred_test_days=[today]))
        )

    def test_empty_day_list_means_any_day_is_fine(self):
        self.assertTrue(services._mock_exams_allowed_today(self.user, self._prefs()))

    def test_weekly_quota_is_spent_by_completed_sittings(self):
        self._complete_attempt(days_ago=0)
        self.assertFalse(services._mock_exams_allowed_today(self.user, self._prefs(mock_exams_per_week=1)))
        # ...but a higher quota still has room.
        self.assertTrue(services._mock_exams_allowed_today(self.user, self._prefs(mock_exams_per_week=2)))

    def test_build_candidates_drops_mock_exams_when_the_cadence_says_no(self):
        from apps.profiles.models import CoachPreferences

        other_day = (timezone.localdate().weekday() + 1) % 7
        CoachPreferences.objects.create(
            user=self.user, mock_exams_per_week=1, preferred_test_days=[other_day],
        )
        types = {c["task_type"] for c in services.build_candidates(self.user)}
        self.assertNotIn(StudyTaskType.MOCK_EXAM_RETAKE, types)

    def test_build_candidates_keeps_mock_exams_on_a_chosen_day(self):
        from apps.profiles.models import CoachPreferences

        CoachPreferences.objects.create(
            user=self.user, mock_exams_per_week=3, preferred_test_days=[timezone.localdate().weekday()],
        )
        types = {c["task_type"] for c in services.build_candidates(self.user)}
        self.assertIn(StudyTaskType.MOCK_EXAM_RETAKE, types)


class MistakeCandidateAccuracyTests(TestCase):
    """The plan's promise has to match reality: a task that says 12 mistakes
    must mean 12 mistakes the student still gets wrong."""

    def setUp(self):
        self.user = _make_user()

    def test_already_corrected_mistakes_are_not_re_proposed(self):
        for _ in range(3):
            _make_mistake(self.user)
        fixed = _make_mistake(self.user)
        fixed.last_retry_correct = True
        fixed.save(update_fields=["last_retry_correct"])

        candidate = services._mistake_candidates(self.user)[0]

        self.assertIn("3", candidate["title"])
        self.assertEqual(candidate["target_count"], 3)
        self.assertNotIn(fixed.id, candidate["params"]["entry_ids"])

    def test_a_fully_corrected_topic_drops_out_of_the_plan_entirely(self):
        entry = _make_mistake(self.user)
        entry.last_retry_correct = True
        entry.save(update_fields=["last_retry_correct"])

        self.assertEqual(services._mistake_candidates(self.user), [])

    def test_progress_counts_retries_instead_of_completing_on_the_first(self):
        from .models import DailyStudyPlan, StudyTask

        entries = [_make_mistake(self.user) for _ in range(3)]
        plan = DailyStudyPlan.objects.create(user=self.user, date=timezone.localdate())
        task = StudyTask.objects.create(
            plan=plan, order=0, task_type=StudyTaskType.MISTAKE_RETRY,
            subject_name="Մաթեմատիկա", topic_label="Ածանցյալ", title="Կրկնիր 3 սխալ",
            link_path="/mistake-notebook/review", target_id=entries[0].id, target_count=3,
            params={"entry_ids": [e.id for e in entries]},
        )

        self.assertEqual(services.completion_status(task), {"done": False, "progress": "0/3"})

        entries[0].last_retried_at = timezone.now()
        entries[0].save(update_fields=["last_retried_at"])
        self.assertEqual(services.completion_status(task), {"done": False, "progress": "1/3"})

        for e in entries[1:]:
            e.last_retried_at = timezone.now()
            e.save(update_fields=["last_retried_at"])
        self.assertEqual(services.completion_status(task), {"done": True, "progress": "3/3"})


class EmptyPlanRefillTests(TestCase):
    """A plan generated before the student had any history used to stay empty
    for the rest of the day, while the empty state promised it would appear
    once they did some work."""

    def setUp(self):
        self.user = _make_user()

    def test_empty_plan_is_refilled_once_there_is_something_to_put_in_it(self):
        plan = services.generate_daily_plan(self.user)
        self.assertEqual(plan.tasks.count(), 0)

        for _ in range(2):
            _make_mistake(self.user)

        refilled = services.generate_daily_plan(self.user)
        self.assertEqual(refilled.id, plan.id)  # same row: (user, date) is unique
        self.assertGreater(refilled.tasks.count(), 0)

    def test_a_populated_plan_is_never_rebuilt_mid_day(self):
        _make_mistake(self.user)
        plan = services.generate_daily_plan(self.user)
        original = list(plan.tasks.values_list("id", flat=True))
        self.assertGreater(len(original), 0)

        # More signal arrives, but today's plan is already a commitment.
        for _ in range(3):
            _make_mistake(self.user)

        again = services.generate_daily_plan(self.user)
        self.assertEqual(list(again.tasks.values_list("id", flat=True)), original)

    def test_still_empty_stays_a_single_row_rather_than_erroring(self):
        services.generate_daily_plan(self.user)
        again = services.generate_daily_plan(self.user)
        self.assertEqual(again.tasks.count(), 0)
        self.assertEqual(DailyStudyPlan.objects.filter(user=self.user).count(), 1)


def _make_physics_mistake(user, topic_label="Էներգիա"):
    return MistakeEntry.objects.create(
        user=user, source=MistakeEntrySource.PRACTICE, mistake_type=MistakeType.INCORRECT,
        subject_name="Ֆիզիկա", topic_label=topic_label, question_type="multiple_choice",
        question_text="q", your_answer_text="a", correct_answer_text="b",
    )


class SubjectFilterAndPriorityTests(TestCase):
    """/learning-profile declares which subjects are active and how much they
    matter; build_candidates() is supposed to actually honour that instead of
    treating every subject as equally in-scope (see the profile/planner
    integration gap)."""

    def setUp(self):
        self.user = _make_user()

    def test_deactivated_subject_is_dropped_from_the_plan(self):
        from apps.profiles.models import StudentSubject

        StudentSubject.objects.create(user=self.user, subject_key="math", is_active=True)
        _make_mistake(self.user)  # Մաթեմատիկա -> "math"
        _make_physics_mistake(self.user)  # not declared active

        candidates = services.build_candidates(self.user)
        self.assertTrue(candidates)
        self.assertTrue(all(c["subject_key"] != "physics" for c in candidates))
        self.assertTrue(any(c["subject_key"] == "math" for c in candidates))

    def test_no_declared_subjects_keeps_everything(self):
        _make_mistake(self.user)
        _make_physics_mistake(self.user)

        keys = {c["subject_key"] for c in services.build_candidates(self.user)}
        self.assertEqual(keys, {"math", "physics"})

    def test_unresolvable_subject_key_is_never_filtered_out(self):
        from apps.profiles.models import StudentSubject

        StudentSubject.objects.create(user=self.user, subject_key="math", is_active=True)
        MistakeEntry.objects.create(
            user=self.user, source=MistakeEntrySource.PRACTICE, mistake_type=MistakeType.INCORRECT,
            subject_name="Անհայտ առարկա", topic_label="X", question_type="multiple_choice",
            question_text="q", your_answer_text="a", correct_answer_text="b",
        )
        candidates = services.build_candidates(self.user)
        self.assertTrue(any(c["subject_key"] is None for c in candidates))

    def test_high_priority_subject_is_ordered_ahead_of_medium(self):
        from apps.profiles.models import GoalPriority, StudentSubject

        StudentSubject.objects.create(
            user=self.user, subject_key="math", is_active=True, priority=GoalPriority.MEDIUM,
        )
        StudentSubject.objects.create(
            user=self.user, subject_key="physics", is_active=True, priority=GoalPriority.HIGH,
        )
        _make_mistake(self.user)
        _make_physics_mistake(self.user)

        candidates = services.build_candidates(self.user)
        physics_index = next(i for i, c in enumerate(candidates) if c["subject_key"] == "physics")
        math_index = next(i for i, c in enumerate(candidates) if c["subject_key"] == "math")
        self.assertLess(physics_index, math_index)

    def test_struggled_check_in_still_outranks_declared_priority(self):
        """A fresh 'this was hard' signal about real work should still beat a
        standing subject preference — see build_candidates' docstring."""
        from apps.profiles.models import GoalPriority, StudentSubject

        StudentSubject.objects.create(
            user=self.user, subject_key="math", is_active=True, priority=GoalPriority.LOW,
        )
        StudentSubject.objects.create(
            user=self.user, subject_key="physics", is_active=True, priority=GoalPriority.HIGH,
        )
        _make_mistake(self.user)
        _make_physics_mistake(self.user)

        plan = DailyStudyPlan.objects.create(user=self.user, date=timezone.localdate())
        struggled_task = plan.tasks.create(
            order=0, task_type=StudyTaskType.MISTAKE_RETRY,
            subject_name="Մաթեմատիկա", topic_label="Ածանցյալ", title="t",
            link_path="/x", target_id=1, target_count=1, estimated_minutes=5,
        )
        from .models import CheckInFeeling, TaskCheckIn
        TaskCheckIn.objects.create(task=struggled_task, feeling=CheckInFeeling.STRUGGLED)

        candidates = services.build_candidates(self.user)
        self.assertEqual(candidates[0]["subject_key"], "math")


class DailyMinutesCapTests(TestCase):
    def test_cap_stops_once_the_budget_would_be_exceeded(self):
        candidates = [{"estimated_minutes": 10}, {"estimated_minutes": 10}, {"estimated_minutes": 10}]
        capped = services._cap_to_daily_minutes(candidates, max_daily_minutes=25)
        self.assertEqual(len(capped), 2)

    def test_first_task_survives_even_if_it_alone_exceeds_the_budget(self):
        candidates = [{"estimated_minutes": 60}, {"estimated_minutes": 10}]
        capped = services._cap_to_daily_minutes(candidates, max_daily_minutes=30)
        self.assertEqual(len(capped), 1)
        self.assertEqual(capped[0]["estimated_minutes"], 60)

    def test_no_cap_applied_when_max_daily_minutes_is_unset(self):
        candidates = [{"estimated_minutes": 10}] * 5
        self.assertEqual(services._cap_to_daily_minutes(candidates, None), candidates)


class BuildCandidatesRespectsDailyMinutesTests(TestCase):
    """Integration path: apps.profiles.StudyAvailability.max_daily_minutes ->
    build_candidates() actually stops adding tasks once the plan would run
    over, instead of piling on whatever the deterministic sources found."""

    def setUp(self):
        self.user = _make_user()

    def test_plan_stays_within_the_declared_daily_maximum(self):
        from apps.profiles.models import StudyAvailability

        StudyAvailability.objects.create(user=self.user, max_daily_minutes=6)
        _make_mistake(self.user)  # 1-entry group -> estimated_minutes = 5
        for _ in range(6):
            MistakeEntry.objects.create(
                user=self.user, source=MistakeEntrySource.PRACTICE, mistake_type=MistakeType.INCORRECT,
                subject_name="Մաթեմատիկա", topic_label="Ինտեգրալ", question_type="multiple_choice",
                question_text="q", your_answer_text="a", correct_answer_text="b",
            )  # 6-entry group -> estimated_minutes = 6, ranked first (largest group first)

        candidates = services.build_candidates(self.user)
        self.assertEqual(len(candidates), 1)
        self.assertEqual(candidates[0]["estimated_minutes"], 6)
