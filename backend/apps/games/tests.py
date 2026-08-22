import time
from datetime import timedelta

from asgiref.sync import async_to_sync
from django.contrib.auth import get_user_model
from django.test import TestCase, TransactionTestCase
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken

from apps.practice.models import Choice, Domain, Question, QuestionType, Subject, Subtopic, Tier, Topic
from apps.rankings.models import SubjectXP
from apps.users.models import UserSession
from apps.users.utils import issue_tokens_for_user

from . import services
from .auth_middleware import _get_user_from_token
from .gameplay import record_answer
from .models import (
    GameParticipant,
    GameRoom,
    GameRoomStatus,
    GameRoomType,
    GameSettings,
    GameStartCondition,
    GameStats,
    MatchmakingQueue,
    MatchmakingStartMode,
    SuspiciousActivityLog,
)
from .trophies import trophies_for_rank

User = get_user_model()


def make_user(username):
    return User.objects.create_user(username=username, password="pw12345", email=f"{username}@x.test")


def make_question_bank(subject_name="Մաթեմատիկա", count=30, tier=Tier.MEDIUM):
    subject = Subject.objects.create(name=subject_name)
    domain = Domain.objects.create(subject=subject, name="Domain")
    topic = Topic.objects.create(domain=domain, name="Topic")
    subtopic = Subtopic.objects.create(topic=topic, name="Subtopic")
    for i in range(count):
        q = Question.objects.create(
            subtopic=subtopic,
            tier=tier,
            question_type=QuestionType.MULTIPLE_CHOICE,
            text=f"Q{i}?",
            dataset_id=f"{subject_name}-{i}",
        )
        Choice.objects.create(question=q, text="A", is_correct=True, order=0)
        Choice.objects.create(question=q, text="B", is_correct=False, order=1)
    return subject, topic


def make_room_with_settings(creator, subject, topic=None, question_count=5, max_players=20,
                             start_condition=GameStartCondition.MANUAL,
                             easy_time_limit=15, medium_time_limit=20, hard_time_limit=30,
                             total_game_time=None, **kwargs):
    room = GameRoom.objects.create(
        creator=creator, name="Room", max_players=max_players,
        start_condition=start_condition, **kwargs,
    )
    GameSettings.objects.create(
        room=room, subject=subject, topic=topic,
        question_count=question_count, easy_count=0, medium_count=question_count, hard_count=0,
        easy_time_limit=easy_time_limit, medium_time_limit=medium_time_limit, hard_time_limit=hard_time_limit,
        total_game_time=total_game_time, question_types=list(QuestionType.values),
    )
    GameParticipant.objects.create(game=room, user=creator)
    return room


def start_room_now(room, user):
    """Runs the creator's start_room countdown (see services.start_room /
    GameRoomStatus.STARTING) all the way through immediately: begins it,
    fast-forwards scheduled_start_at into the past, then promotes it. Used
    by tests that just need a RUNNING room and aren't exercising the
    countdown itself — see CountdownTests for those."""
    room = services.start_room(room, user)
    room.scheduled_start_at = timezone.now() - timedelta(seconds=1)
    room.save(update_fields=["scheduled_start_at"])
    return services.maybe_auto_start(room)


def answer_all_correctly(room, participant):
    """Walks ONE participant through every question in the room's locked
    order, independently of anyone else — mirrors how a real client would
    drive gameplay.record_answer question by question."""
    from .gameplay import get_room_questions

    questions = get_room_questions(room)
    for gq in questions:
        participant.refresh_from_db()
        if participant.finished_at is not None:
            break
        choice = gq.question.choices.filter(is_correct=True).first()
        record_answer(room, participant, gq.question_id, {"selected_choice_id": choice.id})


def play_full_game(room, participants):
    """Every participant independently answers every question correctly,
    one participant fully at a time (order between participants doesn't
    matter for correctness — that's the point of independent pacing)."""
    for p in participants:
        answer_all_correctly(room, p)
    room.refresh_from_db()
    return room


