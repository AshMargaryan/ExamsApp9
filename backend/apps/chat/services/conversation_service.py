from django.db import IntegrityError, transaction
from django.db.models import Count, F, Q

from apps.friends.services import are_friends, is_blocked
from apps.notifications.models import NotificationType
from apps.notifications.services import create_notification

from ..models import Conversation, ConversationParticipant, ConversationType, Message, ParticipantRole, RequestStatus


def _notify_message_request(recipient, sender) -> None:
    name = sender.first_name or sender.username
    create_notification(
        recipient, NotificationType.MESSAGE_REQUEST, f"{name}-ից նոր հաղորդագրության հարցում", link="/chat",
    )


def _notify_group_invite(recipient, conversation: Conversation) -> None:
    create_notification(
        recipient, NotificationType.GROUP_INVITE, f"Ավելացվեցիք «{conversation.name}» խմբում", link="/chat",
    )


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
    for why this is computed instead of stored. Also stashes the caller's
    own membership row as `_my_membership` — pinned/muted are per-user
    preferences (see ConversationParticipant), so the serializer needs the
    *caller's* row specifically, not just any participant's.
    """
    ids = [c.id for c in conversations]
    memberships = {
        m.conversation_id: m
        for m in ConversationParticipant.objects.filter(conversation_id__in=ids, user=user, active=True)
    }
    unread_counts = {}
    if ids:
        rows = (
            Message.objects.filter(
                conversation_id__in=ids, conversation__memberships__user=user, conversation__memberships__active=True,
            )
            .annotate(_read_threshold=F("conversation__memberships__last_read_message_id"))
            .filter(Q(_read_threshold__isnull=True) | Q(id__gt=F("_read_threshold")))
            .values("conversation_id")
            .annotate(unread=Count("id"))
        )
        unread_counts = {row["conversation_id"]: row["unread"] for row in rows}
    for c in conversations:
        c._my_membership = memberships.get(c.id)
        c._unread_count = unread_counts.get(c.id, 0)
    return conversations


def attach_summary(conversation: Conversation, user) -> Conversation:
    """Single-conversation equivalent of the list_for_user bulk attach helpers, for detail views."""
    _attach_last_messages([conversation])
    _attach_unread_counts([conversation], user)
    return conversation


def set_prefs(conversation: Conversation, user, *, pinned: bool | None = None, muted: bool | None = None) -> None:
    updates = {}
    if pinned is not None:
        updates["pinned"] = pinned
    if muted is not None:
        updates["muted"] = muted
    if updates:
        ConversationParticipant.objects.filter(conversation=conversation, user=user).update(**updates)


def list_for_user(user, search: str = "") -> list[Conversation]:
    """
    The caller's regular inbox — excludes conversations still sitting in
    their own PENDING request state (see get_or_create_private and
    list_requests: those surface separately as "message requests" until
    accepted/declined, not mixed into the main list).
    """
    conversations = list(
        Conversation.objects.filter(memberships__user=user, memberships__active=True)
        .exclude(memberships__user=user, memberships__request_status=RequestStatus.PENDING)
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

    New conversations between non-friends start as a "message request" —
    `user` (the initiator) is ACCEPTED immediately, `other_user` is PENDING
    until they accept/decline/block (see respond_to_request). Already-
    existing conversations are returned as-is, untouched — accepting once
    doesn't need to be redone, and a declined request shouldn't quietly
    reopen just because the same pair start() again... except a blocked
    pair can never even reach that far.
    """
    if is_blocked(user, other_user):
        raise ValueError("Հնարավոր չէ սկսել զրույց այս օգտատիրոջ հետ։")

    key = Conversation.build_private_key(user.id, other_user.id)
    existing = Conversation.objects.filter(private_key=key).first()
    if existing is not None:
        # `user` may have left this conversation before (active=False) —
        # starting it again should resume it, not leave them locked out of
        # a conversation they're the one re-initiating.
        ConversationParticipant.objects.filter(
            conversation=existing, user=user, active=False
        ).update(active=True)
        return existing, False

    initial_status = RequestStatus.ACCEPTED if are_friends(user, other_user) else RequestStatus.PENDING
    try:
        with transaction.atomic():
            conversation = Conversation.objects.create(
                type=ConversationType.PRIVATE, private_key=key, created_by=user,
            )
            ConversationParticipant.objects.bulk_create([
                ConversationParticipant(conversation=conversation, user=user, request_status=RequestStatus.ACCEPTED),
                ConversationParticipant(conversation=conversation, user=other_user, request_status=initial_status),
            ])
        if initial_status == RequestStatus.PENDING:
            _notify_message_request(other_user, user)
        return conversation, True
    except IntegrityError:
        return Conversation.objects.get(private_key=key), False


