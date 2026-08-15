from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from apps.notifications.models import NotificationType, StudentNotification

from .models import FriendRequest, Friendship

User = get_user_model()


def _make_user(username):
    return User.objects.create_user(username=username, email=f"{username}@example.com", password="pw123456")


class FriendDashboardTests(TestCase):
    def setUp(self):
        self.me = _make_user("alice")
        self.friend = _make_user("carol")
        self.stranger = _make_user("dave")
        self.client = APIClient()

    def test_stranger_gets_403(self):
        self.client.force_authenticate(self.stranger)
        resp = self.client.get(f"/api/friends/{self.me.id}/dashboard/")
        self.assertEqual(resp.status_code, 403)

    def test_friend_gets_full_dashboard(self):
        Friendship.objects.create(user1=self.me, user2=self.friend)
        self.client.force_authenticate(self.friend)
        resp = self.client.get(f"/api/friends/{self.me.id}/dashboard/")
        self.assertEqual(resp.status_code, 200)
        self.assertIn("subject_performance", resp.data)
        self.assertIn("weekly_progress", resp.data)
        self.assertEqual(resp.data["overview"]["username"], "alice")

    def test_self_gets_own_dashboard(self):
        self.client.force_authenticate(self.me)
        resp = self.client.get(f"/api/friends/{self.me.id}/dashboard/")
        self.assertEqual(resp.status_code, 200)


class FriendRequestAcceptNotificationTests(TestCase):
    def test_accept_notifies_sender(self):
        sender = _make_user("alice")
        receiver = _make_user("carol")
        fr = FriendRequest.objects.create(sender=sender, receiver=receiver)

        client = APIClient()
        client.force_authenticate(receiver)
        resp = client.post(f"/api/friends/requests/{fr.id}/respond/", {"action": "accept"})

        self.assertEqual(resp.status_code, 200)
        notification = StudentNotification.objects.get(user=sender)
        self.assertEqual(notification.notification_type, NotificationType.FRIEND_ADDED)
