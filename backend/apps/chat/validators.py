import logging
import subprocess
import tempfile
from pathlib import Path

import magic
from django.conf import settings
from django.core.files.base import ContentFile
from rest_framework import serializers

from .models import AttachmentType

logger = logging.getLogger(__name__)

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
    # Browser-recorded voice messages: MediaRecorder outputs audio/webm on
    # Chrome/Firefox and audio/mp4 (aac) on Safari — no other source
    # produces these extensions in the chat upload flow.
    "webm": (AttachmentType.AUDIO, {"audio/webm", "video/webm"}),
    "m4a": (AttachmentType.AUDIO, {"audio/mp4", "audio/x-m4a"}),
    "ogg": (AttachmentType.AUDIO, {"audio/ogg", "application/ogg"}),
}


def _finalize_webm_container(uploaded_file):
    """
    Firefox's MediaRecorder writes an "unknown size" Matroska Segment (the
    length field is left as the all-1s live-stream marker — it never goes
    back to patch in the real byte count once recording stops). Chrome's own
    MediaRecorder always finalizes that field before handing back the Blob.
    Chrome's own <audio> element can't reliably play a WebM blob it didn't
    finalize itself: Chrome-recorded voice messages always played, but a
    Firefox-recorded one downloaded fine (raw bytes, no decoding needed) and
    silently produced no sound when played in Chrome. Confirmed by comparing
    the raw bytes of a Chrome-tagged file (Segment size `01 00 00 00 00 00
    5f 4e`, TAG:encoder=Chrome) against a Firefox-tagged one (Segment size
    `ff ff ff ff ff ff ff`, TAG:encoder=QTmuxingAppLibWebM-0.0.1).

    `ffmpeg -c copy` is a lossless container-only remux — it does not touch
    the Opus audio bytes, just rewrites the Segment header with a known
    size, matching the structure Chrome's own recorder already produces.
    Runs unconditionally on every .webm upload (not just Firefox's) so
    playback never again depends on which browser recorded the file. Falls
    back to the original bytes (still playable in Firefox, still
    downloadable everywhere) if ffmpeg is unavailable or errors, rather than
    failing the whole upload over a codec-level nicety.
    """
    uploaded_file.seek(0)
    try:
        with tempfile.TemporaryDirectory() as tmp_dir:
            src = Path(tmp_dir) / "in.webm"
            dst = Path(tmp_dir) / "out.webm"
            src.write_bytes(uploaded_file.read())
            result = subprocess.run(
                ["ffmpeg", "-y", "-v", "error", "-i", str(src), "-c", "copy", "-f", "webm", str(dst)],
                capture_output=True, timeout=30,
            )
            if result.returncode != 0 or not dst.exists():
                logger.warning(
                    "Voice message remux failed, keeping original container: %s",
                    result.stderr.decode(errors="replace"),
                )
                uploaded_file.seek(0)
                return uploaded_file
            return ContentFile(dst.read_bytes(), name=uploaded_file.name)
    except (OSError, subprocess.SubprocessError) as exc:
        logger.warning("Voice message remux unavailable, keeping original container: %s", exc)
        uploaded_file.seek(0)
        return uploaded_file


def validate_attachment_file(uploaded_file):
    """Validates extension, size, and real (byte-sniffed) mime type.
    Returns (attachment_type, mime_type, file). `file` is the same object
    passed in, except for .webm audio, where it may be a remuxed
    replacement (see _finalize_webm_container) — always use the returned
    file, not the original, from here on. Raises ValidationError on
    failure."""

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

    # libmagic can't tell an audio-only WebM container from a video one by
    # bytes alone, so a voice message recorded in some browsers sniffs as
    # "video/webm" instead of "audio/webm" (that's why video/webm is in the
    # allowlist above). That raw sniff becomes the Content-Type this file is
    # later served with (see ChatAttachmentDownloadView) — Chrome's <audio>
    # element silently refuses to play a "video/webm" source even though the
    # bytes are pure Opus audio, while Firefox doesn't care. Normalize so
    # playback isn't browser-dependent.
    if attachment_type == AttachmentType.AUDIO and sniffed_mime == "video/webm":
        sniffed_mime = "audio/webm"

    if attachment_type == AttachmentType.AUDIO and ext == "webm":
        uploaded_file = _finalize_webm_container(uploaded_file)

    return attachment_type, sniffed_mime, uploaded_file
