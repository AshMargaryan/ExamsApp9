import io

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework.test import APIClient

from .models import Conversation, Message, MessageRole

User = get_user_model()


def _make_user(username="alice", email="alice@example.com"):
    return User.objects.create_user(username=username, email=email, password="pw123456")


class ConversationApiTests(TestCase):
    def setUp(self):
        self.user = _make_user()
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_create_list_rename_archive_pin_soft_delete_restore(self):
        create_resp = self.client.post("/api/assistant/conversations/")
        self.assertEqual(create_resp.status_code, 201)
        conv_id = create_resp.data["id"]

        rename_resp = self.client.patch(f"/api/assistant/conversations/{conv_id}/", {"title": "My chat"})
        self.assertEqual(rename_resp.status_code, 200)
        self.assertEqual(rename_resp.data["title"], "My chat")

        archive_resp = self.client.post(f"/api/assistant/conversations/{conv_id}/archive/")
        self.assertTrue(archive_resp.data["is_archived"])

        pin_resp = self.client.post(f"/api/assistant/conversations/{conv_id}/pin/")
        self.assertTrue(pin_resp.data["is_pinned"])

        list_resp = self.client.get("/api/assistant/conversations/?archived=true")
        self.assertEqual(list_resp.data["results"][0]["id"], conv_id)

        delete_resp = self.client.delete(f"/api/assistant/conversations/{conv_id}/")
        self.assertEqual(delete_resp.status_code, 204)
        self.assertIsNotNone(Conversation.all_objects.get(pk=conv_id).deleted_at)

        list_after_delete = self.client.get("/api/assistant/conversations/")
        self.assertEqual(list_after_delete.data["count"], 0)

        restore_resp = self.client.post(f"/api/assistant/conversations/{conv_id}/restore/")
        self.assertEqual(restore_resp.status_code, 200)
        self.assertIsNone(Conversation.all_objects.get(pk=conv_id).deleted_at)

    def test_search_by_title(self):
        Conversation.objects.create(owner=self.user, title="Algebra help")
        Conversation.objects.create(owner=self.user, title="Physics revision")

        resp = self.client.get("/api/assistant/conversations/?q=algebra")
        self.assertEqual(resp.data["count"], 1)
        self.assertEqual(resp.data["results"][0]["title"], "Algebra help")


@override_settings(AI_PROVIDER="mock")
class MessageApiTests(TestCase):
    def setUp(self):
        self.user = _make_user()
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.conversation = Conversation.objects.create(owner=self.user)

    def test_send_message_generates_mock_reply_and_updates_conversation(self):
        resp = self.client.post(
            f"/api/assistant/conversations/{self.conversation.id}/messages/",
            {"content": "What is a derivative?"},
            format="json",
        )
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data["user_message"]["role"], "user")
        self.assertEqual(resp.data["assistant_message"]["role"], "assistant")
        self.assertEqual(resp.data["assistant_message"]["status"], "sent")
        self.assertIn("Mock AI", resp.data["assistant_message"]["content"])

        self.conversation.refresh_from_db()
        self.assertIsNotNone(self.conversation.last_message_at)
        self.assertEqual(self.conversation.title, "What is a derivative?")

    def test_send_message_with_educational_context_is_reflected_in_reply(self):
        resp = self.client.post(
            f"/api/assistant/conversations/{self.conversation.id}/messages/",
            {
                "content": "Help me with this",
                "educational_context": {"subject": "Mathematics", "subtopic": "Ածանցյալ"},
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 201)
        self.assertIn("Ածանցյալ", resp.data["assistant_message"]["content"])

    def test_regenerate_marks_old_response_inactive(self):
        send_resp = self.client.post(
            f"/api/assistant/conversations/{self.conversation.id}/messages/",
            {"content": "Explain logarithms"},
            format="json",
        )
        assistant_id = send_resp.data["assistant_message"]["id"]

        regen_resp = self.client.post(f"/api/assistant/messages/{assistant_id}/regenerate/")
        self.assertEqual(regen_resp.status_code, 201)
        new_id = regen_resp.data["id"]
        self.assertNotEqual(new_id, assistant_id)

        old_message = Message.objects.get(pk=assistant_id)
        self.assertFalse(old_message.is_active_response)

        list_resp = self.client.get(f"/api/assistant/conversations/{self.conversation.id}/messages/")
        assistant_messages = [m for m in list_resp.data if m["role"] == "assistant"]
        self.assertEqual(len(assistant_messages), 1)
        self.assertEqual(assistant_messages[0]["id"], new_id)

    def test_edit_user_message(self):
        send_resp = self.client.post(
            f"/api/assistant/conversations/{self.conversation.id}/messages/",
            {"content": "original"},
            format="json",
        )
        user_id = send_resp.data["user_message"]["id"]

        edit_resp = self.client.patch(f"/api/assistant/messages/{user_id}/", {"content": "edited"})
        self.assertEqual(edit_resp.status_code, 200)
        self.assertEqual(edit_resp.data["content"], "edited")
        self.assertIsNotNone(edit_resp.data["edited_at"])

    def test_cannot_edit_assistant_message(self):
        send_resp = self.client.post(
            f"/api/assistant/conversations/{self.conversation.id}/messages/",
            {"content": "hi"},
            format="json",
        )
        assistant_id = send_resp.data["assistant_message"]["id"]
        edit_resp = self.client.patch(f"/api/assistant/messages/{assistant_id}/", {"content": "hacked"})
        self.assertEqual(edit_resp.status_code, 400)


class CrossUserIsolationTests(TestCase):
    def setUp(self):
        self.alice = _make_user("alice", "alice@example.com")
        self.bob = _make_user("bob", "bob@example.com")
        self.conversation = Conversation.objects.create(owner=self.alice)
        self.message = Message.objects.create(
            conversation=self.conversation, role=MessageRole.USER, content="secret"
        )
        self.client = APIClient()
        self.client.force_authenticate(self.bob)

    def test_other_user_cannot_access_conversation(self):
        resp = self.client.get(f"/api/assistant/conversations/{self.conversation.id}/")
        self.assertEqual(resp.status_code, 404)

    def test_other_user_cannot_edit_message(self):
        resp = self.client.patch(f"/api/assistant/messages/{self.message.id}/", {"content": "hacked"})
        self.assertEqual(resp.status_code, 404)


class AttachmentUploadTests(TestCase):
    def setUp(self):
        self.user = _make_user()
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.conversation = Conversation.objects.create(owner=self.user)

    def _upload(self, filename, content, content_type):
        file_obj = io.BytesIO(content)
        file_obj.name = filename
        return self.client.post(
            "/api/assistant/attachments/",
            {"conversation": self.conversation.id, "file": file_obj},
            format="multipart",
        )

    def test_rejects_disallowed_extension(self):
        resp = self._upload("virus.exe", b"MZ\x90\x00", "application/octet-stream")
        self.assertEqual(resp.status_code, 400)

    def test_rejects_spoofed_extension(self):
        # A tiny valid PNG signature won't match ".txt".
        png_bytes = b"\x89PNG\r\n\x1a\n" + b"\x00" * 20
        resp = self._upload("fake.txt", png_bytes, "text/plain")
        self.assertEqual(resp.status_code, 400)

    def test_accepts_plain_text_file(self):
        resp = self._upload("notes.txt", b"hello world", "text/plain")
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data["attachment_type"], "text")
