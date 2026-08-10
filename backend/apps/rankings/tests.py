from datetime import date
from unittest import mock

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.profiles.models import ProfilePrivacySettings
from apps.profiles.subjects import canonical_key_for_practice_subject
from apps.profiles.xp import award_xp

from .models import MonthlyXP, RankHistory, SubjectXP
from .services import record_subject_xp_gain

User = get_user_model()


def _make_user(username, xp=0):
    user = User.objects.create_user(username=username, email=f"{username}@example.com", password="pw123456")
    today = timezone.localdate()
    MonthlyXP.objects.create(user=user, year=today.year, month=today.month, xp=xp)
    return user


class LeaderboardPrivacyTests(TestCase):
    """A user who opts out of the leaderboard (show_on_leaderboard=False)
    must not appear in anyone else's board or nearby window, but must still
    see their own position when they view it themselves."""

    def setUp(self):
        self.alice = _make_user("alice", xp=100)
        self.bob = _make_user("bob", xp=80)
        self.carol = _make_user("carol", xp=60)
        self.client = APIClient()

    def _hide(self, user):
        settings, _ = ProfilePrivacySettings.objects.get_or_create(user=user)
        settings.show_on_leaderboard = False
        settings.save(update_fields=["show_on_leaderboard"])

    def test_hidden_user_absent_from_others_global_board(self):
        self._hide(self.bob)
        self.client.force_authenticate(self.alice)
        resp = self.client.get("/api/rankings/global/")
        self.assertEqual(resp.status_code, 200)
        usernames = [row["username"] for row in resp.data["results"]]
        self.assertNotIn("bob", usernames)
        self.assertIn("alice", usernames)
        self.assertIn("carol", usernames)

    def test_hidden_user_still_sees_own_position(self):
        self._hide(self.bob)
        self.client.force_authenticate(self.bob)
        resp = self.client.get("/api/rankings/global/")
        self.assertEqual(resp.status_code, 200)
        usernames = [row["username"] for row in resp.data["results"]]
        self.assertIn("bob", usernames)
        self.assertEqual(resp.data["my_xp"], 80)

    def test_own_rank_count_excludes_other_hidden_users(self):
        # 49 users with more XP than dave, all visible, so dave is #50 in
        # the visible list — hiding one of them should move dave to #49.
        for i in range(49):
            _make_user(f"filler{i}", xp=1000 - i)
        dave = _make_user("dave", xp=10)

        self.client.force_authenticate(dave)
        resp_before = self.client.get("/api/rankings/global/")
        rank_before = resp_before.data["my_rank"]

        self._hide(self.bob)  # bob has less XP than dave (80 > 10 is false — bob has 80 > 10, so hide someone above dave)
        resp_after = self.client.get("/api/rankings/global/")
        rank_after = resp_after.data["my_rank"]

        self.assertEqual(rank_after, rank_before - 1)

    def test_hidden_user_absent_from_nearby_window(self):
        self._hide(self.bob)
        self.client.force_authenticate(self.carol)
        resp = self.client.get("/api/rankings/global/")
        nearby_usernames = [row["username"] for row in resp.data["nearby"]]
        self.assertNotIn("bob", nearby_usernames)

    def test_hidden_user_absent_from_friends_board(self):
        from apps.friends.services import create_friendship

        self._hide(self.bob)
        create_friendship(self.alice, self.bob)
        self.client.force_authenticate(self.alice)
        resp = self.client.get("/api/rankings/friends/")
        usernames = [row["username"] for row in resp.data["results"]]
        self.assertNotIn("bob", usernames)


