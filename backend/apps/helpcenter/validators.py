import magic
from django.conf import settings
from rest_framework import serializers

# extension -> allowed real mime types sniffed from bytes.
# Same allowlist apps.notes / apps.chat / apps.ai_assistant use — one
# well-tested set of extension/mime pairs instead of a fourth slightly
# different one. Support tickets have no attachment_type column, so unlike
# those apps this returns the mime only.
#
# Note what is absent: html, htm and svg. Uploads are served from the same
# origin as the app (nginx serves MEDIA_ROOT at /media/), so a file the
# browser will render as a document could run script with the app's origin
# and read the JWTs the frontend keeps in localStorage.
ALLOWED_ATTACHMENTS = {
    "png": {"image/png"},
    "jpg": {"image/jpeg"},
    "jpeg": {"image/jpeg"},
    "webp": {"image/webp"},
    "gif": {"image/gif"},
    "pdf": {"application/pdf"},
    "docx": {
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/zip",
    },
    "xlsx": {
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/zip",
    },
    "txt": {"text/plain"},
    "md": {"text/plain", "text/markdown"},
    "csv": {"text/plain", "text/csv"},
}


def validate_attachment_file(uploaded_file) -> str:
    """Validates extension, size, and real (byte-sniffed) mime type, and
    returns the sniffed mime. Raises ValidationError on failure.

    The returned value is what should be persisted as TicketAttachment
    .mime_type — NOT uploaded_file.content_type, which is supplied by the
    client and therefore says whatever an attacker wants it to say.
    """

    max_size_mb = getattr(settings, "HELPCENTER_MAX_ATTACHMENT_SIZE_MB", 20)
    if uploaded_file.size > max_size_mb * 1024 * 1024:
        raise serializers.ValidationError(f"Ֆայլը գերազանցում է {max_size_mb}ՄԲ սահմանաչափը։")

    ext = uploaded_file.name.rsplit(".", 1)[-1].lower() if "." in uploaded_file.name else ""
    if ext not in ALLOWED_ATTACHMENTS:
        raise serializers.ValidationError(
            f"Չաջակցվող ֆայլի տեսակ '.{ext}'։ Թույլատրված են՝ {', '.join(sorted(ALLOWED_ATTACHMENTS))}։"
        )

    head = uploaded_file.read(2048)
    uploaded_file.seek(0)
    sniffed_mime = magic.from_buffer(head, mime=True)

    if sniffed_mime not in ALLOWED_ATTACHMENTS[ext]:
        raise serializers.ValidationError(
            f"Ֆայլի բովանդակությունը չի համապատասխանում '.{ext}' ընդլայնմանը (հայտնաբերվել է {sniffed_mime})։"
        )

    return sniffed_mime