class PublicGameLifecycleTests(TestCase):
    """Root-cause regression tests for the 'Ready -> Start -> instant Game
    Over' bug: matchmaking rooms used to spawn with no GameSettings, so they
    ran with zero questions."""

    def setUp(self):
        self.subject, self.topic = make_question_bank(count=30)
        self.queue_count = MatchmakingQueue.objects.create(
            name="ByCount", start_mode=MatchmakingStartMode.PLAYER_COUNT,
            min_players=10, max_players=50,
        )
        self.queue_timer = MatchmakingQueue.objects.create(
            name="ByTimer", start_mode=MatchmakingStartMode.TIMER,
            min_players=2, max_players=50, timer_seconds=60,
        )

    def test_matchmaking_room_gets_settings_and_questions_on_spawn(self):
        user = make_user("u1")
        ticket = services.find_game(user, self.queue_count, self.subject)
        room = ticket.room
        self.assertIsNotNone(getattr(room, "settings", None))
        self.assertEqual(room.settings.subject_id, self.subject.id)

    def test_two_participants_can_complete_public_game(self):
        u1, u2 = make_user("a"), make_user("b")
        t1 = services.find_game(u1, self.queue_count, self.subject)
        t2 = services.find_game(u2, self.queue_count, self.subject)
        room = t1.room
        self.assertEqual(room.pk, t2.room.pk)
        # Below min_players_to_start (10) -> should NOT auto-start.
        room.refresh_from_db()
        self.assertEqual(room.status, GameRoomStatus.WAITING)

        # Simulate reaching threshold, then fast-forward through the
        # resulting start countdown.
        room.min_players_to_start = 2
        room.save(update_fields=["min_players_to_start"])
        room = services.maybe_auto_start(room)
        self.assertEqual(room.status, GameRoomStatus.STARTING)
        room.scheduled_start_at = timezone.now() - timedelta(seconds=1)
        room.save(update_fields=["scheduled_start_at"])
        room = services.maybe_auto_start(room)
        self.assertEqual(room.status, GameRoomStatus.RUNNING)
        self.assertEqual(room.game_questions.count(), 10)  # matchmaking default question_count
        self.assertFalse(room.status == GameRoomStatus.FINISHED)

        participants = list(GameParticipant.objects.filter(game=room))
        room = play_full_game(room, participants)
        self.assertEqual(room.status, GameRoomStatus.FINISHED)

    def test_player_count_mode_begins_a_countdown_at_exactly_ten(self):
        users = [make_user(f"pc{i}") for i in range(10)]
        room = None
        for u in users:
            ticket = services.find_game(u, self.queue_count, self.subject)
            room = ticket.room
        room.refresh_from_db()
        # Public rooms count down too, same as a manual "Start" click —
        # not an instant transition straight to RUNNING.
        self.assertEqual(room.status, GameRoomStatus.STARTING)
        self.assertIsNotNone(room.scheduled_start_at)

    def test_player_count_mode_freezes_count_once_countdown_ends(self):
        users = [make_user(f"pcf{i}") for i in range(10)]
        room = None
        for u in users:
            ticket = services.find_game(u, self.queue_count, self.subject)
            room = ticket.room
        room.refresh_from_db()
        self.assertEqual(room.status, GameRoomStatus.STARTING)

        room.scheduled_start_at = timezone.now() - timedelta(seconds=1)
        room.save(update_fields=["scheduled_start_at"])
        room = services.maybe_auto_start(room)
        self.assertEqual(room.status, GameRoomStatus.RUNNING)
        self.assertEqual(room.participant_count_at_start, 10)

    def test_fewer_than_minimum_does_not_start(self):
        users = [make_user(f"few{i}") for i in range(5)]
        room = None
        for u in users:
            room = services.find_game(u, self.queue_count, self.subject).room
        room.refresh_from_db()
        self.assertEqual(room.status, GameRoomStatus.WAITING)

    def test_cannot_exceed_fifty_participants(self):
        room = make_room_with_settings(
            make_user("host"), self.subject, max_players=50,
            start_condition=GameStartCondition.MANUAL,
        )
        room.type = GameRoomType.PUBLIC
        room.save(update_fields=["type"])
        for i in range(49):  # +1 creator = 50
            services.join_room(room, make_user(f"p{i}"))
        self.assertEqual(room.participants.count(), 50)
        with self.assertRaises(ValueError):
            services.join_room(room, make_user("overflow"))

    def test_ten_and_fifty_participants_can_complete_a_public_game(self):
        for size in (10, 50):
            with self.subTest(size=size):
                room = make_room_with_settings(
                    make_user(f"host{size}"), self.subject, question_count=2, max_players=size,
                )
                room.type = GameRoomType.PUBLIC
                room.save(update_fields=["type"])
                for i in range(size - 1):
                    services.join_room(room, make_user(f"p{size}_{i}"))
                self.assertEqual(room.participants.count(), size)

                room = start_room_now(room, room.creator)
                self.assertEqual(room.participant_count_at_start, size)

                participants = list(GameParticipant.objects.filter(game=room))
                room = play_full_game(room, participants)
                self.assertEqual(room.status, GameRoomStatus.FINISHED)
                winner = GameParticipant.objects.filter(game=room).order_by("rank").first()
                self.assertEqual(winner.trophies_earned, trophies_for_rank(1, size))

    def test_timed_mode_does_not_start_before_deadline_and_starts_after(self):
        u1, u2 = make_user("t1"), make_user("t2")
        ticket = services.find_game(u1, self.queue_timer, self.subject)
        room = ticket.room
        services.find_game(u2, self.queue_timer, self.subject)
        room.refresh_from_db()
        self.assertEqual(room.status, GameRoomStatus.WAITING)

        # Simulate the join-window timer having expired -> begins the
        # (separate) start countdown, not an instant RUNNING transition.
        room.scheduled_start_at = timezone.now() - timedelta(seconds=1)
        room.save(update_fields=["scheduled_start_at"])
        room = services.maybe_auto_start(room)
        self.assertEqual(room.status, GameRoomStatus.STARTING)

        # And once THAT countdown elapses too, it actually goes RUNNING.
        room.scheduled_start_at = timezone.now() - timedelta(seconds=1)
        room.save(update_fields=["scheduled_start_at"])
        room = services.maybe_auto_start(room)
        self.assertEqual(room.status, GameRoomStatus.RUNNING)

    def test_game_does_not_instantly_finish_after_start(self):
        """The core regression test for the reported bug."""
        room = make_room_with_settings(make_user("solo_host"), self.subject, question_count=5)
        second = make_user("second")
        services.join_room(room, second)
        room = start_room_now(room, room.creator)
        self.assertEqual(room.status, GameRoomStatus.RUNNING)
        self.assertGreater(room.game_questions.count(), 0)
        for p in GameParticipant.objects.filter(game=room):
            self.assertEqual(p.current_question_index, 0)
            self.assertIsNotNone(p.current_question_started_at)
            self.assertIsNone(p.finished_at)


