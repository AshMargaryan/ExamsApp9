import uuid

from django.conf import settings
from django.db import models
from django.db.models.functions import Lower
from django.utils import timezone


class SoftDeleteQuerySet(models.QuerySet):
    def alive(self):
        return self.filter(deleted_at__isnull=True)

    def trashed(self):
        return self.filter(deleted_at__isnull=False)


class SoftDeleteManager(models.Manager.from_queryset(SoftDeleteQuerySet)):
    """Default manager excludes soft-deleted rows everywhere, matching
    apps.ai_assistant.Conversation's soft-delete pattern. Use `all_objects`
    to reach trashed rows (Trash view, restore, purge)."""

    def get_queryset(self):
        return super().get_queryset().alive()


class Folder(models.Model):
    """A node in the user's folder tree. Nesting is unlimited via `parent`.

    Uses a UUID primary key (unlike the rest of this codebase, which uses
    integer PKs) because Notes is designed to be sync-ready across future
    web/iOS/Android clients — a device-independent stable ID is required
    from day one rather than retrofitted later.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="note_folders"
    )
    parent = models.ForeignKey(
        "self", on_delete=models.CASCADE, null=True, blank=True, related_name="children"
    )
    name = models.CharField(max_length=200)
    color = models.CharField(max_length=20, blank=True, default="")
    sort_order = models.IntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    objects = SoftDeleteManager()
    all_objects = models.Manager.from_queryset(SoftDeleteQuerySet)()

    class Meta:
        ordering = ["sort_order", "name"]
        indexes = [
            models.Index(fields=["user", "parent", "deleted_at"]),
        ]
        constraints = [
            models.UniqueConstraint(
                Lower("name"),
                "user",
                "parent",
                condition=models.Q(deleted_at__isnull=True),
                # Root-level folders have parent=NULL, and Postgres treats
                # NULL != NULL by default — without this, two root folders
                # both named "Physics" would NOT collide at the DB level.
                nulls_distinct=False,
                name="unique_folder_name_per_parent_ci",
            ),
        ]

    def __str__(self):
        return self.name

    @property
    def is_deleted(self):
        return self.deleted_at is not None

    def soft_delete(self):
        """Trashes this folder and cascades to every live child folder/document,
        so a trashed folder can't leave orphaned "live" content behind. Never
        hard-deletes anything — that's purge()'s job, and only from Trash."""
        self.deleted_at = timezone.now()
        self.save(update_fields=["deleted_at", "updated_at"])
        for child in Folder.all_objects.filter(parent=self, deleted_at__isnull=True):
            child.soft_delete()
        for doc in Document.all_objects.filter(folder=self, deleted_at__isnull=True):
            doc.soft_delete()

    def restore(self):
        """Restores only this folder. Children trashed independently (whether
        before or as part of this folder's cascade) stay trashed and are
        restored individually from Trash."""
        self.deleted_at = None
        self.save(update_fields=["deleted_at", "updated_at"])


def document_attachment_upload_path(instance, filename):
    unique_name = f"{uuid.uuid4().hex}_{filename}"
    return f"notes/attachments/{instance.document_id}/{unique_name}"


class Document(models.Model):
    """A note. `content` is the Tiptap editor's structured JSON document —
    a real block model (headings, lists, checklists, tables, etc.), not a
    raw HTML blob. `content_text` is a plain-text mirror derived on save,
    used for search."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="documents"
    )
    folder = models.ForeignKey(
        Folder, on_delete=models.SET_NULL, null=True, blank=True, related_name="documents"
    )

    title = models.CharField(max_length=255, blank=True, default="")
    icon = models.CharField(max_length=16, blank=True, default="")
    content = models.JSONField(default=dict, blank=True)
    content_text = models.TextField(blank=True, default="")
    tags = models.JSONField(default=list, blank=True)

    is_favorite = models.BooleanField(default=False)
    is_pinned = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    objects = SoftDeleteManager()
    all_objects = models.Manager.from_queryset(SoftDeleteQuerySet)()

    class Meta:
        ordering = ["-is_pinned", "-updated_at"]
        indexes = [
            models.Index(fields=["user", "folder", "deleted_at"]),
            models.Index(fields=["user", "deleted_at", "is_favorite"]),
            models.Index(fields=["user", "deleted_at", "is_pinned"]),
        ]

    def __str__(self):
        return self.title or "(untitled)"

    @property
    def is_deleted(self):
        return self.deleted_at is not None

    def soft_delete(self):
        self.deleted_at = timezone.now()
        self.save(update_fields=["deleted_at", "updated_at"])

    def restore(self):
        self.deleted_at = None
        self.save(update_fields=["deleted_at", "updated_at"])


class AttachmentType(models.TextChoices):
    IMAGE = "image", "Image"
    PDF = "pdf", "PDF"
    DOCUMENT = "document", "Document"
    TEXT = "text", "Text"


class DocumentAttachment(models.Model):
    """Uploaded independently of a Document's content (POST
    /api/notes/attachments/ returns this row), then referenced by id when
    inserted into the editor — same "upload first, attach after" flow as
    apps.chat.Attachment / apps.ai_assistant.Attachment. Bytes live in
    storage (MEDIA_ROOT today); only the path and metadata live in Postgres.
    Never expose `file.url` directly — see DocumentAttachmentDownloadView.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    document = models.ForeignKey(Document, on_delete=models.CASCADE, related_name="attachments")
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="note_attachments"
    )

    file = models.FileField(upload_to=document_attachment_upload_path)
    file_type = models.CharField(max_length=10, choices=AttachmentType.choices)
    original_filename = models.CharField(max_length=255)
    mime_type = models.CharField(max_length=150)
    file_size = models.PositiveIntegerField(help_text="Bytes.")

    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["uploaded_at"]
        indexes = [models.Index(fields=["document"])]

    def __str__(self):
        return self.original_filename
