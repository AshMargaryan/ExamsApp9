from rest_framework.permissions import BasePermission

from .models import ConversationParticipant


class IsConversationParticipant(BasePermission):
    """
    Object-level check for views whose object IS a Conversation.
    Requirement #7: only participants may view/send/upload/download.
    """

    message = "Դուք այս զրույցի մասնակից չեք։"

    def has_object_permission(self, request, view, obj):
        return ConversationParticipant.objects.filter(
            conversation=obj, user=request.user, active=True
        ).exists()


def is_participant(conversation_id, user) -> bool:
    """Function form for views/consumers that only have a conversation id, not the instance."""
    return ConversationParticipant.objects.filter(
        conversation_id=conversation_id, user=user, active=True
    ).exists()
