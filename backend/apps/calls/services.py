from django.db import transaction

from apps.study_groups.models import StudyGroupMembership

from .models import CallParticipant, CallRoom, CallRoomStatus


class NotGroupMemberError(Exception):
    pass


class RoomNotOpenError(Exception):
    pass


class AlreadyRegisteredError(Exception):
    pass


class CallFullError(Exception):
    pass


class NotAParticipantError(Exception):
    pass


class CreatorCannotLeaveError(Exception):
    pass


class NotCreatorError(Exception):
    pass


class RoomNotCancellableError(Exception):
    pass


def is_group_member(study_group, user) -> bool:
    return StudyGroupMembership.objects.filter(group=study_group, user=user).exists()


def _maybe_mark_ready(room: CallRoom) -> None:
    """Flips WAITING -> READY the instant capacity is reached — same lazy,
    no-scheduler promotion as apps.games.services.maybe_auto_start, just
    without a countdown: there's no gameplay to stage into, the lobby just
    locks and Milestone 3's signaling takes it from there."""
    if room.status == CallRoomStatus.WAITING and room.participants.count() >= room.capacity:
        room.status = CallRoomStatus.READY
        room.save(update_fields=["status"])


@transaction.atomic
def create_call_room(creator, study_group, capacity: int) -> CallRoom:
    if not is_group_member(study_group, creator):
        raise NotGroupMemberError()
    room = CallRoom.objects.create(study_group=study_group, creator=creator, capacity=capacity)
    CallParticipant.objects.create(room=room, user=creator)
    _maybe_mark_ready(room)
    return room


@transaction.atomic
def register_for_call(room: CallRoom, user) -> CallParticipant:
    """Race-safe: locks the room row for the duration of the count-then-create
    so two simultaneous registrations landing at capacity-1 can't both
    succeed — same pattern as apps.games.services.join_room and
    apps.study_groups.services.join_group."""
    locked = CallRoom.objects.select_for_update().get(pk=room.pk)
    if locked.status != CallRoomStatus.WAITING:
        raise RoomNotOpenError()
    if not is_group_member(locked.study_group, user):
        raise NotGroupMemberError()
    if CallParticipant.objects.filter(room=locked, user=user).exists():
        raise AlreadyRegisteredError()
    if locked.participants.count() >= locked.capacity:
        raise CallFullError()
    participant = CallParticipant.objects.create(room=locked, user=user)
    _maybe_mark_ready(locked)
    return participant


@transaction.atomic
def leave_call(room: CallRoom, user) -> None:
    if user.id == room.creator_id:
        raise CreatorCannotLeaveError()
    locked = CallRoom.objects.select_for_update().get(pk=room.pk)
    deleted, _ = CallParticipant.objects.filter(room=locked, user=user).delete()
    if not deleted:
        raise NotAParticipantError()
    # A spot freed up on a room that had already locked — reopen registration.
    if locked.status == CallRoomStatus.READY and locked.participants.count() < locked.capacity:
        locked.status = CallRoomStatus.WAITING
        locked.save(update_fields=["status"])


def cancel_call(room: CallRoom, user) -> None:
    if user.id != room.creator_id:
        raise NotCreatorError()
    if room.status in (CallRoomStatus.ACTIVE, CallRoomStatus.ENDED):
        raise RoomNotCancellableError()
    room.delete()
