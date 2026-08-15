import io

from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.test import TestCase
from rest_framework.test import APIClient

from .models import Document, DocumentAttachment, Folder

User = get_user_model()

PNG_BYTES = b"\x89PNG\r\n\x1a\n" + b"\x00" * 20


def _make_user(username="alice", email="alice@example.com"):
    return User.objects.create_user(username=username, email=email, password="pw123456")


def _upload(client, document_id, filename, content, content_type="image/png"):
    file_obj = io.BytesIO(content)
    file_obj.name = filename
    return client.post(
        "/api/notes/attachments/",
        {"document": document_id, "file": file_obj},
        format="multipart",
    )


def _doc_content(text):
    return {
        "type": "doc",
        "content": [{"type": "paragraph", "content": [{"type": "text", "text": text}]}],
    }


class FolderApiTests(TestCase):
    def setUp(self):
        self.user = _make_user()
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_create_nest_rename_list(self):
        root = self.client.post("/api/notes/folders/", {"name": "Mathematics"}).data
        child = self.client.post(
            "/api/notes/folders/", {"name": "Algebra", "parent": root["id"]}
        ).data
        self.assertEqual(str(child["parent"]), root["id"])

        rename = self.client.patch(f"/api/notes/folders/{child['id']}/", {"name": "Algebra II"})
        self.assertEqual(rename.status_code, 200)
        self.assertEqual(rename.data["name"], "Algebra II")

        listing = self.client.get("/api/notes/folders/")
        self.assertEqual({f["name"] for f in listing.data}, {"Mathematics", "Algebra II"})

    def test_duplicate_name_under_same_parent_rejected_case_insensitively(self):
        self.client.post("/api/notes/folders/", {"name": "Physics"})
        resp = self.client.post("/api/notes/folders/", {"name": "physics"})
        self.assertEqual(resp.status_code, 400)

    def test_same_name_allowed_under_different_parents(self):
        a = self.client.post("/api/notes/folders/", {"name": "A"}).data
        b = self.client.post("/api/notes/folders/", {"name": "B"}).data
        r1 = self.client.post("/api/notes/folders/", {"name": "Exam Prep", "parent": a["id"]})
        r2 = self.client.post("/api/notes/folders/", {"name": "Exam Prep", "parent": b["id"]})
        self.assertEqual(r1.status_code, 201)
        self.assertEqual(r2.status_code, 201)

    def test_folder_cannot_become_its_own_descendant(self):
        root = self.client.post("/api/notes/folders/", {"name": "Root"}).data
        child = self.client.post("/api/notes/folders/", {"name": "Child", "parent": root["id"]}).data
        resp = self.client.patch(f"/api/notes/folders/{root['id']}/", {"parent": child["id"]})
        self.assertEqual(resp.status_code, 400)

    def test_soft_delete_cascades_and_restore_is_shallow(self):
        parent = Folder.objects.create(user=self.user, name="Parent")
        child = Folder.objects.create(user=self.user, name="Child", parent=parent)
        doc = Document.objects.create(user=self.user, folder=child, title="Note")

        resp = self.client.delete(f"/api/notes/folders/{parent.id}/")
        self.assertEqual(resp.status_code, 204)

        parent.refresh_from_db()
        child.refresh_from_db()
        doc.refresh_from_db()
        self.assertTrue(parent.is_deleted)
        self.assertTrue(child.is_deleted)
        self.assertTrue(doc.is_deleted)

        restore = self.client.post(f"/api/notes/folders/{parent.id}/restore/")
        self.assertEqual(restore.status_code, 200)
        child.refresh_from_db()
        doc.refresh_from_db()
        self.assertTrue(child.is_deleted, "cascaded children stay trashed until restored individually")
        self.assertTrue(doc.is_deleted)

    def test_purge_only_allowed_from_trash_and_detaches_documents(self):
        folder = Folder.objects.create(user=self.user, name="ToPurge")
        doc = Document.objects.create(user=self.user, folder=folder, title="Kept note")

        not_trashed_purge = self.client.delete(f"/api/notes/folders/{folder.id}/purge/")
        self.assertEqual(not_trashed_purge.status_code, 404)

        self.client.delete(f"/api/notes/folders/{folder.id}/")
        purge = self.client.delete(f"/api/notes/folders/{folder.id}/purge/")
        self.assertEqual(purge.status_code, 204)
        self.assertFalse(Folder.all_objects.filter(pk=folder.id).exists())

        doc.refresh_from_db()
        self.assertIsNone(doc.folder_id)
        self.assertTrue(doc.is_deleted)


