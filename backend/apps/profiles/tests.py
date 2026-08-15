from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.friends.models import Friendship
from apps.mistakes.models import MistakeEntry, MistakeEntrySource
from apps.practice.models import DailyProblemAttempt, Domain, Question, QuestionType, Subject, Subtopic, Tier, Topic
from apps.rankings.models import MonthlyXP
from apps.streaks.models import LearningStreak

from . import analytics
from . import services as profile_services
from .context import get_learner_context
from .models import (
    Achievement,
    GoalPriority,
    GoalType,
    LearningEvent,
    LearningEventType,
    LearningPreferences,
    PersonalGoal,
    ProfilePrivacySettings,
    Rarity,
    ShowcaseSlot,
    StudentExam,
    StudentSubject,
    StudyAvailability,
    UserAchievement,
)

User = get_user_model()


def _make_user(username="alice", **extra):
    return User.objects.create_user(username=username, email=f"{username}@example.com", password="pw123456", **extra)


class PersonalGoalTests(TestCase):
    def setUp(self):
        self.user = _make_user()
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_streak_goal_progress_computed_live(self):
        LearningStreak.objects.create(user=self.user, current_streak=5, longest_streak=9)
        goal = PersonalGoal.objects.create(user=self.user, goal_type=GoalType.STREAK_DAYS, target_value=14)

        progress = analytics.goal_progress(goal)

        self.assertEqual(progress["current"], 5)
        self.assertEqual(progress["percent"], 36)
        self.assertFalse(progress["is_complete"])

    def test_xp_goal_completes_when_target_reached(self):
        today = timezone.localdate()
        MonthlyXP.objects.create(user=self.user, year=today.year, month=today.month, xp=500)
        goal = PersonalGoal.objects.create(user=self.user, goal_type=GoalType.XP_THIS_MONTH, target_value=400)

        progress = analytics.goal_progress(goal)

        self.assertEqual(progress["current"], 500)
        self.assertTrue(progress["is_complete"])
        self.assertEqual(progress["percent"], 100)

    def test_create_goal_requires_subject_for_subject_accuracy(self):
        resp = self.client.post("/api/profile/goals/", {"goal_type": "subject_accuracy", "target_value": 80})
        self.assertEqual(resp.status_code, 400)
        self.assertIn("subject", resp.data)

    def test_create_custom_goal_requires_title(self):
        resp = self.client.post("/api/profile/goals/", {"goal_type": "custom", "target_value": 0})
        self.assertEqual(resp.status_code, 400)
        self.assertIn("custom_title", resp.data)

    def test_custom_goal_self_reported_completion(self):
        goal = PersonalGoal.objects.create(user=self.user, goal_type=GoalType.CUSTOM, custom_title="Read a chapter")
        resp = self.client.patch(f"/api/profile/goals/{goal.id}/", {"completed": True}, format="json")
        self.assertEqual(resp.status_code, 200)
        goal.refresh_from_db()
        self.assertIsNotNone(goal.completed_at)

    def test_goal_belongs_to_owner_only(self):
        other = _make_user("bob")
        goal = PersonalGoal.objects.create(user=other, goal_type=GoalType.STREAK_DAYS, target_value=7)
        resp = self.client.get(f"/api/profile/goals/{goal.id}/")
        self.assertEqual(resp.status_code, 404)

    def test_goal_priority_defaults_to_medium(self):
        goal = PersonalGoal.objects.create(user=self.user, goal_type=GoalType.STREAK_DAYS, target_value=7)
        self.assertEqual(goal.priority, GoalPriority.MEDIUM)

    def test_create_goal_with_priority_and_metadata(self):
        resp = self.client.post(
            "/api/profile/goals/",
            {
                "goal_type": "streak_days", "target_value": 7,
                "priority": "high", "metadata": {"source": "onboarding"},
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data["priority"], "high")
        self.assertEqual(resp.data["metadata"], {"source": "onboarding"})

    def test_create_goal_without_priority_or_metadata_uses_defaults(self):
        resp = self.client.post(
            "/api/profile/goals/", {"goal_type": "streak_days", "target_value": 7}, format="json"
        )
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data["priority"], "medium")
        self.assertEqual(resp.data["metadata"], {})

    def test_create_goal_rejects_non_dict_metadata(self):
        resp = self.client.post(
            "/api/profile/goals/",
            {"goal_type": "streak_days", "target_value": 7, "metadata": "not-a-dict"},
            format="json",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("metadata", resp.data)


class ShowcaseTests(TestCase):
    def setUp(self):
        self.user = _make_user()
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.achievement = Achievement.objects.create(
            key="first-step", name="First Step", rarity=Rarity.COMMON,
            requirement_type="questions_solved", requirement_value=1,
        )

    def test_rejects_achievement_not_unlocked(self):
        resp = self.client.patch("/api/profile/showcase/", {"achievement_ids": [self.achievement.id]}, format="json")
        self.assertEqual(resp.status_code, 400)

    def test_accepts_unlocked_achievement_and_overrides_autopick(self):
        UserAchievement.objects.create(user=self.user, achievement=self.achievement)
        resp = self.client.patch("/api/profile/showcase/", {"achievement_ids": [self.achievement.id]}, format="json")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(ShowcaseSlot.objects.filter(user=self.user).count(), 1)

        profile_resp = self.client.get("/api/profile/me/")
        showcased_ids = [a["achievement"]["id"] for a in profile_resp.data["showcase_achievements"]]
        self.assertEqual(showcased_ids, [self.achievement.id])

    def test_rejects_more_than_three(self):
        achievements = [
            Achievement.objects.create(key=f"a{i}", name=f"A{i}", requirement_type="questions_solved", requirement_value=1)
            for i in range(4)
        ]
        for a in achievements:
            UserAchievement.objects.create(user=self.user, achievement=a)
        resp = self.client.patch(
            "/api/profile/showcase/", {"achievement_ids": [a.id for a in achievements]}, format="json"
        )
        self.assertEqual(resp.status_code, 400)


class TimelineTests(TestCase):
    def test_merges_achievement_unlocks_and_study_days(self):
        user = _make_user()
        achievement = Achievement.objects.create(
            key="first-step", name="First Step", requirement_type="questions_solved", requirement_value=1,
        )
        UserAchievement.objects.create(user=user, achievement=achievement)

        entries = analytics.timeline(user)

        self.assertTrue(any(e["type"] == "achievement" for e in entries))


class PrivacyTests(TestCase):
    def setUp(self):
        self.owner = _make_user("alice", age=17)
        self.viewer = _make_user("bob")
        self.client = APIClient()
        self.client.force_authenticate(self.viewer)

    def test_age_hidden_from_others_by_default(self):
        resp = self.client.get(f"/api/profile/{self.owner.id}/")
        self.assertEqual(resp.status_code, 200)
        self.assertIsNone(resp.data["age"])

    def test_stats_hidden_when_toggled_off(self):
        ProfilePrivacySettings.objects.create(user=self.owner, show_stats=False)
        resp = self.client.get(f"/api/profile/{self.owner.id}/")
        self.assertIsNone(resp.data["stats"])
        self.assertIsNone(resp.data["streak"])

    def test_owner_sees_their_own_full_profile(self):
        self.client.force_authenticate(self.owner)
        resp = self.client.get("/api/profile/me/")
        self.assertEqual(resp.data["age"], 17)
        self.assertIsNotNone(resp.data["stats"])

    def test_friend_bypasses_privacy_masking(self):
        Friendship.objects.create(user1=self.owner, user2=self.viewer)
        resp = self.client.get(f"/api/profile/{self.owner.id}/")
        self.assertEqual(resp.data["age"], 17)
        self.assertIsNotNone(resp.data["stats"])


class FriendsRankingTests(TestCase):
    def test_includes_friend_excludes_stranger(self):
        me = _make_user("alice")
        friend = _make_user("carol")
        stranger = _make_user("dave")
        today = timezone.localdate()
        for u, xp in [(me, 100), (friend, 200), (stranger, 300)]:
            MonthlyXP.objects.create(user=u, year=today.year, month=today.month, xp=xp)
        Friendship.objects.create(user1=me, user2=friend)

        client = APIClient()
        client.force_authenticate(me)
        resp = client.get("/api/rankings/friends/")

        usernames = {row["username"] for row in resp.data["results"]}
        self.assertEqual(usernames, {"alice", "carol"})


class TodayChecklistTests(TestCase):
    def setUp(self):
        self.user = _make_user()

    def test_daily_problem_marked_complete_once_answered(self):
        subject = Subject.objects.create(name="Մաթեմատիկա")
        domain = Domain.objects.create(subject=subject, name="Վերլուծություն")
        topic = Topic.objects.create(domain=domain, name="Ֆունկցիաներ")
        subtopic = Subtopic.objects.create(topic=topic, name="Ածանցյալ")
        question = Question.objects.create(
            subtopic=subtopic, tier=Tier.EASY, question_type=QuestionType.SHORT_ANSWER,
            text="2+2=?", correct_answer_text="4", dataset_id="checklist-1",
        )
        DailyProblemAttempt.objects.create(
            user=self.user, date=timezone.localdate(), question=question, is_correct=True,
        )

        checklist = analytics.today_checklist(self.user)

        daily_item = next(i for i in checklist["items"] if i["key"] == "daily_problem")
        self.assertTrue(daily_item["complete"])
        self.assertFalse(checklist["all_complete"])  # practice still pending
        # daily_problem + the trivially-complete mistakes item (no open mistakes)
        self.assertEqual(checklist["completed_count"], 2)

    def test_mistake_review_target_capped_at_two(self):
        for i in range(5):
            MistakeEntry.objects.create(
                user=self.user, source=MistakeEntrySource.PRACTICE,
                subject_name="Մաթեմատիկա", topic_label="Ածանցյալ",
                question_type="short_answer", question_text=f"q{i}",
                your_answer_text="x", correct_answer_text="y",
            )

        checklist = analytics.today_checklist(self.user)

        mistakes_item = next(i for i in checklist["items"] if i["key"] == "mistakes")
        self.assertEqual(mistakes_item["target"], 2)
        self.assertFalse(mistakes_item["complete"])

    def test_reviewing_mistakes_today_counts_toward_target(self):
        for i in range(2):
            MistakeEntry.objects.create(
                user=self.user, source=MistakeEntrySource.PRACTICE,
                subject_name="Մաթեմատիկա", topic_label="Ածանցյալ",
                question_type="short_answer", question_text=f"q{i}",
                your_answer_text="x", correct_answer_text="y",
                last_retried_at=timezone.now(), last_retry_correct=True,
            )

        checklist = analytics.today_checklist(self.user)

        mistakes_item = next(i for i in checklist["items"] if i["key"] == "mistakes")
        self.assertEqual(mistakes_item["done"], 2)
        self.assertTrue(mistakes_item["complete"])

    def test_no_open_mistakes_marks_item_trivially_complete(self):
        checklist = analytics.today_checklist(self.user)
        mistakes_item = next(i for i in checklist["items"] if i["key"] == "mistakes")
        self.assertEqual(mistakes_item["target"], 0)
        self.assertTrue(mistakes_item["complete"])


class StudentExamTests(TestCase):
    def setUp(self):
        self.user = _make_user()
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_create_and_list_exam(self):
        resp = self.client.post(
            "/api/profile/exams/",
            {"name": "SAT", "subject_key": "math", "exam_date": "2026-12-01", "target_score": 1400, "importance": "high"},
            format="json",
        )
        self.assertEqual(resp.status_code, 201)
        resp = self.client.get("/api/profile/exams/")
        self.assertEqual(len(resp.data), 1)
        self.assertEqual(resp.data[0]["status"], "upcoming")

    def test_exam_belongs_to_owner_only(self):
        other = _make_user("bob")
        exam = StudentExam.objects.create(user=other, name="Other's exam", exam_date="2026-12-01")
        resp = self.client.get(f"/api/profile/exams/{exam.id}/")
        self.assertEqual(resp.status_code, 404)

    def test_create_exam_rejects_non_dict_metadata(self):
        resp = self.client.post(
            "/api/profile/exams/",
            {"name": "SAT", "exam_date": "2026-12-01", "metadata": "not-a-dict"},
            format="json",
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("metadata", resp.data)


class StudentSubjectTests(TestCase):
    def setUp(self):
        self.user = _make_user()
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_create_subject_interest(self):
        resp = self.client.post(
            "/api/profile/subjects/", {"subject_key": "physics", "priority": "high"}, format="json"
        )
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data["is_active"], True)
        self.assertEqual(resp.data["priority"], "high")

    def test_duplicate_subject_for_same_user_rejected(self):
        StudentSubject.objects.create(user=self.user, subject_key="math")
        resp = self.client.post("/api/profile/subjects/", {"subject_key": "math"}, format="json")
        self.assertEqual(resp.status_code, 400)

    def test_subject_linked_to_exam_of_different_subject_rejected(self):
        exam = StudentExam.objects.create(user=self.user, name="Physics olympiad", subject_key="physics", exam_date="2026-12-01")
        resp = self.client.post(
            "/api/profile/subjects/", {"subject_key": "math", "exam": exam.id}, format="json"
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn("exam", resp.data)

    def test_cannot_link_another_users_exam(self):
        other = _make_user("bob")
        other_exam = StudentExam.objects.create(user=other, name="Other's exam", exam_date="2026-12-01")
        resp = self.client.post(
            "/api/profile/subjects/", {"subject_key": "math", "exam": other_exam.id}, format="json"
        )
        self.assertEqual(resp.status_code, 400)

    def test_subject_belongs_to_owner_only(self):
        other = _make_user("bob")
        subject = StudentSubject.objects.create(user=other, subject_key="math")
        resp = self.client.get(f"/api/profile/subjects/{subject.id}/")
        self.assertEqual(resp.status_code, 404)


class StudyAvailabilityTests(TestCase):
    def setUp(self):
        self.user = _make_user()
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_get_creates_default_availability(self):
        resp = self.client.get("/api/profile/study-availability/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["preferred_days"], [])
        self.assertEqual(StudyAvailability.objects.filter(user=self.user).count(), 1)

    def test_update_availability(self):
        resp = self.client.patch(
            "/api/profile/study-availability/",
            {"preferred_days": [0, 2, 4], "typical_session_minutes": 45, "min_daily_minutes": 30, "max_daily_minutes": 90},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["preferred_days"], [0, 2, 4])
        self.assertEqual(resp.data["typical_session_minutes"], 45)

    def test_rejects_out_of_range_weekday(self):
        resp = self.client.patch("/api/profile/study-availability/", {"preferred_days": [7]}, format="json")
        self.assertEqual(resp.status_code, 400)

    def test_rejects_min_greater_than_max(self):
        resp = self.client.patch(
            "/api/profile/study-availability/", {"min_daily_minutes": 100, "max_daily_minutes": 30}, format="json"
        )
        self.assertEqual(resp.status_code, 400)

    def test_availability_isolated_per_user(self):
        other = _make_user("bob")
        StudyAvailability.objects.create(user=other, preferred_days=[1, 3])
        resp = self.client.get("/api/profile/study-availability/")
        self.assertEqual(resp.data["preferred_days"], [])


class LearningPreferencesTests(TestCase):
    def setUp(self):
        self.user = _make_user()
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_get_creates_default_preferences(self):
        resp = self.client.get("/api/profile/learning-preferences/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["explanation_style"], "mixed")
        self.assertTrue(resp.data["hints_before_answers"])
        self.assertEqual(resp.data["preferred_language"], "")
        self.assertEqual(LearningPreferences.objects.filter(user=self.user).count(), 1)

    def test_update_preferences(self):
        resp = self.client.patch(
            "/api/profile/learning-preferences/",
            {"explanation_style": "direct", "hints_before_answers": False, "preferred_language": "en"},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["explanation_style"], "direct")
        self.assertFalse(resp.data["hints_before_answers"])
        self.assertEqual(resp.data["preferred_language"], "en")

    def test_rejects_invalid_language(self):
        resp = self.client.patch("/api/profile/learning-preferences/", {"preferred_language": "fr"}, format="json")
        self.assertEqual(resp.status_code, 400)

    def test_rejects_invalid_explanation_style(self):
        resp = self.client.patch("/api/profile/learning-preferences/", {"explanation_style": "yelling"}, format="json")
        self.assertEqual(resp.status_code, 400)

    def test_preferences_isolated_per_user(self):
        other = _make_user("bob")
        LearningPreferences.objects.create(user=other, explanation_style="socratic")
        resp = self.client.get("/api/profile/learning-preferences/")
        self.assertEqual(resp.data["explanation_style"], "mixed")


class LearningEventTests(TestCase):
    def setUp(self):
        self.user = _make_user()
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_record_event_service_persists_row(self):
        event = profile_services.record_event(
            self.user, LearningEventType.HINT_REQUESTED,
            subject_key="math", topic_label="Ածանցյալ", source="practice", result="", metadata={"question_id": 42},
        )
        self.assertEqual(LearningEvent.objects.filter(user=self.user).count(), 1)
        self.assertEqual(event.event_type, LearningEventType.HINT_REQUESTED)
        self.assertEqual(event.metadata, {"question_id": 42})

    def test_list_events_for_owner(self):
        profile_services.record_event(self.user, LearningEventType.QUESTION_ANSWERED, subject_key="math", result="correct")
        profile_services.record_event(self.user, LearningEventType.HINT_REQUESTED, subject_key="physics")
        resp = self.client.get("/api/profile/learning-events/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["count"], 2)

    def test_filter_events_by_type(self):
        profile_services.record_event(self.user, LearningEventType.QUESTION_ANSWERED, result="correct")
        profile_services.record_event(self.user, LearningEventType.HINT_REQUESTED)
        resp = self.client.get("/api/profile/learning-events/?event_type=hint_requested")
        self.assertEqual(resp.data["count"], 1)
        self.assertEqual(resp.data["results"][0]["event_type"], "hint_requested")

    def test_filter_events_by_subject(self):
        profile_services.record_event(self.user, LearningEventType.QUESTION_ANSWERED, subject_key="math")
        profile_services.record_event(self.user, LearningEventType.QUESTION_ANSWERED, subject_key="physics")
        resp = self.client.get("/api/profile/learning-events/?subject_key=physics")
        self.assertEqual(resp.data["count"], 1)

    def test_events_isolated_per_user(self):
        other = _make_user("bob")
        profile_services.record_event(other, LearningEventType.QUESTION_ANSWERED)
        resp = self.client.get("/api/profile/learning-events/")
        self.assertEqual(resp.data["count"], 0)

    def test_post_not_allowed(self):
        resp = self.client.post("/api/profile/learning-events/", {"event_type": "test_completed"}, format="json")
        self.assertEqual(resp.status_code, 405)


class LearnerContextTests(TestCase):
    def setUp(self):
        self.user = _make_user()
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_empty_context_for_new_student(self):
        context = get_learner_context(self.user)
        self.assertIsNotNone(context["profile"])
        self.assertEqual(context["active_subjects"], [])
        self.assertEqual(context["upcoming_exams"], [])
        self.assertEqual(context["goals"], [])
        self.assertIsNone(context["study_availability"])
        self.assertIsNone(context["learning_preferences"])
        self.assertEqual(context["recent_events"], [])

    def test_context_includes_learning_preferences_when_set(self):
        LearningPreferences.objects.create(user=self.user, explanation_style="direct", preferred_language="en")
        context = get_learner_context(self.user)
        self.assertEqual(context["learning_preferences"]["explanation_style"], "direct")
        self.assertEqual(context["learning_preferences"]["preferred_language"], "en")

    def test_context_includes_only_active_subjects(self):
        StudentSubject.objects.create(user=self.user, subject_key="math", is_active=True)
        StudentSubject.objects.create(user=self.user, subject_key="physics", is_active=False)
        context = get_learner_context(self.user)
        self.assertEqual(len(context["active_subjects"]), 1)
        self.assertEqual(context["active_subjects"][0]["subject_key"], "math")

    def test_context_includes_only_upcoming_exams(self):
        StudentExam.objects.create(user=self.user, name="Upcoming", exam_date="2026-12-01")
        StudentExam.objects.create(user=self.user, name="Done", exam_date="2025-01-01", status=StudentExam.Status.COMPLETED)
        context = get_learner_context(self.user)
        self.assertEqual(len(context["upcoming_exams"]), 1)
        self.assertEqual(context["upcoming_exams"][0]["name"], "Upcoming")

    def test_context_excludes_completed_goals(self):
        PersonalGoal.objects.create(user=self.user, goal_type=GoalType.STREAK_DAYS, target_value=7)
        PersonalGoal.objects.create(
            user=self.user, goal_type=GoalType.CUSTOM, custom_title="done", completed_at=timezone.now()
        )
        context = get_learner_context(self.user)
        self.assertEqual(len(context["goals"]), 1)

    def test_context_includes_study_availability_when_set(self):
        StudyAvailability.objects.create(user=self.user, typical_session_minutes=45)
        context = get_learner_context(self.user)
        self.assertEqual(context["study_availability"]["typical_session_minutes"], 45)

    def test_context_recent_events_respects_limit(self):
        for i in range(5):
            profile_services.record_event(self.user, LearningEventType.QUESTION_ANSWERED, result=str(i))
        context = get_learner_context(self.user, recent_events_limit=2)
        self.assertEqual(len(context["recent_events"]), 2)

    def test_context_can_skip_events_entirely(self):
        profile_services.record_event(self.user, LearningEventType.QUESTION_ANSWERED)
        context = get_learner_context(self.user, include_events=False)
        self.assertEqual(context["recent_events"], [])

    def test_learner_context_endpoint(self):
        StudentSubject.objects.create(user=self.user, subject_key="math")
        resp = self.client.get("/api/profile/learner-context/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data["active_subjects"]), 1)

    def test_learner_context_endpoint_isolated_per_user(self):
        other = _make_user("bob")
        StudentSubject.objects.create(user=other, subject_key="math")
        resp = self.client.get("/api/profile/learner-context/")
        self.assertEqual(resp.data["active_subjects"], [])


class SubjectMasteryAnalyticsTests(TestCase):
    """Foundation-pass subject_mastery(): honest "no data" vs. combined
    real sources — never a fabricated 0%."""

    def setUp(self):
        self.user = _make_user("mastery_user")

    def test_no_data_returns_none_not_zero(self):
        results = analytics.subject_mastery(self.user)
        biology = next(r for r in results if r["key"] == "biology")
        self.assertIsNone(biology["mastery"])
        self.assertFalse(biology["has_data"])

    def test_combines_mock_exam_and_flashcard_sources(self):
        from apps.flashcards.models import Flashcard, FlashcardDeck, FlashcardProgress, FlashcardProgressStatus, FlashcardReview
        from apps.mock_exams.models import (
            MockExam, MockExamAnswer, MockExamAttempt, MockExamAttemptStatus,
            MockExamDifficulty, MockExamQuestion, MockExamQuestionType,
        )

        exam = MockExam.objects.create(exam_id="phys-1", title="Physics 1", question_count=10, subject="physics")
        attempt = MockExamAttempt.objects.create(
            user=self.user, exam=exam, status=MockExamAttemptStatus.COMPLETED,
            completed_at=timezone.now(),
            easy_correct=8, easy_total=10, medium_correct=0, medium_total=0, hard_correct=0, hard_total=0,
        )
        # subject_mastery()'s "mastery" now comes from apps.knowledge, which is
        # event-sourced (MockExamAnswer/FlashcardReview rows via signals) —
        # unlike the old average-of-aggregate-fields calc, so the fixture
        # needs real per-question answer rows, not just the summary counters.
        for i in range(10):
            q = MockExamQuestion.objects.create(
                exam=exam, number=i + 1, question_type=MockExamQuestionType.SINGLE_CHOICE,
                text=f"q{i}", difficulty=MockExamDifficulty.EASY, dataset_id=f"phys-1-{i}",
            )
            MockExamAnswer.objects.create(attempt=attempt, question=q, is_correct=i < 8)

        deck = FlashcardDeck.objects.create(deck_id="phys-deck", title="Physics deck", subject="physics")
        card = Flashcard.objects.create(deck=deck, number=1, front_text="Q", back_text="A", dataset_id="phys-deck-1")
        FlashcardProgress.objects.create(user=self.user, card=card, status=FlashcardProgressStatus.KNOWN)
        FlashcardReview.objects.create(user=self.user, card=card, grade="good")

        results = analytics.subject_mastery(self.user)
        physics = next(r for r in results if r["key"] == "physics")

        self.assertTrue(physics["has_data"])
        self.assertEqual(physics["sources"]["mock_exam"], 80.0)
        self.assertEqual(physics["sources"]["flashcards"], 100.0)
        # Pooled recency-weighted accuracy across all 11 real events
        # (9 correct / 11 total), not an average of the two channel %ages —
        # the Knowledge Engine is the single source of truth for this number.
        self.assertAlmostEqual(physics["mastery"], 100 * 9 / 11, places=1)


class LearningDnaAnalyticsTests(TestCase):
    """learning_dna(): dimensions stay locked below their real data
    threshold, and unlock with the actual computed value once past it."""

    def setUp(self):
        self.user = _make_user("dna_user")

    def _subtopic(self):
        subject = Subject.objects.create(name="Test Subject")
        domain = Domain.objects.create(subject=subject, name="Domain")
        topic = Topic.objects.create(domain=domain, name="Topic")
        return Subtopic.objects.create(topic=topic, name="Subtopic")

    def _make_answer(self, subtopic, tier, is_correct, dataset_id):
        from apps.practice.models import AttemptAnswer, PracticeAttempt
        attempt, _ = PracticeAttempt.objects.get_or_create(
            user=self.user, subtopic=subtopic, tier=tier,
            defaults={"completed_at": timezone.now(), "score": 100 if is_correct else 0},
        )
        question = Question.objects.create(
            subtopic=subtopic, tier=tier, question_type=QuestionType.MULTIPLE_CHOICE,
            text="q", dataset_id=dataset_id,
        )
        return AttemptAnswer.objects.create(attempt=attempt, question=question, is_correct=is_correct)

    def test_accuracy_locked_below_threshold(self):
        dna = analytics.learning_dna(self.user)
        self.assertTrue(dna["accuracy"]["locked"])
        self.assertEqual(dna["accuracy"]["needed"], 20)

    def test_accuracy_unlocked_above_threshold(self):
        subtopic = self._subtopic()
        for i in range(25):
            self._make_answer(subtopic, Tier.EASY, is_correct=(i % 2 == 0), dataset_id=f"acc-{i}")

        dna = analytics.learning_dna(self.user)

        self.assertNotIn("locked", dna["accuracy"])
        self.assertAlmostEqual(dna["accuracy"]["value"], 52.0, delta=0.1)  # 13/25 correct

    def test_exam_readiness_provisional_before_three_exams(self):
        from apps.mock_exams.models import MockExam, MockExamAttempt, MockExamAttemptStatus
        exam = MockExam.objects.create(exam_id="math-1", title="Math 1", question_count=10, subject="math")
        MockExamAttempt.objects.create(
            user=self.user, exam=exam, status=MockExamAttemptStatus.COMPLETED,
            completed_at=timezone.now(), scaled_score=55.0,
        )

        dna = analytics.learning_dna(self.user)

        self.assertTrue(dna["exam_readiness"]["provisional"])
        self.assertEqual(dna["exam_readiness"]["value"], 55.0)


class AcademicPowerAnalyticsTests(TestCase):
    def test_unavailable_when_no_activity(self):
        user = _make_user("power_user")
        power = analytics.academic_power(user)
        self.assertFalse(power["available"])


class PersonalRecordsAnalyticsTests(TestCase):
    def test_derived_from_real_rows_only(self):
        user = _make_user("records_user")
        LearningStreak.objects.create(user=user, current_streak=3, longest_streak=12)
        today = timezone.localdate()
        MonthlyXP.objects.create(user=user, year=today.year, month=today.month, xp=777)

        records = analytics.personal_records(user)

        self.assertEqual(records["longest_streak_days"], 12)
        self.assertEqual(records["best_month_xp"], 777)
        self.assertIsNone(records["highest_test_score"])  # never fabricated


class NextMissionAnalyticsTests(TestCase):
    def test_no_data_returns_unavailable(self):
        user = _make_user("mission_user")
        mission = analytics.next_mission(user)
        self.assertFalse(mission["available"])

    def test_uses_real_xp_constant_not_an_invented_number(self):
        from apps.practice.models import MistakeSource, TopicMistake
        from apps.practice.views import XP_PER_CORRECT_PRACTICE_ANSWER

        user = _make_user("mission_user2")
        subject = Subject.objects.create(name="Mission Subject")
        domain = Domain.objects.create(subject=subject, name="Domain")
        topic = Topic.objects.create(domain=domain, name="Topic")
        subtopic = Subtopic.objects.create(topic=topic, name="Subtopic")
        TopicMistake.objects.create(
            student=user, source=MistakeSource.PRACTICE, subject_name="Mission Subject",
            topic_label="Topic", subtopic=subtopic, incorrect_count=5, last_incorrect_at=timezone.now(),
        )

        mission = analytics.next_mission(user)

        self.assertTrue(mission["available"])
        self.assertEqual(mission["potential_xp"], mission["question_count"] * XP_PER_CORRECT_PRACTICE_ANSWER)
