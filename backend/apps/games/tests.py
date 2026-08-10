from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.practice.models import Subject as PracticeSubject
from apps.rankings.models import SubjectXP

from .models import GameParticipant, GameRoom, GameRoomType, GameSettings, SuspiciousActivityLog
from .services import _settle_room

User = get_user_model()


def _make_user(username):
    return User.objects.create_user(username=username, email=f"{username}@example.com", password="pw123456")


class SettleRoomSubjectXPTests(TestCase):
    """_settle_room should credit each participant's SubjectXP ledger for
    the room's subject, in addition to the overall MonthlyXP it already
    credited before this change."""

    def setUp(self):
        self.creator = _make_user("creator")
        self.opponent = _make_user("opponent")
        self.subject = PracticeSubject.objects.create(name="Մաթեմատիկա")
        self.room = GameRoom.objects.create(creator=self.creator, name="Room", type=GameRoomType.PRIVATE)
        GameSettings.objects.create(
            room=self.room, subject=self.subject, question_count=5,
            medium_count=5, time_limit_per_question=30,
        )
        GameParticipant.objects.create(game=self.room, user=self.creator, score=30)
        GameParticipant.objects.create(game=self.room, user=self.opponent, score=10)

    def test_settle_room_credits_subject_xp_for_math(self):
        _settle_room(self.room)
        self.assertEqual(SubjectXP.objects.get(user=self.creator, subject_key="math").xp, 30)
        self.assertEqual(SubjectXP.objects.get(user=self.opponent, subject_key="math").xp, 10)

    def test_settle_room_without_settings_does_not_crash_or_credit_subject(self):
        room = GameRoom.objects.create(creator=self.creator, name="No settings room", type=GameRoomType.PRIVATE)
        GameParticipant.objects.create(game=room, user=self.creator, score=15)
        _settle_room(room)
        self.assertFalse(SubjectXP.objects.filter(user=self.creator).exists())


class GameXPAntiFarmTests(TestCase):
    """_settle_room applies diminishing returns per Nth game a user settles
    in one day (100% for games 1-5, 50% for 6-10, 10% for 11+), and logs a
    read-only admin flag once a user crosses a high daily-volume threshold —
    without ever reducing XP below the diminishing-returns curve itself."""

    def setUp(self):
        self.user = _make_user("farmer")
        self.subject = PracticeSubject.objects.create(name="Մաթեմատիկա")

    def _settle_one(self, score=10):
        """Settles one room and returns the refreshed participant — reading
        xp_earned (set directly per-room by _settle_room) rather than
        cumulative Profile.total_xp, since achievement unlocks (e.g. "first
        game played") also grant XP through the same award_xp funnel and
        would otherwise confound a cumulative total."""
        room = GameRoom.objects.create(creator=self.user, name="Room", type=GameRoomType.PRIVATE)
        GameSettings.objects.create(
            room=room, subject=self.subject, question_count=5, medium_count=5, time_limit_per_question=30,
        )
        participant = GameParticipant.objects.create(game=room, user=self.user, score=score)
        _settle_room(room)
        participant.refresh_from_db()
        return participant

    def test_normal_play_unaffected(self):
        for _ in range(2):
            self._settle_one(score=10)
        third = self._settle_one(score=10)
        self.assertEqual(third.xp_earned, 10)

    def test_full_xp_through_fifth_game_today(self):
        for _ in range(4):
            self._settle_one(score=10)
        fifth = self._settle_one(score=10)
        self.assertEqual(fifth.xp_earned, 10)

    def test_half_xp_for_sixth_game(self):
        for _ in range(5):
            self._settle_one(score=10)
        sixth = self._settle_one(score=10)
        self.assertEqual(sixth.xp_earned, 5)  # 50% of 10

    def test_ten_percent_xp_from_eleventh_game_onward(self):
        for _ in range(10):
            self._settle_one(score=10)
        eleventh = self._settle_one(score=10)
        self.assertEqual(eleventh.xp_earned, 1)  # round(10 * 0.1)

    def test_no_suspicious_log_below_threshold(self):
        for _ in range(20):
            self._settle_one(score=10)
        self.assertFalse(SuspiciousActivityLog.objects.filter(user=self.user).exists())

    def test_suspicious_log_created_past_threshold(self):
        for _ in range(21):
            self._settle_one(score=10)
        log = SuspiciousActivityLog.objects.get(user=self.user)
        self.assertEqual(log.detail["games_today"], 21)