class DocumentApiTests(TestCase):
    def setUp(self):
        self.user = _make_user()
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_create_and_search_by_derived_content_text(self):
        create = self.client.post(
            "/api/notes/documents/",
            {"title": "Newton's Laws", "content": _doc_content("force equals mass times acceleration")},
            format="json",
        )
        self.assertEqual(create.status_code, 201)
        doc_id = create.data["id"]

        found = self.client.get("/api/notes/documents/?q=mass")
        self.assertEqual([d["id"] for d in found.data], [doc_id])

        not_found = self.client.get("/api/notes/documents/?q=photosynthesis")
        self.assertEqual(not_found.data, [])

    def test_favorite_pin_tag_toggle(self):
        doc = Document.objects.create(user=self.user, title="Note")
        resp = self.client.patch(
            f"/api/notes/documents/{doc.id}/",
            {"is_favorite": True, "is_pinned": True, "tags": ["exam", "weak-topic"]},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.data["is_favorite"])
        self.assertTrue(resp.data["is_pinned"])
        self.assertEqual(resp.data["tags"], ["exam", "weak-topic"])

        favorites = self.client.get("/api/notes/documents/?favorite=true")
        self.assertEqual([d["id"] for d in favorites.data], [str(doc.id)])

    def test_soft_delete_restore_purge(self):
        doc = Document.objects.create(user=self.user, title="Temp")
        self.assertEqual(self.client.delete(f"/api/notes/documents/{doc.id}/").status_code, 204)
        self.assertTrue(Document.all_objects.get(pk=doc.id).is_deleted)
        self.assertEqual(self.client.get("/api/notes/documents/").data, [])

        restore = self.client.post(f"/api/notes/documents/{doc.id}/restore/")
        self.assertEqual(restore.status_code, 200)
        self.assertFalse(Document.all_objects.get(pk=doc.id).is_deleted)

        self.client.delete(f"/api/notes/documents/{doc.id}/")
        purge = self.client.delete(f"/api/notes/documents/{doc.id}/purge/")
        self.assertEqual(purge.status_code, 204)
        self.assertFalse(Document.all_objects.filter(pk=doc.id).exists())

    def test_duplicate_and_move(self):
        folder_a = Folder.objects.create(user=self.user, name="A")
        folder_b = Folder.objects.create(user=self.user, name="B")
        doc = Document.objects.create(user=self.user, folder=folder_a, title="Original", tags=["x"])

        dup = self.client.post(f"/api/notes/documents/{doc.id}/duplicate/")
        self.assertEqual(dup.status_code, 201)
        self.assertNotEqual(dup.data["id"], str(doc.id))
        self.assertEqual(dup.data["tags"], ["x"])

        move = self.client.post(f"/api/notes/documents/{doc.id}/move/", {"folder": str(folder_b.id)})
        self.assertEqual(move.status_code, 200)
        self.assertEqual(str(move.data["folder"]), str(folder_b.id))

        unfile = self.client.post(f"/api/notes/documents/{doc.id}/move/", {"folder": None}, format="json")
        self.assertEqual(unfile.status_code, 200)
        self.assertIsNone(unfile.data["folder"])


