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
from .models import Achievement, GoalType, PersonalGoal, ProfilePrivacySettings, Rarity, ShowcaseSlot, UserAchievement

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