def list_requests(user) -> list[Conversation]:
    """The caller's own pending message requests — see get_or_create_private."""
    conversations = list(
        Conversation.objects.filter(
            memberships__user=user, memberships__active=True, memberships__request_status=RequestStatus.PENDING,
        )
        .prefetch_related("memberships__user__profile")
        .distinct()
    )
    conversations = _attach_last_messages(conversations)
    conversations.sort(key=lambda c: c.updated_at, reverse=True)
    return conversations


def respond_to_request(conversation: Conversation, user, action: str) -> None:
    membership = ConversationParticipant.objects.filter(
        conversation=conversation, user=user, request_status=RequestStatus.PENDING,
    ).first()
    if membership is None:
        raise ValueError("Հարցում չի գտնվել։")

    if action == "accept":
        membership.request_status = RequestStatus.ACCEPTED
        membership.save(update_fields=["request_status"])
    elif action == "decline":
        membership.request_status = RequestStatus.DECLINED
        membership.active = False
        membership.save(update_fields=["request_status", "active"])
    elif action == "block":
        other = other_participant(conversation, user)
        if other is not None:
            from apps.friends.models import Block

            Block.objects.get_or_create(blocker=user, blocked=other)
        membership.request_status = RequestStatus.DECLINED
        membership.active = False
        membership.save(update_fields=["request_status", "active"])
    else:
        raise ValueError("Անհայտ գործողություն։")


def create_group(
    creator, name: str, participant_ids: list[int],
    description: str = "", subject: str = "", grade: int | None = None, privacy: str = "private",
) -> Conversation:
    from django.contrib.auth import get_user_model

    User = get_user_model()
    member_ids = set(participant_ids) - {creator.id}

    with transaction.atomic():
        conversation = Conversation.objects.create(
            type=ConversationType.GROUP, name=name, created_by=creator,
            description=description, subject=subject, grade=grade, privacy=privacy,
        )
        participants = [
            ConversationParticipant(conversation=conversation, user=creator, role=ParticipantRole.OWNER)
        ]
        members = list(User.objects.filter(id__in=member_ids))
        participants += [
            ConversationParticipant(conversation=conversation, user=u, role=ParticipantRole.MEMBER)
            for u in members
        ]
        ConversationParticipant.objects.bulk_create(participants)
    for u in members:
        _notify_group_invite(u, conversation)
    return conversation


def search(user, query: str, limit: int = 20):
    """
    Scoped to conversations `user` actually participates in — chat search
    can never be a backdoor into someone else's messages/files just by
    guessing a search term. Returns (messages, files), newest first.
    """
    from ..models import Attachment, Message

    messages = (
        Message.objects.filter(
            conversation__memberships__user=user, conversation__memberships__active=True,
            text__icontains=query, deleted_at__isnull=True,
        )
        .exclude(hidden_for=user)
        .select_related("sender", "conversation")
        .order_by("-id")[:limit]
    )
    files = (
        Attachment.objects.filter(
            conversation__memberships__user=user, conversation__memberships__active=True,
            original_filename__icontains=query,
        )
        .select_related("conversation")
        .order_by("-uploaded_at")[:limit]
    )
    return list(messages), list(files)


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