class IndependentPacingTests(TestCase):
    """Regression tests for 'players shouldn't wait for each other'."""

    def setUp(self):
        self.subject, self.topic = make_question_bank(count=20)

    def test_fast_player_finishes_without_waiting_for_slow_player(self):
        creator = make_user("fast")
        room = make_room_with_settings(creator, self.subject, question_count=3, max_players=5)
        slow = make_user("slow")
        services.join_room(room, slow)
        room = start_room_now(room, creator)

        fast_p = GameParticipant.objects.get(game=room, user=creator)
        slow_p = GameParticipant.objects.get(game=room, user=slow)

        answer_all_correctly(room, fast_p)
        fast_p.refresh_from_db()
        slow_p.refresh_from_db()

        # The fast player is done...
        self.assertIsNotNone(fast_p.finished_at)
        # ...while the slow player hasn't even started answering yet, and
        # the room itself is NOT finished (still waiting on the slow one).
        self.assertEqual(slow_p.current_question_index, 0)
        self.assertIsNone(slow_p.finished_at)
        room.refresh_from_db()
        self.assertEqual(room.status, GameRoomStatus.RUNNING)

        # Now the slow player finishes too -> room settles for everyone.
        answer_all_correctly(room, slow_p)
        room.refresh_from_db()
        self.assertEqual(room.status, GameRoomStatus.FINISHED)

    def test_different_participants_can_be_on_different_questions_simultaneously(self):
        creator = make_user("host_ip")
        room = make_room_with_settings(creator, self.subject, question_count=5, max_players=5)
        other = make_user("other_ip")
        services.join_room(room, other)
        room = start_room_now(room, creator)

        p1 = GameParticipant.objects.get(game=room, user=creator)
        p2 = GameParticipant.objects.get(game=room, user=other)
        from .gameplay import get_room_questions

        questions = get_room_questions(room)
        # p1 answers two questions, p2 answers none.
        for gq in questions[:2]:
            choice = gq.question.choices.filter(is_correct=True).first()
            record_answer(room, p1, gq.question_id, {"selected_choice_id": choice.id})
            p1.refresh_from_db()

        p1.refresh_from_db()
        p2.refresh_from_db()
        self.assertEqual(p1.current_question_index, 2)
        self.assertEqual(p2.current_question_index, 0)


