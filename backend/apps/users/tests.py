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