class RankHistoryTests(TestCase):
    def setUp(self):
        self.alice = _make_user("alice", xp=100)
        self.bob = _make_user("bob", xp=200)
        self.client = APIClient()
        self.client.force_authenticate(self.alice)

    def test_snapshot_created_on_view(self):
        self.assertEqual(RankHistory.objects.filter(user=self.alice, scope="global").count(), 0)
        self.client.get("/api/rankings/global/")
        rows = RankHistory.objects.filter(user=self.alice, scope="global")
        self.assertEqual(rows.count(), 1)
        self.assertEqual(rows.first().rank, 2)  # bob has more XP
        self.assertEqual(rows.first().xp, 100)

    def test_snapshot_idempotent_same_day(self):
        self.client.get("/api/rankings/global/")
        self.client.get("/api/rankings/global/")
        self.assertEqual(RankHistory.objects.filter(user=self.alice, scope="global").count(), 1)

    def test_no_snapshot_for_unranked_user(self):
        carol = _make_user("carol", xp=0)  # MonthlyXP row exists but xp=0, base_qs excludes xp=0
        self.client.force_authenticate(carol)
        self.client.get("/api/rankings/global/")
        self.assertEqual(RankHistory.objects.filter(user=carol, scope="global").count(), 0)

    def test_history_endpoint_scoped_to_caller(self):
        self.client.get("/api/rankings/global/")
        self.client.force_authenticate(self.bob)
        self.client.get("/api/rankings/global/")

        self.client.force_authenticate(self.alice)
        resp = self.client.get("/api/rankings/history/?scope=global")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 1)
        self.assertEqual(resp.data[0]["xp"], 100)
        self.assertEqual(resp.data[0]["rank"], 2)

    def test_snapshot_scoped_per_school(self):
        from apps.users.models import School

        school = School.objects.create(name="Test School")
        self.alice.school = school
        self.alice.save(update_fields=["school"])

        self.client.get("/api/rankings/school/")
        self.assertEqual(RankHistory.objects.filter(user=self.alice, scope="school").count(), 1)
        self.assertEqual(
            RankHistory.objects.filter(user=self.alice, scope="school").first().scope_key, f"SCHOOL:{school.id}"
        )


class SubjectXPTests(TestCase):
    def setUp(self):
        self.user = _make_user("alice")
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_record_subject_xp_gain_accumulates(self):
        record_subject_xp_gain(self.user, "math", 10)
        record_subject_xp_gain(self.user, "math", 5)
        row = SubjectXP.objects.get(user=self.user, subject_key="math")
        self.assertEqual(row.xp, 15)

    def test_record_subject_xp_gain_noop_for_zero(self):
        record_subject_xp_gain(self.user, "math", 0)
        self.assertFalse(SubjectXP.objects.filter(user=self.user, subject_key="math").exists())

    def test_award_xp_without_subject_does_not_touch_subject_xp(self):
        award_xp(self.user, 20)
        self.assertFalse(SubjectXP.objects.filter(user=self.user).exists())
        self.assertEqual(MonthlyXP.objects.get(user=self.user).xp, 20)

    def test_award_xp_with_subject_writes_both_ledgers(self):
        award_xp(self.user, 20, subject="english")
        self.assertEqual(MonthlyXP.objects.get(user=self.user).xp, 20)
        self.assertEqual(SubjectXP.objects.get(user=self.user, subject_key="english").xp, 20)

    def test_canonical_key_for_practice_subject(self):
        from apps.practice.models import Subject as PracticeSubject

        math = PracticeSubject.objects.create(name="Մաթեմատիկա")
        unmapped = PracticeSubject.objects.create(name="Someday Subject")
        self.assertEqual(canonical_key_for_practice_subject(math), "math")
        self.assertIsNone(canonical_key_for_practice_subject(unmapped))
        self.assertIsNone(canonical_key_for_practice_subject(None))


class SubjectRankingViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_unknown_subject_404(self):
        user = _make_user("alice")
        self.client.force_authenticate(user)
        resp = self.client.get("/api/rankings/subject/not_a_subject/")
        self.assertEqual(resp.status_code, 404)

    def test_still_growing_below_threshold(self):
        user = _make_user("alice")
        record_subject_xp_gain(user, "chemistry", 10)
        self.client.force_authenticate(user)
        resp = self.client.get("/api/rankings/subject/chemistry/")
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.data["still_growing"])
        self.assertEqual(resp.data["results"], [])

    def test_full_board_once_threshold_met(self):
        users = [_make_user(f"user{i}") for i in range(3)]
        for u in users:
            record_subject_xp_gain(u, "math", 10)
        self.client.force_authenticate(users[0])
        resp = self.client.get("/api/rankings/subject/math/")
        self.assertEqual(resp.status_code, 200)
        self.assertNotIn("still_growing", resp.data)
        self.assertEqual(len(resp.data["results"]), 3)