class PerTierTimeLimitTests(TestCase):
    def setUp(self):
        self.subject, self.topic = make_question_bank(count=20, tier=Tier.HARD)

    def test_deadline_uses_this_questions_own_tier_time_limit(self):
        from .gameplay import get_room_questions, participant_deadline

        creator = make_user("tier_host")
        room = GameRoom.objects.create(creator=creator, name="R", max_players=5)
        GameSettings.objects.create(
            room=room, subject=self.subject, topic=None,
            question_count=3, easy_count=0, medium_count=0, hard_count=3,
            easy_time_limit=15, medium_time_limit=20, hard_time_limit=99,
            question_types=list(QuestionType.values),
        )
        GameParticipant.objects.create(game=room, user=creator)
        services.join_room(room, make_user("tier_second"))
        room = start_room_now(room, creator)

        participant = GameParticipant.objects.get(game=room, user=creator)
        questions = get_room_questions(room)
        deadline = participant_deadline(participant, room, questions)
        expected = participant.current_question_started_at + timedelta(seconds=99)
        self.assertEqual(deadline, expected)

    def _single_hard_question_room(self, creator, second_user):
        """A room whose one locked-in question is deterministic (only one
        hard-tier question exists), so the test can safely mutate its
        passage after selection instead of racing random.sample."""
        subject, topic = make_question_bank(subject_name="ՄեկՀարց", count=1, tier=Tier.HARD)
        room = GameRoom.objects.create(creator=creator, name="R", max_players=5)
        GameSettings.objects.create(
            room=room, subject=subject, topic=None,
            question_count=1, easy_count=0, medium_count=0, hard_count=1,
            easy_time_limit=15, medium_time_limit=20, hard_time_limit=30,
            question_types=list(QuestionType.values),
        )
        GameParticipant.objects.create(game=room, user=creator)
        services.join_room(room, second_user)
        return start_room_now(room, creator)

    def test_passage_question_gets_a_reading_time_bonus_on_top_of_tier_limit(self):
        from .gameplay import get_room_questions, participant_deadline

        creator = make_user("passage_host")
        room = self._single_hard_question_room(creator, make_user("passage_second"))

        game_question = room.game_questions.select_related("question").first()
        game_question.question.passage = " ".join(["word"] * 150)  # ~150 words -> ~60s bonus
        game_question.question.save(update_fields=["passage"])

        participant = GameParticipant.objects.get(game=room, user=creator)
        questions = get_room_questions(room)
        deadline = participant_deadline(participant, room, questions)

        # 30s tier limit + a real reading bonus, well beyond the bare tier limit.
        self.assertGreater(deadline, participant.current_question_started_at + timedelta(seconds=30))
        self.assertEqual(
            deadline, participant.current_question_started_at + timedelta(seconds=30 + 60)
        )

    def test_short_passage_still_gets_the_minimum_bonus(self):
        from .gameplay import PASSAGE_BONUS_MIN_SECONDS, get_room_questions, participant_deadline

        creator = make_user("short_passage_host")
        room = self._single_hard_question_room(creator, make_user("short_passage_second"))

        game_question = room.game_questions.select_related("question").first()
        game_question.question.passage = "Short."
        game_question.question.save(update_fields=["passage"])

        participant = GameParticipant.objects.get(game=room, user=creator)
        questions = get_room_questions(room)
        deadline = participant_deadline(participant, room, questions)

        self.assertEqual(
            deadline,
            participant.current_question_started_at + timedelta(seconds=30 + PASSAGE_BONUS_MIN_SECONDS),
        )


