from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.friends.services import create_friendship
from apps.games.models import GameParticipant, GameRoomStatus
from apps.games.services import _settle_room
from apps.notifications.models import NotificationType, StudentNotification
from apps.practice.models import Domain, Question, QuestionType, Subject, Subtopic, Tier, Topic

from .models import ChallengeInvite, ChallengeStatus
from .services import (
    CHALLENGE_WINNER_BONUS_XP,
    accept_challenge,
    cancel_challenge,
    create_challenge,
    decline_challenge,
    expire_stale_invites,
)

User = get_user_model()


def _make_user(username):
    return User.objects.create_user(username=username, email=f"{username}@example.com", password="pw123456")


def _seed_questions(subject: Subject, easy=3, medium=5, hard=2) -> None:
    """Builds enough real practice content for `select_questions` (the
    engine that populates a game/challenge room) to succeed — the fixed
    challenge preset asks for exactly this easy/medium/hard split."""
    domain = Domain.objects.create(subject=subject, name="D")
    topic = Topic.objects.create(domain=domain, name="T")
    subtopic = Subtopic.objects.create(topic=topic, name="S")
    counter = 0
    for tier, count in ((Tier.EASY, easy), (Tier.MEDIUM, medium), (Tier.HARD, hard)):
        for _ in range(count):
            counter += 1
            Question.objects.create(
                subtopic=subtopic, tier=tier, question_type=QuestionType.SHORT_ANSWER,
                text=f"Q{counter}", correct_answer_text="42",
                dataset_id=f"{subject.name}-{tier}-{counter}",
            )


class ChallengeInviteStateTests(TestCase):
    def setUp(self):
        self.alice = _make_user("alice")
        self.bob = _make_user("bob")
        self.carol = _make_user("carol")  # not friends with alice
        create_friendship(self.alice, self.bob)
        self.subject = Subject.objects.create(name="Մաթեմատիկա")

    def test_cannot_challenge_a_non_friend(self):
        with self.assertRaises(ValueError):
            create_challenge(self.alice, self.carol, self.subject)

    def test_create_fires_challenge_received_notification(self):
        create_challenge(self.alice, self.bob, self.subject)
        self.assertTrue(
            StudentNotification.objects.filter(
                user=self.bob, notification_type=NotificationType.CHALLENGE_RECEIVED
            ).exists()
        )

    def test_duplicate_pending_invite_rejected(self):
        create_challenge(self.alice, self.bob, self.subject)
        with self.assertRaises(ValueError):
            create_challenge(self.alice, self.bob, self.subject)

    def test_accept_creates_two_player_room_and_starts_it(self):
        _seed_questions(self.subject)
        invite = create_challenge(self.alice, self.bob, self.subject)
        invite = accept_challenge(invite)

        self.assertEqual(invite.status, ChallengeStatus.ACCEPTED)
        self.assertIsNotNone(invite.room)
        self.assertEqual(invite.room.participants.count(), 2)
        # Player-count trigger begins the countdown (WAITING -> STARTING)
        # rather than starting instantly — see games.services.maybe_auto_start.
        self.assertEqual(invite.room.status, GameRoomStatus.STARTING)

    def test_decline_sets_status(self):
        invite = create_challenge(self.alice, self.bob, self.subject)
        invite = decline_challenge(invite)
        self.assertEqual(invite.status, ChallengeStatus.DECLINED)

    def test_cannot_respond_twice(self):
        invite = create_challenge(self.alice, self.bob, self.subject)
        decline_challenge(invite)
        with self.assertRaises(ValueError):
            decline_challenge(invite)

    def test_cancel_by_sender(self):
        invite = create_challenge(self.alice, self.bob, self.subject)
        invite = cancel_challenge(invite)
        self.assertEqual(invite.status, ChallengeStatus.CANCELLED)

    def test_expire_stale_invites(self):
        invite = ChallengeInvite.objects.create(
            sender=self.alice, receiver=self.bob, subject=self.subject,
            expires_at=timezone.now() - timedelta(hours=1),
        )
        expire_stale_invites()
        invite.refresh_from_db()
        self.assertEqual(invite.status, ChallengeStatus.EXPIRED)