class RankChangeNotificationTests(TestCase):
    """RANK_UP / OVERTAKEN notifications fire from consecutive daily
    RankHistory snapshots. django.utils.timezone.localdate is patched at
    the module-attribute level so both rankings.views and rankings.services
    (which each hold their own `from django.utils import timezone` binding)
    see the same fake "today" — patching only one module's reference would
    leave the other using the real clock and break the year/month match on
    the underlying MonthlyXP query."""

    def setUp(self):
        self.alice = _make_user("alice", xp=100)
        self.bob = _make_user("bob", xp=200)
        self.client = APIClient()
        self.client.force_authenticate(self.alice)

    def _get_global(self, on_date):
        with mock.patch("django.utils.timezone.localdate", return_value=on_date):
            return self.client.get("/api/rankings/global/")

    def test_rank_up_notification_fires_on_improvement(self):
        from apps.notifications.models import NotificationType, StudentNotification

        self._get_global(date(2026, 8, 1))  # alice #2 (bob has more XP)
        MonthlyXP.objects.filter(user=self.alice).update(xp=300)
        self._get_global(date(2026, 8, 2))  # alice now #1

        self.assertTrue(
            StudentNotification.objects.filter(user=self.alice, notification_type=NotificationType.RANK_UP).exists()
        )

    def test_overtaken_notification_fires_on_drop(self):
        from apps.notifications.models import NotificationType, StudentNotification

        MonthlyXP.objects.filter(user=self.alice).update(xp=300)
        self._get_global(date(2026, 8, 1))  # alice #1
        MonthlyXP.objects.filter(user=self.alice).update(xp=50)
        self._get_global(date(2026, 8, 2))  # alice drops to #2

        self.assertTrue(
            StudentNotification.objects.filter(user=self.alice, notification_type=NotificationType.OVERTAKEN).exists()
        )

    def test_no_notification_when_rank_unchanged(self):
        from apps.notifications.models import StudentNotification

        self._get_global(date(2026, 8, 1))
        self._get_global(date(2026, 8, 2))
        self.assertEqual(StudentNotification.objects.filter(user=self.alice).count(), 0)


class SeasonEndingNotificationTests(TestCase):
    def setUp(self):
        self.user = _make_user("alice", xp=50)
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_fires_once_near_month_end(self):
        from apps.notifications.models import NotificationType, StudentNotification

        near_end = date(2026, 8, 29)  # August has 31 days -> 2 days left
        with mock.patch("django.utils.timezone.localdate", return_value=near_end):
            self.client.get("/api/rankings/global/")
            self.client.get("/api/rankings/global/")

        self.assertEqual(
            StudentNotification.objects.filter(
                user=self.user, notification_type=NotificationType.SEASON_ENDING
            ).count(),
            1,
        )

    def test_does_not_fire_early_in_month(self):
        from apps.notifications.models import NotificationType, StudentNotification

        early = date(2026, 8, 5)
        with mock.patch("django.utils.timezone.localdate", return_value=early):
            self.client.get("/api/rankings/global/")

        self.assertFalse(
            StudentNotification.objects.filter(notification_type=NotificationType.SEASON_ENDING).exists()
        )


class SeasonResultNotificationTests(TestCase):
    def test_close_month_fires_one_season_result_per_awarded_user(self):
        from apps.notifications.models import NotificationType, StudentNotification

        from .services import close_month

        # _make_user's xp param always lands in the *current real* month, so
        # for a specific closed month (July 2026) the MonthlyXP rows need to
        # be created directly rather than through that helper.
        users = [_make_user(f"user{i}") for i in range(5)]
        for i, u in enumerate(users):
            MonthlyXP.objects.create(user=u, year=2026, month=7, xp=100 - i)  # ranks 1-5

        close_month(2026, 7)

        top3_ids = {u.id for u in users[:3]}
        result_notifications = StudentNotification.objects.filter(notification_type=NotificationType.SEASON_RESULT)
        self.assertEqual(result_notifications.count(), 3)
        self.assertEqual({n.user_id for n in result_notifications}, top3_ids)

        # Idempotent: closing the same month again must not duplicate notifications.
        close_month(2026, 7)
        self.assertEqual(
            StudentNotification.objects.filter(notification_type=NotificationType.SEASON_RESULT).count(), 3
        )