class SpeedBonusTests(TestCase):
    def setUp(self):
        self.subject, self.topic = make_question_bank(count=20)

    def test_fastest_full_completer_gets_the_speed_bonus(self):
        creator = make_user("speed_host")
        room = make_room_with_settings(creator, self.subject, question_count=2, max_players=5)
        slow = make_user("speed_slow")
        services.join_room(room, slow)
        room = start_room_now(room, creator)

        fast_p = GameParticipant.objects.get(game=room, user=creator)
        slow_p = GameParticipant.objects.get(game=room, user=slow)

        answer_all_correctly(room, fast_p)

        # The slow player genuinely takes longer (real elapsed time) — well
        # within the generous default time limits, so no deadline is missed.
        time.sleep(1.2)
        answer_all_correctly(room, slow_p)

        room.refresh_from_db()
        self.assertEqual(room.status, GameRoomStatus.FINISHED)
        fast_p.refresh_from_db()
        slow_p.refresh_from_db()
        self.assertGreater(fast_p.speed_bonus_xp, 0)
        self.assertLess(slow_p.speed_bonus_xp, fast_p.speed_bonus_xp)

    def test_time_cap_force_finish_does_not_earn_speed_bonus(self):
        creator = make_user("cap_host")
        room = make_room_with_settings(
            creator, self.subject, question_count=5, max_players=5, total_game_time=30,
        )
        services.join_room(room, make_user("cap_second"))
        room = start_room_now(room, creator)
        participant = GameParticipant.objects.get(game=room, user=creator)

        room.start_time = timezone.now() - timedelta(seconds=60)
        room.save(update_fields=["start_time"])
        room = services.maybe_close_by_time_cap(room)

        self.assertEqual(room.status, GameRoomStatus.FINISHED)
        participant.refresh_from_db()
        self.assertEqual(participant.speed_bonus_xp, 0)
        self.assertGreater(participant.unanswered_questions, 0)


class PrivateGameLifecycleTests(TestCase):
    def setUp(self):
        self.subject, self.topic = make_question_bank(count=20)

    def test_creator_can_create_and_start_room_with_settings(self):
        creator = make_user("creator")
        room = make_room_with_settings(creator, self.subject, question_count=5)
        self.assertEqual(room.type, GameRoomType.PRIVATE)
        joiner = make_user("joiner")
        services.join_room(room, joiner)
        room = start_room_now(room, creator)
        self.assertEqual(room.status, GameRoomStatus.RUNNING)
        self.assertEqual(room.game_questions.count(), 5)

    def test_join_code_flow_both_clients_see_running_state(self):
        creator = make_user("host2")
        room = make_room_with_settings(creator, self.subject, question_count=5)
        joiner = make_user("joiner2")
        services.join_room(room, joiner)
        room = start_room_now(room, creator)

        creator_participant = GameParticipant.objects.get(game=room, user=creator)
        joiner_participant = GameParticipant.objects.get(game=room, user=joiner)
        self.assertEqual(room.status, GameRoomStatus.RUNNING)
        self.assertIsNotNone(creator_participant)
        self.assertIsNotNone(joiner_participant)

    def test_private_game_completes_with_zero_trophies(self):
        creator = make_user("host3")
        room = make_room_with_settings(creator, self.subject, question_count=3)
        joiner = make_user("joiner3")
        services.join_room(room, joiner)
        room = start_room_now(room, creator)

        participants = list(GameParticipant.objects.filter(game=room))
        room = play_full_game(room, participants)

        self.assertEqual(room.status, GameRoomStatus.FINISHED)
        for p in GameParticipant.objects.filter(game=room):
            self.assertEqual(p.trophies_earned, 0)
        for p in participants:
            stats = GameStats.objects.get(user=p.user)
            self.assertEqual(stats.trophies, 0)

    def test_private_game_can_still_earn_speed_bonus_xp(self):
        creator = make_user("host4")
        room = make_room_with_settings(creator, self.subject, question_count=2)
        joiner = make_user("joiner4")
        services.join_room(room, joiner)
        room = start_room_now(room, creator)

        participants = list(GameParticipant.objects.filter(game=room))
        room = play_full_game(room, participants)
        self.assertTrue(
            GameParticipant.objects.filter(game=room, speed_bonus_xp__gt=0).exists()
        )


