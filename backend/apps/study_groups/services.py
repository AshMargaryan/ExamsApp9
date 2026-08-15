from django.db import transaction

from .models import MembershipRole, StudyGroup, StudyGroupMembership


class GroupFullError(Exception):
    pass


class AlreadyMemberError(Exception):
    pass


class LeaderCannotLeaveError(Exception):
    pass


class NotAMemberError(Exception):
    pass


class NotAGroupMemberError(Exception):
    """Raised when a leadership transfer target isn't a member of the group."""


def create_group(leader, **fields) -> StudyGroup:
    with transaction.atomic():
        group = StudyGroup.objects.create(leader=leader, **fields)
        StudyGroupMembership.objects.create(group=group, user=leader, role=MembershipRole.LEADER)
        return group


def join_group(group: StudyGroup, user) -> StudyGroupMembership:
    """Race-safe: locks the group row for the duration of the count-then-create,
    so two concurrent joins can't both slip past max_members — same pattern as
    apps.users.sessions.create_session's device-cap check."""
    with transaction.atomic():
        locked_group = StudyGroup.objects.select_for_update().get(pk=group.pk)
        if StudyGroupMembership.objects.filter(group=locked_group, user=user).exists():
            raise AlreadyMemberError()
        member_count = StudyGroupMembership.objects.filter(group=locked_group).count()
        if member_count >= locked_group.max_members:
            raise GroupFullError()
        return StudyGroupMembership.objects.create(group=locked_group, user=user, role=MembershipRole.MEMBER)


def leave_group(group: StudyGroup, user) -> None:
    if group.leader_id == user.id:
        raise LeaderCannotLeaveError()
    deleted, _ = StudyGroupMembership.objects.filter(group=group, user=user).delete()
    if not deleted:
        raise NotAMemberError()


def delete_group(group: StudyGroup) -> None:
    group.delete()


def transfer_leadership(group: StudyGroup, new_leader) -> None:
    with transaction.atomic():
        try:
            new_membership = StudyGroupMembership.objects.select_for_update().get(group=group, user=new_leader)
        except StudyGroupMembership.DoesNotExist:
            raise NotAGroupMemberError()

        StudyGroupMembership.objects.filter(group=group, user_id=group.leader_id).update(
            role=MembershipRole.MEMBER
        )
        new_membership.role = MembershipRole.LEADER
        new_membership.save(update_fields=["role"])

        group.leader = new_leader
        group.save(update_fields=["leader"])
