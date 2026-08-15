from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from .models import GroupType, MembershipRole, StudyGroup, StudyGroupMembership

User = get_user_model()


def _make_user(username):
    return User.objects.create_user(username=username, email=f"{username}@example.com", password="pw123456")


def _group_payload(**overrides):
    payload = {
        "title": "Calculus crew",
        "subject": "math",
        "type": GroupType.STUDY_GROUP,
        "description": "Weekly problem sets",
        "schedule_day": 1,
        "schedule_start_time": "18:00:00",
        "schedule_end_time": "19:00:00",
    }
    payload.update(overrides)
    return payload


class GroupCreateTests(TestCase):
    def setUp(self):
        self.leader = _make_user("alice")
        self.client = APIClient()
        self.client.force_authenticate(self.leader)

    def test_create_study_group_defaults_max_members(self):
        resp = self.client.post("/api/groups/", _group_payload(), format="json")
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data["max_members"], 10)
        group = StudyGroup.objects.get(pk=resp.data["id"])
        self.assertEqual(group.leader_id, self.leader.id)
        self.assertTrue(
            StudyGroupMembership.objects.filter(group=group, user=self.leader, role=MembershipRole.LEADER).exists()
        )

    def test_create_tutoring_defaults_max_members(self):
        resp = self.client.post("/api/groups/", _group_payload(type=GroupType.TUTORING), format="json")
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data["max_members"], 2)

    def test_invalid_subject_rejected(self):
        resp = self.client.post("/api/groups/", _group_payload(subject="art"), format="json")
        self.assertEqual(resp.status_code, 400)

    def test_invalid_type_rejected(self):
        resp = self.client.post("/api/groups/", _group_payload(type="book_club"), format="json")
        self.assertEqual(resp.status_code, 400)

    def test_end_time_before_start_time_rejected(self):
        resp = self.client.post(
            "/api/groups/",
            _group_payload(schedule_start_time="19:00:00", schedule_end_time="18:00:00"),
            format="json",
        )
        self.assertEqual(resp.status_code, 400)


class GroupJoinLeaveTests(TestCase):
    def setUp(self):
        self.leader = _make_user("alice")
        self.member = _make_user("bob")
        self.outsider = _make_user("carol")
        self.group = StudyGroup.objects.create(
            title="Tiny tutoring", subject="physics", type=GroupType.TUTORING,
            schedule_day=2, schedule_start_time="10:00:00", schedule_end_time="11:00:00",
            max_members=2, leader=self.leader,
        )
        StudyGroupMembership.objects.create(group=self.group, user=self.leader, role=MembershipRole.LEADER)
        self.client = APIClient()

    def test_join_happy_path(self):
        self.client.force_authenticate(self.member)
        resp = self.client.post(f"/api/groups/{self.group.id}/join/")
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(StudyGroupMembership.objects.filter(group=self.group, user=self.member).exists())

    def test_join_full_group_rejected(self):
        StudyGroupMembership.objects.create(group=self.group, user=self.member, role=MembershipRole.MEMBER)
        self.client.force_authenticate(self.outsider)
        resp = self.client.post(f"/api/groups/{self.group.id}/join/")
        self.assertEqual(resp.status_code, 400)

    def test_double_join_rejected(self):
        self.client.force_authenticate(self.leader)
        resp = self.client.post(f"/api/groups/{self.group.id}/join/")
        self.assertEqual(resp.status_code, 400)

    def test_member_can_leave(self):
        StudyGroupMembership.objects.create(group=self.group, user=self.member, role=MembershipRole.MEMBER)
        self.client.force_authenticate(self.member)
        resp = self.client.post(f"/api/groups/{self.group.id}/leave/")
        self.assertEqual(resp.status_code, 204)
        self.assertFalse(StudyGroupMembership.objects.filter(group=self.group, user=self.member).exists())

    def test_leader_cannot_leave(self):
        self.client.force_authenticate(self.leader)
        resp = self.client.post(f"/api/groups/{self.group.id}/leave/")
        self.assertEqual(resp.status_code, 400)
        self.assertTrue(StudyGroupMembership.objects.filter(group=self.group, user=self.leader).exists())


class GroupDeleteTests(TestCase):
    def setUp(self):
        self.leader = _make_user("alice")
        self.stranger = _make_user("bob")
        self.group = StudyGroup.objects.create(
            title="Bio group", subject="biology", type=GroupType.STUDY_GROUP,
            schedule_day=0, schedule_start_time="09:00:00", schedule_end_time="10:00:00",
            max_members=10, leader=self.leader,
        )
        self.client = APIClient()

    def test_non_leader_cannot_delete(self):
        self.client.force_authenticate(self.stranger)
        resp = self.client.delete(f"/api/groups/{self.group.id}/")
        self.assertEqual(resp.status_code, 403)
        self.assertTrue(StudyGroup.objects.filter(pk=self.group.id).exists())

    def test_leader_can_delete(self):
        self.client.force_authenticate(self.leader)
        resp = self.client.delete(f"/api/groups/{self.group.id}/")
        self.assertEqual(resp.status_code, 204)
        self.assertFalse(StudyGroup.objects.filter(pk=self.group.id).exists())


class TransferLeadershipTests(TestCase):
    def setUp(self):
        self.leader = _make_user("alice")
        self.member = _make_user("bob")
        self.outsider = _make_user("carol")
        self.group = StudyGroup.objects.create(
            title="Chem group", subject="chemistry", type=GroupType.STUDY_GROUP,
            schedule_day=3, schedule_start_time="14:00:00", schedule_end_time="15:00:00",
            max_members=10, leader=self.leader,
        )
        StudyGroupMembership.objects.create(group=self.group, user=self.leader, role=MembershipRole.LEADER)
        StudyGroupMembership.objects.create(group=self.group, user=self.member, role=MembershipRole.MEMBER)
        self.client = APIClient()

    def test_non_leader_cannot_transfer(self):
        self.client.force_authenticate(self.member)
        resp = self.client.post(
            f"/api/groups/{self.group.id}/transfer-leadership/", {"new_leader_id": self.member.id}
        )
        self.assertEqual(resp.status_code, 403)

    def test_cannot_transfer_to_non_member(self):
        self.client.force_authenticate(self.leader)
        resp = self.client.post(
            f"/api/groups/{self.group.id}/transfer-leadership/", {"new_leader_id": self.outsider.id}
        )
        self.assertEqual(resp.status_code, 400)

    def test_leader_can_transfer_then_leave(self):
        self.client.force_authenticate(self.leader)
        resp = self.client.post(
            f"/api/groups/{self.group.id}/transfer-leadership/", {"new_leader_id": self.member.id}
        )
        self.assertEqual(resp.status_code, 200)

        self.group.refresh_from_db()
        self.assertEqual(self.group.leader_id, self.member.id)
        self.assertEqual(
            StudyGroupMembership.objects.get(group=self.group, user=self.member).role, MembershipRole.LEADER
        )
        self.assertEqual(
            StudyGroupMembership.objects.get(group=self.group, user=self.leader).role, MembershipRole.MEMBER
        )

        leave_resp = self.client.post(f"/api/groups/{self.group.id}/leave/")
        self.assertEqual(leave_resp.status_code, 204)
