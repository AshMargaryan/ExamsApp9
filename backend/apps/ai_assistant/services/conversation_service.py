from django.db.models import Q

from ..models import Conversation

AUTO_TITLE_MAX_LENGTH = 60


def list_for_user(user, search: str = "", archived: bool | None = None):
    qs = Conversation.objects.filter(owner=user)
    if archived is not None:
        qs = qs.filter(is_archived=archived)
    if search:
        qs = qs.filter(Q(title__icontains=search))
    return qs


def create(user) -> Conversation:
    return Conversation.objects.create(owner=user)


def rename(conversation: Conversation, title: str) -> Conversation:
    conversation.title = title
    conversation.save(update_fields=["title", "updated_at"])
    return conversation


def auto_title_from_first_message(conversation: Conversation, text: str) -> Conversation:
    if conversation.title:
        return conversation
    title = text.strip().replace("\n", " ")[:AUTO_TITLE_MAX_LENGTH]
    if len(text.strip()) > AUTO_TITLE_MAX_LENGTH:
        title = title.rstrip() + "..."
    conversation.title = title or "New conversation"
    conversation.save(update_fields=["title", "updated_at"])
    return conversation


def soft_delete(conversation: Conversation) -> Conversation:
    conversation.soft_delete()
    return conversation


def restore(conversation: Conversation) -> Conversation:
    conversation.restore()
    return conversation


def archive(conversation: Conversation) -> Conversation:
    conversation.is_archived = True
    conversation.save(update_fields=["is_archived", "updated_at"])
    return conversation


def unarchive(conversation: Conversation) -> Conversation:
    conversation.is_archived = False
    conversation.save(update_fields=["is_archived", "updated_at"])
    return conversation


def pin(conversation: Conversation) -> Conversation:
    conversation.is_pinned = True
    conversation.save(update_fields=["is_pinned", "updated_at"])
    return conversation


def unpin(conversation: Conversation) -> Conversation:
    conversation.is_pinned = False
    conversation.save(update_fields=["is_pinned", "updated_at"])
    return conversation