class CountdownTests(TestCase):
    """Creator clicks Start -> a COUNTDOWN_SECONDS countdown, not an
    instant transition — every client (not just the creator's) ends up
    RUNNING at the same moment via the shared scheduled_start_at."""

    def setUp(self):
        self.subject, self.topic = make_question_bank(count=20)

    def _room(self, creator, second_user):
        room = make_room_with_settings(creator, self.subject, question_count=3, max_players=5)
        services.join_room(room, second_user)
        return room

    def test_start_begins_a_countdown_instead_of_running_immediately(self):
        creator = make_user("cd_host")
        room = self._room(creator, make_user("cd_second"))

        room = services.start_room(room, creator)
        self.assertEqual(room.status, GameRoomStatus.STARTING)
        self.assertIsNotNone(room.scheduled_start_at)
        self.assertGreater(room.scheduled_start_at, timezone.now())
        # Not actually running yet — no questions locked in, no participant
        # pacing started.
        self.assertEqual(room.game_questions.count(), 0)

    def test_does_not_promote_before_countdown_ends(self):
        creator = make_user("cd_host2")
        room = self._room(creator, make_user("cd_second2"))
        room = services.start_room(room, creator)

        room = services.maybe_auto_start(room)
        self.assertEqual(room.status, GameRoomStatus.STARTING)

    def test_promotes_to_running_for_every_client_once_countdown_ends(self):
        creator = make_user("cd_host3")
        second = make_user("cd_second3")
        room = self._room(creator, second)
        room = services.start_room(room, creator)

        room.scheduled_start_at = timezone.now() - timedelta(seconds=1)
        room.save(update_fields=["scheduled_start_at"])

        # Simulates two different clients polling independently — both must
        # see the room go RUNNING from the same shared scheduled_start_at,
        # not from either of them personally clicking anything.
        room_view_a = GameRoom.objects.get(pk=room.pk)
        room_view_b = GameRoom.objects.get(pk=room.pk)
        promoted_a = services.maybe_auto_start(room_view_a)
        promoted_b = services.maybe_auto_start(room_view_b)

        self.assertEqual(promoted_a.status, GameRoomStatus.RUNNING)
        self.assertEqual(promoted_b.status, GameRoomStatus.RUNNING)
        self.assertGreater(room.game_questions.count(), 0)
        for p in GameParticipant.objects.filter(game=room):
            self.assertIsNotNone(p.current_question_started_at)

    def test_cannot_join_once_countdown_has_begun(self):
        creator = make_user("cd_host4")
        room = self._room(creator, make_user("cd_second4"))
        room = services.start_room(room, creator)

        with self.assertRaises(ValueError):
            services.join_room(room, make_user("latecomer"))

    def test_non_creator_cannot_start_the_countdown(self):
        creator = make_user("cd_host5")
        second = make_user("cd_second5")
        room = self._room(creator, second)

        with self.assertRaises(ValueError):
            services.start_room(room, second)


