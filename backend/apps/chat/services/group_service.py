from django.contrib.auth import get_user_model

from ..models import Conversation, ConversationParticipant, ParticipantRole

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
    created = ConversationParticipant.objects.bulk_create([
        ConversationParticipant(conversation=conversation, user_id=uid, role=ParticipantRole.MEMBER)
        for uid in User.objects.filter(id__in=new_ids).values_list("id", flat=True)
    ])
    return created + to_reactivate


def remove_participant(conversation: Conversation, user) -> None:
    """Soft-removes (active=False) — keeps their past Messages attributed to them."""
    ConversationParticipant.objects.filter(conversation=conversation, user=user).update(active=False)


def is_owner(conversation: Conversation, user) -> bool:
    return ConversationParticipant.objects.filter(
        conversation=conversation, user=user, active=True, role=ParticipantRole.OWNER
    ).exists()


def rename(conversation: Conversation, name: str) -> Conversation:
    conversation.name = name
    conversation.save(update_fields=["name"])
    return conversation


def update_image(conversation: Conversation, image_file) -> Conversation:
    conversation.image = image_file
    conversation.save(update_fields=["image"])
    return conversation
