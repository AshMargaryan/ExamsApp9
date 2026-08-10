from datetime import timedelta

from django.db import transaction
from django.utils import timezone

from apps.friends.services import are_friends
from apps.games.models import GameParticipant, GameRoom, GameRoomType, GameSettings, GameStartCondition
from apps.games.services import maybe_auto_start
from apps.practice.models import QuestionType
from apps.profiles.subjects import canonical_key_for_practice_subject

from .models import ChallengeInvite, ChallengeStatus

# Fixed preset per product decision: the sender only picks opponent + subject
# (+ optional topic) — no custom question-count/difficulty UI, to keep the
# challenge flow to a single quick step. Mirrors the spec's own example
# ("10 Mathematics questions, Medium difficulty").
CHALLENGE_QUESTION_COUNT = 10
CHALLENGE_EASY_COUNT = 3
CHALLENGE_MEDIUM_COUNT = 5
CHALLENGE_HARD_COUNT = 2
CHALLENGE_TIME_LIMIT_PER_QUESTION = 30
CHALLENGE_EXPIRY_HOURS = 24
CHALLENGE_WINNER_BONUS_XP = 20


def create_challenge(sender, receiver, subject, topic=None) -> ChallengeInvite:
    if not are_friends(sender, receiver):
        raise ValueError("Կարող եք մարտահրավեր նետել միայն ձեր ընկերներին։")

    existing = ChallengeInvite.objects.filter(
        sender=sender, receiver=receiver, status=ChallengeStatus.PENDING
    ).first()
    if existing:
        raise ValueError("Այս օգտատիրոջը արդեն մարտահրավեր եք նետել։")

    invite = ChallengeInvite.objects.create(
        sender=sender, receiver=receiver, subject=subject, topic=topic,
        expires_at=timezone.now() + timedelta(hours=CHALLENGE_EXPIRY_HOURS),
    )

    from apps.notifications.models import NotificationType  # local import: avoids a load-order dependency
    from apps.notifications.services import create_notification

    create_notification(
        receiver, NotificationType.CHALLENGE_RECEIVED,
        f"⚔️ {sender.username}-ը մարտահրավեր է նետել քեզ՝ {subject.name} առարկայից։",
        context={"challenge_id": invite.id}, link="/games",
    )
    return invite


@transaction.atomic
def accept_challenge(invite: ChallengeInvite) -> ChallengeInvite:
    if invite.status != ChallengeStatus.PENDING:
        raise ValueError("Այս հրավերն այլևս ակտիվ չէ։")

    room = GameRoom.objects.create(
        creator=invite.sender,
        name=f"Մարտահրավեր՝ {invite.subject.name}",
        type=GameRoomType.PRIVATE,
        max_players=2,
        start_condition=GameStartCondition.PLAYER_COUNT,
        min_players_to_start=2,
    )
    GameSettings.objects.create(
        room=room, subject=invite.subject, topic=invite.topic,
        question_count=CHALLENGE_QUESTION_COUNT,
        easy_count=CHALLENGE_EASY_COUNT, medium_count=CHALLENGE_MEDIUM_COUNT, hard_count=CHALLENGE_HARD_COUNT,
        time_limit_per_question=CHALLENGE_TIME_LIMIT_PER_QUESTION,
        question_types=list(QuestionType.values),
    )
    GameParticipant.objects.create(game=room, user=invite.sender)
    GameParticipant.objects.create(game=room, user=invite.receiver)

    invite.status = ChallengeStatus.ACCEPTED
    invite.room = room
    invite.responded_at = timezone.now()
    invite.save(update_fields=["status", "room", "responded_at"])

    maybe_auto_start(room)
    return invite


def decline_challenge(invite: ChallengeInvite) -> ChallengeInvite:
    if invite.status != ChallengeStatus.PENDING:
        raise ValueError("Այս հրավերն այլևս ակտիվ չէ։")
    invite.status = ChallengeStatus.DECLINED
    invite.responded_at = timezone.now()
    invite.save(update_fields=["status", "responded_at"])
    return invite


def cancel_challenge(invite: ChallengeInvite) -> ChallengeInvite:
    if invite.status != ChallengeStatus.PENDING:
        raise ValueError("Այս հրավերն այլևս ակտիվ չէ։")
    invite.status = ChallengeStatus.CANCELLED
    invite.save(update_fields=["status"])
    return invite


def expire_stale_invites() -> None:
    """Lazy, same convention as apps.rankings.services.close_previous_month_if_needed —
    no cron in this project, so this runs at the top of the list/detail views instead."""
    ChallengeInvite.objects.filter(
        status=ChallengeStatus.PENDING, expires_at__lt=timezone.now()
    ).update(status=ChallengeStatus.EXPIRED)


def challenge_subject_key(invite: ChallengeInvite) -> str | None:
    return canonical_key_for_practice_subject(invite.subject)


def notify_challenge_result(invite: ChallengeInvite, winner_user_id: int | None) -> None:
    """Called by games.services._settle_room right after it settles a
    challenge room — fires one CHALLENGE_RESULT notification to each of the
    two participants, worded from their own point of view."""
    from apps.notifications.models import NotificationType  # local import: avoids a load-order dependency
    from apps.notifications.services import create_notification

    for user, opponent in ((invite.sender, invite.receiver), (invite.receiver, invite.sender)):
        won = winner_user_id == user.id
        message = (
            f"🏆 Հաղթեցիր {opponent.username}-ի դեմ մարտահրավերում! +{CHALLENGE_WINNER_BONUS_XP} XP բոնուս։"
            if won
            else f"🎮 Մարտահրավերն ավարտվեց {opponent.username}-ի դեմ։"
        )
        create_notification(
            user, NotificationType.CHALLENGE_RESULT, message,
            context={"challenge_id": invite.id, "won": won}, link="/games",
        )
