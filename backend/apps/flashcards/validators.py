import magic
from django.conf import settings
from rest_framework import serializers

MAX_IMAGE_SIZE_MB = getattr(settings, "FLASHCARDS_MAX_IMAGE_SIZE_MB", 5)
MAX_AUDIO_SIZE_MB = getattr(settings, "FLASHCARDS_MAX_AUDIO_SIZE_MB", 15)

ALLOWED_IMAGE_MIMES = {
    "png": {"image/png"},
    "jpg": {"image/jpeg"},
    "jpeg": {"image/jpeg"},
    "webp": {"image/webp"},
}

ALLOWED_AUDIO_MIMES = {
    "mp3": {"audio/mpeg"},
    "wav": {"audio/x-wav", "audio/wav", "audio/vnd.wave"},
    "m4a": {"audio/mp4", "audio/x-m4a"},
    "ogg": {"audio/ogg"},
}


def _validate_file(uploaded_file, allowed_mimes, max_size_mb, size_message, ext_message, mime_message):
    if uploaded_file.size > max_size_mb * 1024 * 1024:
        raise serializers.ValidationError(size_message.format(max_size_mb))

    ext = uploaded_file.name.rsplit(".", 1)[-1].lower() if "." in uploaded_file.name else ""
    if ext not in allowed_mimes:
        raise serializers.ValidationError(ext_message.format(ext, ", ".join(sorted(allowed_mimes))))

    head = uploaded_file.read(2048)
    uploaded_file.seek(0)
    sniffed_mime = magic.from_buffer(head, mime=True)

    if sniffed_mime not in allowed_mimes[ext]:
        raise serializers.ValidationError(mime_message)


def validate_flashcard_image(uploaded_file):
    _validate_file(
        uploaded_file, ALLOWED_IMAGE_MIMES, MAX_IMAGE_SIZE_MB,
        "Նկարի չափը չպետք է գերազանցի {}ՄԲ-ը։",
        "Չթույլատրված ձևաչափ '.{}'։ Թույլատրված են՝ {}։",
        "Ֆայլի բովանդակությունը չի համապատասխանում ընդլայնմանը։",
    )


def validate_flashcard_audio(uploaded_file):
    _validate_file(
        uploaded_file, ALLOWED_AUDIO_MIMES, MAX_AUDIO_SIZE_MB,
        "Աուդիոյի չափը չպետք է գերազանցի {}ՄԲ-ը։",
        "Չթույլատրված ձևաչափ '.{}'։ Թույլատրված են՝ {}։",
        "Ֆայլի բովանդակությունը չի համապատասխանում ընդլայնմանը։",
    )