class StopGameTests(TestCase):
    """Creator can force-stop a running game for every participant."""

    def setUp(self):
        self.subject, self.topic = make_question_bank(count=20)

    def test_creator_stop_finishes_room_for_everyone_mid_game(self):
        creator = make_user("stop_host")
        room = make_room_with_settings(creator, self.subject, question_count=5, max_players=5)
        other = make_user("stop_other")
        services.join_room(room, other)
        room = start_room_now(room, creator)

        other_p = GameParticipant.objects.get(game=room, user=other)
        self.assertIsNone(other_p.finished_at)

        room = services.finish_room(room, creator)

        self.assertEqual(room.status, GameRoomStatus.FINISHED)
        other_p.refresh_from_db()
        self.assertIsNotNone(other_p.rank)
        self.assertIsNotNone(other_p.finished_at)
        self.assertGreater(other_p.unanswered_questions, 0)  # stopped mid-game

    def test_non_creator_cannot_stop_the_game(self):
        creator = make_user("stop_host2")
        other = make_user("stop_other2")
        room = make_room_with_settings(creator, self.subject, question_count=5, max_players=5)
        services.join_room(room, other)
        room = start_room_now(room, creator)

        with self.assertRaises(ValueError):
            services.finish_room(room, other)

    def test_stop_cannot_be_triggered_twice(self):
        creator = make_user("stop_host3")
        other = make_user("stop_other3")
        room = make_room_with_settings(creator, self.subject, question_count=5, max_players=5)
        services.join_room(room, other)
        room = start_room_now(room, creator)

        room = services.finish_room(room, creator)
        with self.assertRaises(ValueError):
            services.finish_room(room, creator)


class TrophyScalingTests(TestCase):
    def test_rewards_do_not_scale_linearly_and_are_ordered(self):
        r2 = trophies_for_rank(1, 2)
        r10 = trophies_for_rank(1, 10)
        r50 = trophies_for_rank(1, 50)
        self.assertLess(r2, r10)
        self.assertLess(r10, r50)
        # Non-linear: 50 players is 5x the room of 10, but reward ratio is far below 5x.
        self.assertLess(r50 / r10, 3)

    def test_only_top_three_get_trophies(self):
        self.assertGreater(trophies_for_rank(1, 20), 0)
        self.assertGreater(trophies_for_rank(2, 20), 0)
        self.assertGreater(trophies_for_rank(3, 20), 0)
        self.assertEqual(trophies_for_rank(4, 20), 0)

    def test_rank_order_within_same_room(self):
        first = trophies_for_rank(1, 30)
        second = trophies_for_rank(2, 30)
        third = trophies_for_rank(3, 30)
        self.assertGreater(first, second)
        self.assertGreater(second, third)


class TrophyIdempotencyAndEligibilityTests(TestCase):
    def setUp(self):
        self.subject, self.topic = make_question_bank(count=20)

    def _public_room(self, question_count=3):
        creator = make_user("host_pub")
        room = make_room_with_settings(creator, self.subject, question_count=question_count, max_players=10)
        room.type = GameRoomType.PUBLIC
        room.save(update_fields=["type"])
        return room, creator

    def test_public_game_awards_trophies_once(self):
        room, creator = self._public_room()
        joiner = make_user("joiner_pub")
        services.join_room(room, joiner)
        room = start_room_now(room, creator)

        participants = list(GameParticipant.objects.filter(game=room))
        room = play_full_game(room, participants)
        self.assertEqual(room.status, GameRoomStatus.FINISHED)

        winner = GameParticipant.objects.filter(game=room).order_by("rank").first()
        self.assertGreater(winner.trophies_earned, 0)
        stats_before = GameStats.objects.get(user=winner.user).trophies

        # Duplicate finish attempt must not award trophies again.
        with self.assertRaises(ValueError):
            services.finish_room(room, creator)
        stats_after = GameStats.objects.get(user=winner.user).trophies
        self.assertEqual(stats_before, stats_after)

        # A duplicate completion-check (simulating a race) must also be a no-op.
        services.check_room_completion(room)
        stats_after_check = GameStats.objects.get(user=winner.user).trophies
        self.assertEqual(stats_before, stats_after_check)

    def test_trophy_scaling_uses_frozen_start_count_not_max_players(self):
        room, creator = self._public_room()
        room.max_players = 50
        room.save(update_fields=["max_players"])
        second = make_user("only_other")
        services.join_room(room, second)
        room = start_room_now(room, creator)
        self.assertEqual(room.participant_count_at_start, 2)

        participants = list(GameParticipant.objects.filter(game=room))
        room = play_full_game(room, participants)
        winner = GameParticipant.objects.filter(game=room).order_by("rank").first()
        # Reward must reflect 2 actual participants, not max_players=50.
        self.assertEqual(winner.trophies_earned, trophies_for_rank(1, 2))


