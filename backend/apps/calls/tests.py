from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.study_groups.models import GroupType, MembershipRole, StudyGroup, StudyGroupMembership

from .models import CallParticipant, CallRoom, CallRoomStatus

User = get_user_model()


def _make_user(username):
    return User.objects.create_user(username=username, email=f"{username}@example.com", password="pw123456")


def _make_group(leader, *members):
    group = StudyGroup.objects.create(
        title="Calc crew", subject="math", type=GroupType.STUDY_GROUP,
        schedule_day=1, schedule_start_time="18:00:00", schedule_end_time="19:00:00",
        max_members=10, leader=leader,
    )
    StudyGroupMembership.objects.create(group=group, user=leader, role=MembershipRole.LEADER)
    for m in members:
        StudyGroupMembership.objects.create(group=group, user=m, role=MembershipRole.MEMBER)
    return group


class CallCreateTests(TestCase):
    def setUp(self):
        self.leader = _make_user("alice")
        self.outsider = _make_user("dave")
        self.group = _make_group(self.leader)
        self.client = APIClient()

    def test_group_member_can_create_call(self):
        self.client.force_authenticate(self.leader)
        resp = self.client.post("/api/calls/", {"study_group": self.group.id, "capacity": 4}, format="json")
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data["participant_count"], 1)
        self.assertEqual(resp.data["status"], CallRoomStatus.WAITING)
        room = CallRoom.objects.get(pk=resp.data["id"])
        self.assertTrue(CallParticipant.objects.filter(room=room, user=self.leader).exists())

    def test_non_member_cannot_create_call(self):
        self.client.force_authenticate(self.outsider)
        resp = self.client.post("/api/calls/", {"study_group": self.group.id, "capacity": 4}, format="json")
        self.assertEqual(resp.status_code, 403)

    def test_capacity_out_of_bounds_rejected(self):
        self.client.force_authenticate(self.leader)
        resp = self.client.post("/api/calls/", {"study_group": self.group.id, "capacity": 1}, format="json")
        self.assertEqual(resp.status_code, 400)
        resp = self.client.post("/api/calls/", {"study_group": self.group.id, "capacity": 99}, format="json")
        self.assertEqual(resp.status_code, 400)

    def test_call_with_open_capacity_starts_waiting(self):
        self.client.force_authenticate(self.leader)
        resp = self.client.post("/api/calls/", {"study_group": self.group.id, "capacity": 2}, format="json")
        self.assertEqual(resp.data["status"], CallRoomStatus.WAITING)


class CallRegistrationTests(TestCase):
    def setUp(self):
        self.leader = _make_user("alice")
        self.member = _make_user("bob")
        self.member2 = _make_user("carol")
        self.outsider = _make_user("dave")
        self.group = _make_group(self.leader, self.member, self.member2)
        self.room = CallRoom.objects.create(study_group=self.group, creator=self.leader, capacity=2)
        CallParticipant.objects.create(room=self.room, user=self.leader)
        self.client = APIClient()

    def test_member_can_join(self):
        self.client.force_authenticate(self.member)
        resp = self.client.post(f"/api/calls/{self.room.id}/join/")
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(CallParticipant.objects.filter(room=self.room, user=self.member).exists())

    def test_join_fills_capacity_and_locks_room(self):
        self.client.force_authenticate(self.member)
        resp = self.client.post(f"/api/calls/{self.room.id}/join/")
        self.assertEqual(resp.data["status"], CallRoomStatus.READY)

    def test_join_beyond_capacity_rejected(self):
        CallParticipant.objects.create(room=self.room, user=self.member)
        self.room.status = CallRoomStatus.READY
        self.room.save(update_fields=["status"])
        self.client.force_authenticate(self.member2)
        resp = self.client.post(f"/api/calls/{self.room.id}/join/")
        self.assertEqual(resp.status_code, 400)

    def test_double_join_rejected(self):
        self.client.force_authenticate(self.leader)
        resp = self.client.post(f"/api/calls/{self.room.id}/join/")
        self.assertEqual(resp.status_code, 400)

    def test_non_group_member_cannot_join(self):
        self.client.force_authenticate(self.outsider)
        resp = self.client.post(f"/api/calls/{self.room.id}/join/")
        self.assertEqual(resp.status_code, 403)


