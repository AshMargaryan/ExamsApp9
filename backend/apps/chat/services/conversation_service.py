from django.db import IntegrityError, transaction

from ..models import Conversation, ConversationParticipant, ConversationType, Message, ParticipantRole


def _attach_last_messages(conversations: list[Conversation]) -> list[Conversation]:
    """
    Bulk-fetches the newest message per conversation in one query (Postgres
    `DISTINCT ON`) instead of either N+1 queries or prefetching every
    message just to read the last one. Attaches as `_last_message` for
    ConversationSerializer.get_last_message to pick up.
    """
    ids = [c.id for c in conversations]
    if not ids:
        return conversations
    last_messages = (
        Message.objects.filter(conversation_id__in=ids)
        .order_by("conversation_id", "-id")
        .distinct("conversation_id")
        .select_related("sender")
    )
    by_conversation = {m.conversation_id: m for m in last_messages}
    for c in conversations:
        c._last_message = by_conversation.get(c.id)
    return conversations


def _attach_unread_counts(conversations: list[Conversation], user) -> list[Conversation]:
    """
    One aggregate query for every conversation's unread count for `user`,
    rather than a per-conversation COUNT. See Conversation model docstring
    for why this is computed instead of stored.
    """
    memberships = {
        m.conversation_id: m
        for m in ConversationParticipant.objects.filter(
            conversation_id__in=[c.id for c in conversations], user=user, active=True
        )
    }
    for c in conversations:
        membership = memberships.get(c.id)
        last_read_id = membership.last_read_message_id if membership else None
        qs = c.messages.all()
        if last_read_id is not None:
            qs = qs.filter(id__gt=last_read_id)
        c._unread_count = qs.count()
    return conversations


def attach_summary(conversation: Conversation, user) -> Conversation:
    """Single-conversation equivalent of the list_for_user bulk attach helpers, for detail views."""
    _attach_last_messages([conversation])
    _attach_unread_counts([conversation], user)
    return conversation


def list_for_user(user, search: str = "") -> list[Conversation]:
    conversations = list(
        Conversation.objects.filter(memberships__user=user, memberships__active=True)
        .prefetch_related("memberships__user__profile")
        .distinct()
    )
    if search:
        conversations = [
            c for c in conversations
            if search.lower() in c.name.lower()
            or any(
                search.lower() in (m.user.first_name + " " + m.user.last_name + " " + m.user.username).lower()
                for m in c.memberships.all()
                if m.user_id != user.id
            )
        ]
    conversations = _attach_last_messages(conversations)
    conversations = _attach_unread_counts(conversations, user)
    conversations.sort(key=lambda c: c.updated_at, reverse=True)
    return conversations


def get_or_create_private(user, other_user) -> tuple[Conversation, bool]:
    """
    Atomically resolves to the single private conversation between these
    two users, creating it (with both as participants) if none exists yet.
    Relies on Conversation.private_key's unique constraint to make this
    race-safe under concurrent requests — a second concurrent create
    attempt hits an IntegrityError and falls back to fetching the winner's
    row, rather than either erroring out or creating a duplicate.
    """
    key = Conversation.build_private_key(user.id, other_user.id)
    existing = Conversation.objects.filter(private_key=key).first()
    if existing is not None:
        return existing, False

    try:
        with transaction.atomic():
            conversation = Conversation.objects.create(
                type=ConversationType.PRIVATE, private_key=key, created_by=user,
            )
            ConversationParticipant.objects.bulk_create([
                ConversationParticipant(conversation=conversation, user=user),
                ConversationParticipant(conversation=conversation, user=other_user),
            ])
        return conversation, True
    except IntegrityError:
        return Conversation.objects.get(private_key=key), False


def create_group(creator, name: str, participant_ids: list[int]) -> Conversation:
    from django.contrib.auth import get_user_model

    User = get_user_model()
    member_ids = set(participant_ids) - {creator.id}

    with transaction.atomic():
        conversation = Conversation.objects.create(
            type=ConversationType.GROUP, name=name, created_by=creator,
        )
        participants = [
            ConversationParticipant(conversation=conversation, user=creator, role=ParticipantRole.OWNER)
        ]
        participants += [
            ConversationParticipant(conversation=conversation, user_id=uid, role=ParticipantRole.MEMBER)
            for uid in User.objects.filter(id__in=member_ids).values_list("id", flat=True)
        ]
        ConversationParticipant.objects.bulk_create(participants)
    return conversation


def total_unread_count(user) -> int:
    """Backs a header badge — summed across every conversation the user's in."""
    conversations = list(
        Conversation.objects.filter(memberships__user=user, memberships__active=True).only("id", "updated_at")
    )
    _attach_unread_counts(conversations, user)
    return sum(c._unread_count for c in conversations)


def other_participant(conversation: Conversation, user):
    """For a private conversation, the user on the other end — used by the
    serializer so the frontend can show their name/avatar as the title."""
    if conversation.type != ConversationType.PRIVATE:
        return None
    membership = next(
        (m for m in conversation.memberships.all() if m.user_id != user.id), None
    )
    return membership.user if membership else None
