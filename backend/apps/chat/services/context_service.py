from django.conf import settings

from apps.challenges.models import ChallengeInvite
from apps.mock_exams.models import MockExamAttempt, MockExamAttemptStatus
from apps.profiles.models import Profile, UserAchievement

from ..models import ContextType

BUILDERS = {}


def register(context_type):
    def decorator(fn):
        BUILDERS[context_type] = fn
        return fn

    return decorator


def build_context_data(context_type: str, context_id: int, sender) -> dict:
    """
    Fetches the source object under `sender`'s own permissions and returns a
    plain-dict snapshot to store on the Message. Raises ValueError (caught
    by the view/consumer as a 400 / rejected WS action) if the object
    doesn't exist or `sender` isn't allowed to share it — the same object a
    user isn't allowed to see can't be shared into a chat just by guessing
    its id.
    """
    builder = BUILDERS.get(context_type)
    if builder is None:
        raise ValueError("Անհայտ կիսվող պարունակության տեսակ։")
    return builder(context_id, sender)


@register(ContextType.MOCK_EXAM_RESULT)
def _build_mock_exam_result(attempt_id: int, sender) -> dict:
    attempt = (
        MockExamAttempt.objects.select_related("exam")
        .filter(id=attempt_id, user=sender, status=MockExamAttemptStatus.COMPLETED)
        .first()
    )
    if attempt is None:
        raise ValueError("Այս քննության արդյունքը հասանելի չէ կիսվելու համար։")
    return {
        "attempt_id": attempt.id,
        "exam_id": attempt.exam_id,
        "exam_title": attempt.exam.title,
        "subject": attempt.exam.subject,
        "scaled_score": attempt.scaled_score,
        "raw_score": attempt.raw_score,
        "question_count": attempt.exam.question_count,
        "percent_answered": attempt.percent_answered,
        "duration_minutes": attempt.duration_minutes,
        "completed_at": attempt.completed_at.isoformat() if attempt.completed_at else None,
    }


@register(ContextType.ACHIEVEMENT)
def _build_achievement(user_achievement_id: int, sender) -> dict:
    unlock = (
        UserAchievement.objects.select_related("achievement")
        .filter(id=user_achievement_id, user=sender)
        .first()
    )
    if unlock is None:
        raise ValueError("Այս նվաճումը հասանելի չէ կիսվելու համար։")
    achievement = unlock.achievement
    return {
        "user_achievement_id": unlock.id,
        "key": achievement.key,
        "name": achievement.name,
        "description": achievement.description,
        "icon": achievement.icon,
        "rarity": achievement.rarity,
        "xp_reward": achievement.xp_reward,
        "unlocked_at": unlock.unlocked_at.isoformat(),
    }


@register(ContextType.PROFILE)
def _build_profile(user_id: int, sender) -> dict:
    # Sharing is always "share my own profile" for now — not an arbitrary
    # other user's, which would need its own privacy check. Matches spec
    # section 22 ("Send a profile card" from your own profile page).
    if user_id != sender.id:
        raise ValueError("Կարող ես կիսվել միայն սեփական պրոֆիլով։")
    profile = Profile.objects.filter(user_id=user_id).first()
    if profile is None:
        raise ValueError("Պրոֆիլը հասանելի չէ։")
    return {
        "user_id": sender.id,
        "username": sender.username,
        "first_name": sender.first_name,
        "last_name": sender.last_name,
        # Absolute, like AttachmentSerializer.get_download_url — this snapshot
        # has no request in context (it's built the same way whether the
        # share came in over REST or the WS consumer), so it can't rely on
        # build_absolute_uri and falls back to BACKEND_URL directly.
        "avatar": f"{settings.BACKEND_URL}{profile.avatar.url}" if profile.avatar else None,
        "level": profile.level,
        "total_xp": profile.total_xp,
        "bio": profile.bio,
    }


@register(ContextType.CHALLENGE)
def _build_challenge(invite_id: int, sender) -> dict:
    # A point-in-time snapshot, same as the other three card types — the
    # card's Accept/Decline buttons call the real challenges API directly
    # and update just that message's displayed data locally, rather than
    # this snapshot somehow staying live for every viewer.
    invite = (
        ChallengeInvite.objects.select_related("sender", "receiver", "subject", "room")
        .filter(id=invite_id)
        .first()
    )
    if invite is None or sender.id not in (invite.sender_id, invite.receiver_id):
        raise ValueError("Այս մարտահրավերը հասանելի չէ կիսվելու համար։")
    return {
        "invite_id": invite.id,
        "sender_id": invite.sender_id,
        "sender_username": invite.sender.username,
        "sender_name": invite.sender.first_name or invite.sender.username,
        "receiver_id": invite.receiver_id,
        "receiver_username": invite.receiver.username,
        "receiver_name": invite.receiver.first_name or invite.receiver.username,
        "subject_name": invite.subject.name,
        "status": invite.status,
        "room_code": invite.room.room_code if invite.room else None,
    }