class AttachmentApiTests(TestCase):
    def setUp(self):
        self.user = _make_user()
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.doc = Document.objects.create(user=self.user, title="With attachments")

    def test_upload_and_download_roundtrip(self):
        # A bare PNG signature isn't enough real structure for libmagic to
        # confidently ID as image/png (it falls back to octet-stream) — a
        # plain text file exercises the same accept path reliably, matching
        # apps.ai_assistant's own attachment test convention.
        upload = _upload(self.client, str(self.doc.id), "formulas.txt", b"F = m * a", content_type="text/plain")
        self.assertEqual(upload.status_code, 201, upload.data)
        self.assertEqual(upload.data["file_type"], "text")

        download = self.client.get(f"/api/notes/attachments/{upload.data['id']}/download/")
        self.assertEqual(download.status_code, 200)

    def test_rejects_disallowed_extension(self):
        resp = _upload(self.client, str(self.doc.id), "virus.exe", b"MZ\x90\x00")
        self.assertEqual(resp.status_code, 400)

    def test_rejects_spoofed_extension(self):
        resp = _upload(self.client, str(self.doc.id), "fake.txt", PNG_BYTES)
        self.assertEqual(resp.status_code, 400)


class OwnershipSecurityTests(TestCase):
    """Verify user A can never read/write/delete/download user B's data by
    guessing an id — the spec's core security requirement for this app."""

    def setUp(self):
        self.alice = _make_user("alice", "alice@example.com")
        self.bob = _make_user("bob", "bob@example.com")
        self.client = APIClient()
        self.client.force_authenticate(self.bob)

        self.alice_folder = Folder.objects.create(user=self.alice, name="Alice's folder")
        self.alice_doc = Document.objects.create(
            user=self.alice, title="Alice's note", folder=self.alice_folder
        )
        self.alice_attachment = DocumentAttachment.objects.create(
            document=self.alice_doc,
            uploaded_by=self.alice,
            file=ContentFile(PNG_BYTES, name="secret.png"),
            file_type="image",
            original_filename="secret.png",
            mime_type="image/png",
            file_size=len(PNG_BYTES),
        )

    def test_bob_cannot_read_or_write_alices_folder(self):
        self.assertEqual(self.client.get(f"/api/notes/folders/{self.alice_folder.id}/").status_code, 404)
        self.assertEqual(
            self.client.patch(f"/api/notes/folders/{self.alice_folder.id}/", {"name": "Hijacked"}).status_code,
            404,
        )
        self.assertEqual(self.client.delete(f"/api/notes/folders/{self.alice_folder.id}/").status_code, 404)

    def test_bob_cannot_read_or_write_alices_document(self):
        self.assertEqual(self.client.get(f"/api/notes/documents/{self.alice_doc.id}/").status_code, 404)
        self.assertEqual(
            self.client.patch(
                f"/api/notes/documents/{self.alice_doc.id}/", {"title": "Hijacked"}
            ).status_code,
            404,
        )
        self.assertEqual(self.client.delete(f"/api/notes/documents/{self.alice_doc.id}/").status_code, 404)
        self.assertEqual(
            self.client.post(f"/api/notes/documents/{self.alice_doc.id}/duplicate/").status_code, 404
        )

    def test_bob_cannot_move_his_note_into_or_alices_note_out_of_alices_folder(self):
        bob_doc = Document.objects.create(user=self.bob, title="Bob's note")
        into_alice = self.client.post(
            f"/api/notes/documents/{bob_doc.id}/move/", {"folder": str(self.alice_folder.id)}
        )
        self.assertEqual(into_alice.status_code, 404)

        alice_doc_move = self.client.post(
            f"/api/notes/documents/{self.alice_doc.id}/move/", {"folder": None}, format="json"
        )
        self.assertEqual(alice_doc_move.status_code, 404)

    def test_bob_cannot_attach_a_file_to_alices_document(self):
        resp = _upload(self.client, str(self.alice_doc.id), "x.txt", b"hello", content_type="text/plain")
        self.assertEqual(resp.status_code, 404)

    def test_bob_cannot_download_alices_attachment(self):
        resp = self.client.get(f"/api/notes/attachments/{self.alice_attachment.id}/download/")
        self.assertEqual(resp.status_code, 404)

    def test_bobs_document_list_never_contains_alices_notes(self):
        Document.objects.create(user=self.bob, title="Bob's own note")
        listing = self.client.get("/api/notes/documents/")
        titles = {d["title"] for d in listing.data}
        self.assertNotIn("Alice's note", titles)