class ChallengeApiTests(TestCase):
    def setUp(self):
        self.alice = _make_user("alice")
        self.bob = _make_user("bob")
        create_friendship(self.alice, self.bob)
        self.subject = Subject.objects.create(name="Մաթեմատիկա")
        _seed_questions(self.subject)
        self.client = APIClient()

    def test_send_respond_flow(self):
        self.client.force_authenticate(self.alice)
        send_resp = self.client.post(
            "/api/challenges/send/", {"receiver_id": self.bob.id, "subject_id": self.subject.id}
        )
        self.assertEqual(send_resp.status_code, 201)
        invite_id = send_resp.data["id"]

        self.client.force_authenticate(self.bob)
        list_resp = self.client.get("/api/challenges/")
        self.assertEqual(len(list_resp.data), 1)

        respond_resp = self.client.post(f"/api/challenges/{invite_id}/respond/", {"action": "accept"})
        self.assertEqual(respond_resp.status_code, 200)
        self.assertEqual(respond_resp.data["status"], "accepted")
        self.assertIsNotNone(respond_resp.data["room_code"])


class ChallengeWinnerBonusTests(TestCase):
    """_settle_room's winner-bonus branch must fire only for challenge
    rooms, never for regular public/private rooms — a regression check
    against the existing non-challenge games flow (see apps.games.tests)."""

    def setUp(self):
        self.alice = _make_user("alice")
        self.bob = _make_user("bob")
        create_friendship(self.alice, self.bob)
        self.subject = Subject.objects.create(name="Մաթեմատիկա")
        _seed_questions(self.subject)

    def test_winner_gets_bonus_xp_and_both_get_notified(self):
        invite = create_challenge(self.alice, self.bob, self.subject)
        invite = accept_challenge(invite)

        alice_participant = GameParticipant.objects.get(game=invite.room, user=self.alice)
        bob_participant = GameParticipant.objects.get(game=invite.room, user=self.bob)
        alice_participant.score = 80
        alice_participant.save(update_fields=["score"])
        bob_participant.score = 50
        bob_participant.save(update_fields=["score"])

        invite.room.refresh_from_db()
        _settle_room(invite.room)

        alice_participant.refresh_from_db()
        bob_participant.refresh_from_db()
        self.assertEqual(alice_participant.rank, 1)
        self.assertEqual(alice_participant.xp_earned, 80 + CHALLENGE_WINNER_BONUS_XP)
        self.assertEqual(bob_participant.xp_earned, 50)

        alice_notif = StudentNotification.objects.get(user=self.alice, notification_type=NotificationType.CHALLENGE_RESULT)
        bob_notif = StudentNotification.objects.get(user=self.bob, notification_type=NotificationType.CHALLENGE_RESULT)
        self.assertTrue(alice_notif.context["won"])
        self.assertFalse(bob_notif.context["won"])

    def test_regular_room_gets_no_bonus(self):
        from apps.games.models import GameRoom, GameRoomType, GameSettings
        from apps.practice.models import QuestionType

        room = GameRoom.objects.create(creator=self.alice, name="Public room", type=GameRoomType.PRIVATE)
        GameSettings.objects.create(
            room=room, subject=self.subject, question_count=5, medium_count=5,
            easy_time_limit=15, medium_time_limit=30, hard_time_limit=45,
            question_types=list(QuestionType.values),
        )
        p1 = GameParticipant.objects.create(game=room, user=self.alice, score=80)
        _settle_room(room)
        p1.refresh_from_db()
        self.assertEqual(p1.xp_earned, 80)  # no +20 bonus — not a challenge room
        self.assertFalse(
            StudentNotification.objects.filter(user=self.alice, notification_type=NotificationType.CHALLENGE_RESULT).exists()
        )
