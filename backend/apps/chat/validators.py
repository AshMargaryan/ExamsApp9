import magic
from django.conf import settings
from rest_framework import serializers

from .models import AttachmentType

# extension -> (attachment_type, allowed real mime types sniffed from bytes)
# Same allowlist apps.ai_assistant uses — one well-tested set of
# extension/mime pairs instead of a second slightly-different one.
ALLOWED_ATTACHMENTS = {
    "png": (AttachmentType.IMAGE, {"image/png"}),
    "jpg": (AttachmentType.IMAGE, {"image/jpeg"}),
    "jpeg": (AttachmentType.IMAGE, {"image/jpeg"}),
    "webp": (AttachmentType.IMAGE, {"image/webp"}),
    "gif": (AttachmentType.IMAGE, {"image/gif"}),
    "pdf": (AttachmentType.PDF, {"application/pdf"}),
    "docx": (
        AttachmentType.DOCUMENT,
        {"application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/zip"},
    ),
    "xlsx": (
        AttachmentType.DOCUMENT,
        {"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/zip"},
    ),
    "txt": (AttachmentType.TEXT, {"text/plain"}),
    "md": (AttachmentType.TEXT, {"text/plain", "text/markdown"}),
    "csv": (AttachmentType.TEXT, {"text/plain", "text/csv"}),
    # Voice messages (spec #27) — MediaRecorder output. libmagic sometimes
    # sniffs a container as its video mimetype even with only an audio
    # track, hence the video/* entries alongside the audio/* ones.
    "webm": (AttachmentType.AUDIO, {"audio/webm", "video/webm"}),
    "ogg": (AttachmentType.AUDIO, {"audio/ogg", "application/ogg", "video/ogg"}),
    "mp4": (AttachmentType.AUDIO, {"audio/mp4", "video/mp4"}),
}


def validate_attachment_file(uploaded_file) -> tuple[str, str]:
    """Validates extension, size, and real (byte-sniffed) mime type.
    Returns (attachment_type, mime_type). Raises ValidationError on failure."""

    max_size_mb = getattr(settings, "CHAT_MAX_ATTACHMENT_SIZE_MB", 20)
    if uploaded_file.size > max_size_mb * 1024 * 1024:
        raise serializers.ValidationError(f"Ֆայլը գերազանցում է {max_size_mb}ՄԲ սահմանաչափը։")

    ext = uploaded_file.name.rsplit(".", 1)[-1].lower() if "." in uploaded_file.name else ""
    if ext not in ALLOWED_ATTACHMENTS:
        raise serializers.ValidationError(
            f"Չաջակցվող ֆայլի տեսակ '.{ext}'։ Թույլատրված են՝ {', '.join(sorted(ALLOWED_ATTACHMENTS))}։"
        )

    attachment_type, allowed_mimes = ALLOWED_ATTACHMENTS[ext]

    head = uploaded_file.read(2048)
    uploaded_file.seek(0)
    sniffed_mime = magic.from_buffer(head, mime=True)

    if sniffed_mime not in allowed_mimes:
        raise serializers.ValidationError(
            f"Ֆայլի բովանդակությունը չի համապատասխանում '.{ext}' ընդլայնմանը (հայտնաբերվել է {sniffed_mime})։"
        )

    return attachment_type, sniffed_mime
