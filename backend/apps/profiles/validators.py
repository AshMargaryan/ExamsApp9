import magic
from rest_framework import serializers

MAX_AVATAR_SIZE_MB = 5

ALLOWED_AVATAR_MIMES = {
    "png": {"image/png"},
    "jpg": {"image/jpeg"},
    "jpeg": {"image/jpeg"},
    "webp": {"image/webp"},
}


def validate_avatar_file(uploaded_file):
    """Validates extension, size, and real (byte-sniffed) mime type for avatar uploads."""

    if uploaded_file.size > MAX_AVATAR_SIZE_MB * 1024 * 1024:
        raise serializers.ValidationError(f"Նկարի չափը չպետք է գերազանցի {MAX_AVATAR_SIZE_MB}ՄԲ-ը։")

    ext = uploaded_file.name.rsplit(".", 1)[-1].lower() if "." in uploaded_file.name else ""
    if ext not in ALLOWED_AVATAR_MIMES:
        raise serializers.ValidationError(
            f"Չթույլատրված ձևաչափ '.{ext}'։ Թույլատրված են՝ {', '.join(sorted(ALLOWED_AVATAR_MIMES))}։"
        )

    head = uploaded_file.read(2048)
    uploaded_file.seek(0)
    sniffed_mime = magic.from_buffer(head, mime=True)

    if sniffed_mime not in ALLOWED_AVATAR_MIMES[ext]:
        raise serializers.ValidationError("Ֆայլի բովանդակությունը չի համապատասխանում ընդլայնմանը։")
