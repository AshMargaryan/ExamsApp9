import magic
from django.conf import settings
from rest_framework import serializers

from .models import AttachmentType

# extension -> (attachment_type, allowed real mime types sniffed from bytes)
ALLOWED_ATTACHMENTS = {
    "png": (AttachmentType.IMAGE, {"image/png"}),
    "jpg": (AttachmentType.IMAGE, {"image/jpeg"}),
    "jpeg": (AttachmentType.IMAGE, {"image/jpeg"}),
    "webp": (AttachmentType.IMAGE, {"image/webp"}),
    "pdf": (AttachmentType.PDF, {"application/pdf"}),
    "docx": (
        AttachmentType.DOCUMENT,
        {"application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/zip"},
    ),
    "txt": (AttachmentType.TEXT, {"text/plain"}),
    "md": (AttachmentType.TEXT, {"text/plain", "text/markdown"}),
    "csv": (AttachmentType.TEXT, {"text/plain", "text/csv"}),
}


def validate_attachment_file(uploaded_file) -> str:
    """Validates extension, size, and real (byte-sniffed) mime type.
    Returns the resolved attachment_type. Raises ValidationError on failure."""

    max_size_mb = getattr(settings, "AI_ASSISTANT_MAX_ATTACHMENT_SIZE_MB", 15)
    if uploaded_file.size > max_size_mb * 1024 * 1024:
        raise serializers.ValidationError(f"File exceeds the {max_size_mb}MB limit.")

    ext = uploaded_file.name.rsplit(".", 1)[-1].lower() if "." in uploaded_file.name else ""
    if ext not in ALLOWED_ATTACHMENTS:
        raise serializers.ValidationError(
            f"Unsupported file type '.{ext}'. Allowed: {', '.join(sorted(ALLOWED_ATTACHMENTS))}."
        )

    attachment_type, allowed_mimes = ALLOWED_ATTACHMENTS[ext]

    head = uploaded_file.read(2048)
    uploaded_file.seek(0)
    sniffed_mime = magic.from_buffer(head, mime=True)

    if sniffed_mime not in allowed_mimes:
        raise serializers.ValidationError(
            f"File content does not match its '.{ext}' extension (detected {sniffed_mime})."
        )

    return attachment_type, sniffed_mime