class CallLeaveCancelTests(TestCase):
    def setUp(self):
        self.leader = _make_user("alice")
        self.member = _make_user("bob")
        self.group = _make_group(self.leader, self.member)
        self.room = CallRoom.objects.create(study_group=self.group, creator=self.leader, capacity=2)
        CallParticipant.objects.create(room=self.room, user=self.leader)
        CallParticipant.objects.create(room=self.room, user=self.member)
        self.room.status = CallRoomStatus.READY
        self.room.save(update_fields=["status"])
        self.client = APIClient()

    def test_member_leave_reopens_room(self):
        self.client.force_authenticate(self.member)
        resp = self.client.post(f"/api/calls/{self.room.id}/leave/")
        self.assertEqual(resp.status_code, 204)
        self.room.refresh_from_db()
        self.assertEqual(self.room.status, CallRoomStatus.WAITING)

    def test_creator_cannot_leave(self):
        self.client.force_authenticate(self.leader)
        resp = self.client.post(f"/api/calls/{self.room.id}/leave/")
        self.assertEqual(resp.status_code, 400)
        self.assertTrue(CallParticipant.objects.filter(room=self.room, user=self.leader).exists())

    def test_creator_can_cancel(self):
        self.client.force_authenticate(self.leader)
        resp = self.client.delete(f"/api/calls/{self.room.id}/")
        self.assertEqual(resp.status_code, 204)
        self.assertFalse(CallRoom.objects.filter(pk=self.room.id).exists())

    def test_non_creator_cannot_cancel(self):
        self.client.force_authenticate(self.member)
        resp = self.client.delete(f"/api/calls/{self.room.id}/")
        self.assertEqual(resp.status_code, 403)
        self.assertTrue(CallRoom.objects.filter(pk=self.room.id).exists())

    def test_active_call_cannot_be_cancelled(self):
        self.room.status = CallRoomStatus.ACTIVE
        self.room.save(update_fields=["status"])
        self.client.force_authenticate(self.leader)
        resp = self.client.delete(f"/api/calls/{self.room.id}/")
        self.assertEqual(resp.status_code, 400)


class CallListTests(TestCase):
    def setUp(self):
        self.leader = _make_user("alice")
        self.group = _make_group(self.leader)
        self.other_group = _make_group(self.leader)
        CallRoom.objects.create(study_group=self.group, creator=self.leader, capacity=4)
        CallRoom.objects.create(study_group=self.other_group, creator=self.leader, capacity=4)
        self.client = APIClient()
        self.client.force_authenticate(self.leader)

    def test_list_scoped_to_study_group(self):
        resp = self.client.get("/api/calls/list/", {"study_group": self.group.id})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 1)

    def test_list_requires_study_group_param(self):
        resp = self.client.get("/api/calls/list/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 0)


class CallVisibilityScopingTests(TestCase):
    """Creating and joining a call already require study-group membership
    (services.is_group_member). Reading one must too — a call's participant
    list is exactly who is on a video call right now, and study groups are a
    public directory, so a room id is guessable from outside the group."""

    def setUp(self):
        self.member = _make_user("member")
        self.outsider = _make_user("outsider")
        self.group = _make_group(self.member)
        self.room = CallRoom.objects.create(study_group=self.group, creator=self.member, capacity=4)
        CallParticipant.objects.create(room=self.room, user=self.member)

        self.member_client = APIClient()
        self.member_client.force_authenticate(self.member)
        self.outsider_client = APIClient()
        self.outsider_client.force_authenticate(self.outsider)

    def test_member_can_read_call_detail(self):
        response = self.member_client.get(f"/api/calls/{self.room.id}/")
        self.assertEqual(response.status_code, 200)

    def test_non_member_cannot_read_call_detail(self):
        response = self.outsider_client.get(f"/api/calls/{self.room.id}/")
        self.assertEqual(response.status_code, 404)

    def test_member_can_list_calls_for_their_group(self):
        response = self.member_client.get("/api/calls/list/", {"study_group": self.group.id})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

    def test_non_member_listing_another_groups_calls_gets_nothing(self):
        response = self.outsider_client.get("/api/calls/list/", {"study_group": self.group.id})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])

    def test_participant_count_is_not_inflated_by_the_membership_scoping(self):
        """The scoping is an EXISTS subquery precisely so it cannot multiply
        the rows Count('participants') aggregates over."""
        second = _make_user("second")
        StudyGroupMembership.objects.create(group=self.group, user=second, role=MembershipRole.MEMBER)
        CallParticipant.objects.create(room=self.room, user=second)

        response = self.member_client.get(f"/api/calls/{self.room.id}/")

        self.assertEqual(response.data["participant_count"], 2)