class SettleRoomSubjectXPTests(TestCase):
    """_settle_room should credit each participant's SubjectXP ledger for
    the room's subject, in addition to the overall MonthlyXP it already
    credited before this change."""

    def setUp(self):
        self.creator = make_user("creator")
        self.opponent = make_user("opponent")
        self.subject = Subject.objects.create(name="Մաթեմատիկա")
        self.room = make_room_with_settings(self.creator, self.subject)
        GameParticipant.objects.filter(game=self.room, user=self.creator).update(score=30)
        GameParticipant.objects.create(game=self.room, user=self.opponent, score=10)

    def test_settle_room_credits_subject_xp_for_math(self):
        services._settle_room(self.room)
        self.assertEqual(SubjectXP.objects.get(user=self.creator, subject_key="math").xp, 30)
        self.assertEqual(SubjectXP.objects.get(user=self.opponent, subject_key="math").xp, 10)

    def test_settle_room_without_settings_does_not_crash_or_credit_subject(self):
        room = GameRoom.objects.create(creator=self.creator, name="No settings room", type=GameRoomType.PRIVATE)
        GameParticipant.objects.create(game=room, user=self.creator, score=15)
        services._settle_room(room)
        self.assertFalse(SubjectXP.objects.filter(user=self.creator).exists())


class GameXPAntiFarmTests(TestCase):
    """_settle_room applies diminishing returns per Nth game a user settles
    in one day (100% for games 1-5, 50% for 6-10, 10% for 11+), and logs a
    read-only admin flag once a user crosses a high daily-volume threshold —
    without ever reducing XP below the diminishing-returns curve itself.
    Uses solo private rooms (one participant, no speed bonus/trophies
    eligible) so xp_earned reflects the anti-farming multiplier on its own,
    with no other XP source in the mix."""

    def setUp(self):
        self.user = make_user("farmer")
        self.subject = Subject.objects.create(name="Մաթեմատիկա")

    def _settle_one(self, score=10):
        """Settles one room and returns the refreshed participant — reading
        xp_earned (set directly per-room by _settle_room) rather than
        cumulative Profile.total_xp, since achievement unlocks (e.g. "first
        game played") also grant XP through the same award_xp funnel and
        would otherwise confound a cumulative total."""
        room = make_room_with_settings(self.user, self.subject)
        participant = GameParticipant.objects.get(game=room, user=self.user)
        participant.score = score
        participant.save(update_fields=["score"])
        services._settle_room(room)
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


class WebSocketJWTAuthTests(TransactionTestCase):
    """TransactionTestCase, not TestCase: the middleware under test runs its
    query through channels' database_sync_to_async, which hands the work to a
    worker thread and closes that thread's connection afterwards — which a
    TestCase's outer atomic block does not survive.

    WebSocket auth is a separate code path from DRF's, so the guarantee
    that revoking a device cuts it off everywhere only holds if this path
    checks the session too. Without these, a revoked or logged-out device
    would keep receiving chat/notification/game traffic in realtime until its
    access token expired."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="wsuser", email="wsuser@example.com", password="StrongPass1"
        )
        self.session = UserSession.objects.create(user=self.user)
        self.token = issue_tokens_for_user(self.user, self.session)["access"]

    def _resolve(self, token):
        return async_to_sync(_get_user_from_token)(token)

    def test_token_with_active_session_authenticates(self):
        self.assertEqual(self._resolve(self.token), self.user)

    def test_token_whose_session_was_revoked_is_rejected(self):
        self.session.revoke()

        self.assertTrue(self._resolve(self.token).is_anonymous)

    def test_token_without_a_session_claim_is_rejected(self):
        """A signature-valid token that never went through
        issue_tokens_for_user has no session to revoke, so it must not be
        accepted — otherwise it would be an unrevocable socket credential."""
        bare = str(RefreshToken.for_user(self.user).access_token)

        self.assertTrue(self._resolve(bare).is_anonymous)

    def test_garbage_token_is_rejected(self):
        self.assertTrue(self._resolve("not-a-token").is_anonymous)
