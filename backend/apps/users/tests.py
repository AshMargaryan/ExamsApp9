from unittest.mock import patch

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from .oauth import make_registration_ticket

User = get_user_model()

GOOGLE_CLAIMS = {
    "sub": "google-sub-123",
    "email": "newuser@example.com",
    "email_verified": True,
    "first_name": "Անի",
    "last_name": "Հակոբյան",
}


def mock_claims(**overrides):
    return {**GOOGLE_CLAIMS, **overrides}


class GoogleAuthViewTests(APITestCase):
    def test_new_user_returns_ticket_without_creating_a_user(self):
        with patch("apps.users.views.verify_google_id_token", return_value=mock_claims()):
            response = self.client.post("/api/auth/google/", {"id_token": "fake"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["is_new"])
        self.assertIn("ticket", response.data)
        self.assertEqual(response.data["email"], "newuser@example.com")
        self.assertFalse(User.objects.filter(email="newuser@example.com").exists())

    def test_unverified_email_is_rejected(self):
        with patch("apps.users.views.verify_google_id_token", return_value=mock_claims(email_verified=False)):
            response = self.client.post("/api/auth/google/", {"id_token": "fake"})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_existing_google_id_logs_in_directly(self):
        User.objects.create_user(
            username="existinggoogleuser", email="linked@example.com", password="unused",
            google_id="google-sub-123",
        )
        with patch("apps.users.views.verify_google_id_token", return_value=mock_claims(email="linked@example.com")):
            response = self.client.post("/api/auth/google/", {"id_token": "fake"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertNotIn("is_new", response.data)

    def test_verified_email_auto_links_to_existing_password_account_no_duplicate(self):
        existing = User.objects.create_user(
            username="passworduser", email="newuser@example.com", password="StrongPass1",
        )
        with patch("apps.users.views.verify_google_id_token", return_value=mock_claims()):
            response = self.client.post("/api/auth/google/", {"id_token": "fake"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        existing.refresh_from_db()
        self.assertEqual(existing.google_id, "google-sub-123")
        self.assertEqual(User.objects.filter(email__iexact="newuser@example.com").count(), 1)


APPLE_CLAIMS = {
    "sub": "apple-sub-456",
    "email": "newappleuser@example.com",
    "email_verified": True,
}


def mock_apple_claims(**overrides):
    return {**APPLE_CLAIMS, **overrides}


class AppleAuthViewTests(APITestCase):
    def test_new_user_returns_ticket_without_creating_a_user(self):
        with patch("apps.users.views.verify_apple_id_token", return_value=mock_apple_claims()):
            response = self.client.post("/api/auth/apple/", {
                "id_token": "fake", "first_name": "Անի", "last_name": "Հակոբյան",
            })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["is_new"])
        self.assertEqual(response.data["first_name"], "Անի")
        self.assertFalse(User.objects.filter(email="newappleuser@example.com").exists())

    def test_missing_name_on_non_first_authorization_is_tolerated(self):
        with patch("apps.users.views.verify_apple_id_token", return_value=mock_apple_claims()):
            response = self.client.post("/api/auth/apple/", {"id_token": "fake"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["first_name"], "")
        self.assertEqual(response.data["last_name"], "")

    def test_unverified_email_is_rejected(self):
        with patch("apps.users.views.verify_apple_id_token", return_value=mock_apple_claims(email_verified=False)):
            response = self.client.post("/api/auth/apple/", {"id_token": "fake"})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_existing_apple_id_logs_in_directly(self):
        User.objects.create_user(
            username="existingappleuser", email="linked-apple@example.com", password="unused",
            apple_id="apple-sub-456",
        )
        with patch("apps.users.views.verify_apple_id_token", return_value=mock_apple_claims(email="linked-apple@example.com")):
            response = self.client.post("/api/auth/apple/", {"id_token": "fake"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertNotIn("is_new", response.data)

    def test_verified_email_auto_links_to_existing_password_account_no_duplicate(self):
        existing = User.objects.create_user(
            username="applepassworduser", email="newappleuser@example.com", password="StrongPass1",
        )
        with patch("apps.users.views.verify_apple_id_token", return_value=mock_apple_claims()):
            response = self.client.post("/api/auth/apple/", {"id_token": "fake"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        existing.refresh_from_db()
        self.assertEqual(existing.apple_id, "apple-sub-456")
        self.assertEqual(User.objects.filter(email__iexact="newappleuser@example.com").count(), 1)

    def test_completes_registration_via_apple_ticket(self):
        with patch("apps.users.views.verify_apple_id_token", return_value=mock_apple_claims()):
            init_response = self.client.post("/api/auth/apple/", {
                "id_token": "fake", "first_name": "Անի", "last_name": "Հակոբյան",
            })
        ticket = init_response.data["ticket"]

        response = self.client.post("/api/auth/oauth/complete/", {
            "ticket": ticket, "username": "anifromapple", "first_name": "Անի",
            "last_name": "Հակոբյան", "role": "student",
        })

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(username="anifromapple")
        self.assertEqual(user.apple_id, "apple-sub-456")
        self.assertFalse(user.has_usable_password())


class OAuthCompleteRegisterViewTests(APITestCase):
    def _ticket(self, **overrides):
        data = {
            "provider": "google", "sub": "google-sub-123", "email": "newuser@example.com",
            "first_name": "Անի", "last_name": "Հակոբյան",
        }
        data.update(overrides)
        return make_registration_ticket(**data)

    def test_completes_registration_and_creates_fully_formed_user(self):
        ticket = self._ticket()
        response = self.client.post("/api/auth/oauth/complete/", {
            "ticket": ticket, "username": "anihakobyan", "first_name": "Անի",
            "last_name": "Հակոբյան", "role": "student", "age": 17, "grade": 11,
        })

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

        user = User.objects.get(username="anihakobyan")
        self.assertEqual(user.google_id, "google-sub-123")
        self.assertEqual(user.email, "newuser@example.com")
        self.assertTrue(user.is_email_verified)
        self.assertFalse(user.has_usable_password())
        self.assertEqual(user.role, "student")

    def test_username_collision_returns_suggestions(self):
        User.objects.create_user(username="taken", email="other@example.com", password="unused")
        ticket = self._ticket()
        response = self.client.post("/api/auth/oauth/complete/", {
            "ticket": ticket, "username": "taken", "first_name": "Անի",
            "last_name": "Հակոբյան", "role": "student",
        })

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["username"]["message"], "Այս օգտանունն արդեն զբաղված է։")
        self.assertEqual(len(response.data["username"]["suggestions"]), 4)

    def test_tampered_ticket_is_rejected(self):
        ticket = self._ticket() + "tampered"
        response = self.client.post("/api/auth/oauth/complete/", {
            "ticket": ticket, "username": "someone", "first_name": "Ա",
            "last_name": "Բ", "role": "student",
        })

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_expired_ticket_is_rejected(self):
        ticket = self._ticket()
        with patch("apps.users.oauth.TICKET_MAX_AGE_SECONDS", -1):
            response = self.client.post("/api/auth/oauth/complete/", {
                "ticket": ticket, "username": "someone", "first_name": "Ա",
                "last_name": "Բ", "role": "student",
            })

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_email_taken_by_another_account_between_ticket_issue_and_completion(self):
        User.objects.create_user(username="raceduser", email="newuser@example.com", password="unused")
        ticket = self._ticket()
        response = self.client.post("/api/auth/oauth/complete/", {
            "ticket": ticket, "username": "freeusername", "first_name": "Ա",
            "last_name": "Բ", "role": "student",
        })

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(username="freeusername").exists())

    def test_concurrent_completion_for_same_provider_id_logs_in_instead_of_duplicating(self):
        already_created = User.objects.create_user(
            username="firstcompletion", email="newuser@example.com", password="unused",
            google_id="google-sub-123",
        )
        ticket = self._ticket()
        response = self.client.post("/api/auth/oauth/complete/", {
            "ticket": ticket, "username": "secondcompletion", "first_name": "Ա",
            "last_name": "Բ", "role": "student",
        })

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(User.objects.filter(google_id="google-sub-123").count(), 1)
        self.assertFalse(User.objects.filter(username="secondcompletion").exists())
        self.assertTrue(User.objects.filter(pk=already_created.pk).exists())


import threading

from django.db import connection
from django.test import TransactionTestCase
from rest_framework.test import APIClient

from .models import UserSession
from .utils import issue_tokens_for_user

PASSWORD = "StrongPass1"


class DeviceSessionLimitTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="deviceuser", email="deviceuser@example.com", password=PASSWORD)

    def _login(self):
        return self.client.post("/api/auth/login/", {"username": "deviceuser", "password": PASSWORD})

    def test_first_and_second_device_login_succeed(self):
        first = self._login()
        second = self._login()

        self.assertEqual(first.status_code, status.HTTP_200_OK)
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertEqual(UserSession.objects.filter(user=self.user, revoked_at__isnull=True).count(), 2)

    def test_third_device_login_is_rejected(self):
        self._login()
        self._login()
        third = self._login()

        self.assertEqual(third.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(third.data["code"], "device_limit_reached")
        self.assertIn("management_ticket", third.data)
        self.assertEqual(UserSession.objects.filter(user=self.user, revoked_at__isnull=True).count(), 2)

    def test_logout_frees_a_slot(self):
        first = self._login()
        self._login()

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {first.data['access']}")
        logout_response = self.client.post("/api/auth/logout/")
        self.client.credentials()

        self.assertEqual(logout_response.status_code, status.HTTP_200_OK)
        self.assertEqual(UserSession.objects.filter(user=self.user, revoked_at__isnull=True).count(), 1)

        third = self._login()
        self.assertEqual(third.status_code, status.HTTP_200_OK)

    def test_revoked_session_immediately_blocks_authenticated_access(self):
        first = self._login()
        access_token = first.data["access"]

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
        me_before = self.client.get("/api/auth/me/")
        self.assertEqual(me_before.status_code, status.HTTP_200_OK)

        session = UserSession.objects.get(user=self.user)
        session.revoke()

        me_after = self.client.get("/api/auth/me/")
        self.assertEqual(me_after.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_revoked_sessions_do_not_count_toward_the_limit(self):
        self._login()
        self._login()
        UserSession.objects.filter(user=self.user).first().revoke()

        third = self._login()
        self.assertEqual(third.status_code, status.HTTP_200_OK)
        self.assertEqual(UserSession.objects.filter(user=self.user, revoked_at__isnull=True).count(), 2)

    def test_google_login_respects_device_limit_for_existing_account(self):
        self.user.google_id = "google-sub-device-test"
        self.user.save(update_fields=["google_id"])
        self._login()
        self._login()

        with patch("apps.users.views.verify_google_id_token", return_value=mock_claims(
            sub="google-sub-device-test", email="deviceuser@example.com",
        )):
            response = self.client.post("/api/auth/google/", {"id_token": "fake"})

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["code"], "device_limit_reached")

    def test_apple_login_respects_device_limit_for_existing_account(self):
        self.user.apple_id = "apple-sub-device-test"
        self.user.save(update_fields=["apple_id"])
        self._login()
        self._login()

        with patch("apps.users.views.verify_apple_id_token", return_value=mock_apple_claims(
            sub="apple-sub-device-test", email="deviceuser@example.com",
        )):
            response = self.client.post("/api/auth/apple/", {"id_token": "fake"})

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["code"], "device_limit_reached")

    def test_already_on_two_devices_then_different_provider_still_rejected_as_third(self):
        # Covers: 2 password-login devices, then a Google login for the same
        # account (via verified-email auto-link, no prior google_id) must
        # still be treated as a third session, not bypass the cap.
        self._login()
        self._login()

        with patch("apps.users.views.verify_google_id_token", return_value=mock_claims(
            sub="google-sub-new-link", email="deviceuser@example.com",
        )):
            response = self.client.post("/api/auth/google/", {"id_token": "fake"})

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        # Must not have auto-linked the google_id if the login didn't actually succeed.
        self.user.refresh_from_db()
        self.assertIsNone(self.user.google_id)

    def test_repeated_requests_with_same_token_do_not_create_new_sessions(self):
        first = self._login()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {first.data['access']}")
        for _ in range(5):
            self.client.get("/api/auth/me/")

        self.assertEqual(UserSession.objects.filter(user=self.user).count(), 1)

    def test_authenticated_session_list_and_revoke(self):
        first = self._login()
        second = self._login()

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {first.data['access']}")
        listing = self.client.get("/api/auth/sessions/")
        self.assertEqual(listing.status_code, status.HTTP_200_OK)
        self.assertEqual(len(listing.data), 2)
        current_flags = sorted(row["is_current"] for row in listing.data)
        self.assertEqual(current_flags, [False, True])

        other_session_row = next(row for row in listing.data if not row["is_current"])
        revoke = self.client.post(f"/api/auth/sessions/{other_session_row['id']}/revoke/")
        self.assertEqual(revoke.status_code, status.HTTP_200_OK)

        # The revoked (second) device's own token must now be rejected.
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {second.data['access']}")
        blocked = self.client.get("/api/auth/me/")
        self.assertEqual(blocked.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_management_ticket_list_and_revoke_frees_a_slot(self):
        self._login()
        self._login()
        rejected = self._login()
        ticket = rejected.data["management_ticket"]

        listing = self.client.post("/api/auth/sessions/manage/list/", {"ticket": ticket})
        self.assertEqual(listing.status_code, status.HTTP_200_OK)
        self.assertEqual(len(listing.data), 2)

        revoke = self.client.post("/api/auth/sessions/manage/revoke/", {
            "ticket": ticket, "session_id": listing.data[0]["id"],
        })
        self.assertEqual(revoke.status_code, status.HTTP_200_OK)

        retry = self._login()
        self.assertEqual(retry.status_code, status.HTTP_200_OK)

    def test_management_ticket_cannot_touch_another_users_sessions(self):
        other = User.objects.create_user(username="otheruser", email="other@example.com", password=PASSWORD)
        self.client.post("/api/auth/login/", {"username": "otheruser", "password": PASSWORD})
        other_session = UserSession.objects.get(user=other)

        self._login()
        self._login()
        rejected = self._login()
        ticket = rejected.data["management_ticket"]

        revoke = self.client.post("/api/auth/sessions/manage/revoke/", {
            "ticket": ticket, "session_id": other_session.pk,
        })
        self.assertEqual(revoke.status_code, status.HTTP_404_NOT_FOUND)
        other_session.refresh_from_db()
        self.assertTrue(other_session.is_active)


class ChangePasswordViewTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="pwuser", email="pwuser@example.com", password=PASSWORD)
        login = self.client.post("/api/auth/login/", {"username": "pwuser", "password": PASSWORD})
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")

    def test_wrong_current_password_is_rejected(self):
        resp = self.client.post("/api/auth/change-password/", {
            "current_password": "WrongPass1", "new_password": "NewPass123", "confirm_new_password": "NewPass123",
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(PASSWORD))

    def test_successful_change(self):
        resp = self.client.post("/api/auth/change-password/", {
            "current_password": PASSWORD, "new_password": "NewPass123", "confirm_new_password": "NewPass123",
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("NewPass123"))
        self.assertFalse(self.user.check_password(PASSWORD))

    def test_mismatched_confirmation_is_rejected(self):
        resp = self.client.post("/api/auth/change-password/", {
            "current_password": PASSWORD, "new_password": "NewPass123", "confirm_new_password": "Different1",
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_weak_new_password_is_rejected(self):
        resp = self.client.post("/api/auth/change-password/", {
            "current_password": PASSWORD, "new_password": "alllettersnodigits", "confirm_new_password": "alllettersnodigits",
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_too_short_new_password_is_rejected(self):
        resp = self.client.post("/api/auth/change-password/", {
            "current_password": PASSWORD, "new_password": "abc1", "confirm_new_password": "abc1",
        })
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_requires_authentication(self):
        self.client.credentials()
        resp = self.client.post("/api/auth/change-password/", {
            "current_password": PASSWORD, "new_password": "NewPass123", "confirm_new_password": "NewPass123",
        })
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_oauth_only_account_can_set_a_first_password_without_current_password(self):
        oauth_user = User.objects.create(username="oauthuser", email="oauthuser@example.com", google_id="g-1")
        oauth_user.set_unusable_password()
        oauth_user.save()
        self.assertFalse(oauth_user.has_usable_password())

        # SessionAwareJWTAuthentication requires every token to carry a
        # session_id pointing at a live UserSession (see authentication.py)
        # — a bare RefreshToken.for_user() would 401 on the very next request.
        session = UserSession.objects.create(user=oauth_user)
        tokens = issue_tokens_for_user(oauth_user, session)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

        resp = self.client.post("/api/auth/change-password/", {
            "new_password": "NewPass123", "confirm_new_password": "NewPass123",
        })
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        oauth_user.refresh_from_db()
        self.assertTrue(oauth_user.check_password("NewPass123"))


class ConcurrentLoginRaceTests(TransactionTestCase):
    def test_concurrent_logins_cannot_exceed_device_limit(self):
        User.objects.create_user(username="raceuser", email="race@example.com", password=PASSWORD)
        results = []
        results_lock = threading.Lock()

        def attempt_login():
            try:
                client = APIClient()
                response = client.post("/api/auth/login/", {"username": "raceuser", "password": PASSWORD})
                with results_lock:
                    results.append(response.status_code)
            finally:
                # Each thread gets its own DB connection; Django never closes
                # it for non-request threads, which otherwise leaves the test
                # DB "in use" and breaks teardown at the end of the run.
                connection.close()

        threads = [threading.Thread(target=attempt_login) for _ in range(8)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        self.assertEqual(results.count(status.HTTP_200_OK), 2)
        user = User.objects.get(username="raceuser")
        self.assertEqual(UserSession.objects.filter(user=user, revoked_at__isnull=True).count(), 2)
