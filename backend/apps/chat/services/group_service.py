from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.notifications.models import NotificationType
from apps.notifications.services import create_notification

from ..models import Conversation, ConversationParticipant, Message, ParticipantRole

User = get_user_model()


def add_participants(conversation: Conversation, user_ids: list[int]) -> list[ConversationParticipant]:
    """
    Adds each user as a member, or reactivates them if they'd previously
    left/been removed (active=False) — never a second row, since
    (conversation, user) is uniquely constrained.
    """
    existing = {
        m.user_id: m for m in ConversationParticipant.objects.filter(
            conversation=conversation, user_id__in=user_ids
        )
    }
    to_reactivate = [m for m in existing.values() if not m.active]
    for m in to_reactivate:
        m.active = True
    if to_reactivate:
        ConversationParticipant.objects.bulk_update(to_reactivate, ["active"])

    new_ids = set(user_ids) - set(existing)
    new_users = list(User.objects.filter(id__in=new_ids))
    created = ConversationParticipant.objects.bulk_create([
        ConversationParticipant(conversation=conversation, user=u, role=ParticipantRole.MEMBER)
        for u in new_users
    ])
    # Only genuinely new members, not reactivated ones — someone who left
    # and got re-added doesn't need a "you were added" ping the same way a
    # first-timer does.
    for u in new_users:
        create_notification(
            u, NotificationType.GROUP_INVITE,
            f"Ավելացվեցիք «{conversation.name}» խմբում", link="/chat",
        )
    return created + to_reactivate


def remove_participant(conversation: Conversation, user) -> None:
    """Soft-removes (active=False) — keeps their past Messages attributed to them."""
    ConversationParticipant.objects.filter(conversation=conversation, user=user).update(active=False)


def is_owner(conversation: Conversation, user) -> bool:
    return ConversationParticipant.objects.filter(
        conversation=conversation, user=user, active=True, role=ParticipantRole.OWNER
    ).exists()


def is_manager(conversation: Conversation, user) -> bool:
    """Owner or admin — the roles spec #31 grants pin/settings/moderation privileges to."""
    return ConversationParticipant.objects.filter(
        conversation=conversation, user=user, active=True,
        role__in=[ParticipantRole.OWNER, ParticipantRole.ADMIN],
    ).exists()


def rename(conversation: Conversation, name: str) -> Conversation:
    conversation.name = name
    conversation.save(update_fields=["name"])
    return conversation


def update_image(conversation: Conversation, image_file) -> Conversation:
    conversation.image = image_file
    conversation.save(update_fields=["image"])
    return conversation


def update_settings(conversation: Conversation, **fields) -> Conversation:
    """fields: any of description/subject/grade/privacy — only touches what's passed."""
    update_fields = []
    for name, value in fields.items():
        setattr(conversation, name, value)
        update_fields.append(name)
    if update_fields:
        conversation.save(update_fields=update_fields)
    return conversation


def pin_message(message: Message) -> Message:
    if message.pinned_at is None:
        message.pinned_at = timezone.now()
        message.save(update_fields=["pinned_at"])
    return message


def unpin_message(message: Message) -> Message:
    if message.pinned_at is not None:
        message.pinned_at = None
        message.save(update_fields=["pinned_at"])
    return message


def list_pinned(conversation: Conversation) -> list[Message]:
    return list(
        conversation.messages.filter(pinned_at__isnull=False, deleted_at__isnull=True)
        .select_related("sender")
        .order_by("-pinned_at")
    )
