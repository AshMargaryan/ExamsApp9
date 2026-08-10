from rest_framework import serializers

from .models import Flashcard, FlashcardDeck
from .validators import validate_flashcard_audio, validate_flashcard_image


# ---------------------------------------------------------------------------
# Decks — read
# ---------------------------------------------------------------------------

class FlashcardDeckSerializer(serializers.ModelSerializer):
    """Base deck fields; per-user progress counts (known_count, learning_count,
    new_count, due_count) are attached by the view as plain dict keys after
    this serializer runs — see views.ListFlashcardDecksView."""
    is_owned = serializers.SerializerMethodField()

    class Meta:
        model = FlashcardDeck
        fields = [
            "id", "deck_id", "title", "description", "subject", "card_count",
            "is_owned", "created_at", "updated_at",
        ]

    def get_is_owned(self, obj):
        return obj.owner_id is not None


# ---------------------------------------------------------------------------
# Decks — write (create/rename an owned deck; owner is injected by the view,
# never trusted from the client)
# ---------------------------------------------------------------------------

class FlashcardDeckWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = FlashcardDeck
        fields = ["title", "description", "subject"]

    def validate_title(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Վերնագիրը պարտադիր է։")
        return value


# ---------------------------------------------------------------------------
# Cards — read
# ---------------------------------------------------------------------------

class FlashcardSerializer(serializers.ModelSerializer):
    front_image_url = serializers.SerializerMethodField()
    back_image_url = serializers.SerializerMethodField()
    audio_url = serializers.SerializerMethodField()

    class Meta:
        model = Flashcard
        fields = [
            "id", "number", "topic", "front_text", "back_text", "hint", "translation",
            "explanation", "notes", "tags", "difficulty",
            "front_image_url", "back_image_url", "audio_url",
            "created_at", "updated_at",
        ]

    def _absolute_url(self, file_field):
        if not file_field:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(file_field.url) if request else file_field.url

    def get_front_image_url(self, obj):
        return self._absolute_url(obj.front_image)

    def get_back_image_url(self, obj):
        return self._absolute_url(obj.back_image)

    def get_audio_url(self, obj):
        return self._absolute_url(obj.audio)


# ---------------------------------------------------------------------------
# Cards — write (create/edit an owned card; multipart so images/audio can
# ride along with the text fields)
# ---------------------------------------------------------------------------

class FlashcardWriteSerializer(serializers.ModelSerializer):
    front_image = serializers.ImageField(required=False, allow_null=True)
    back_image = serializers.ImageField(required=False, allow_null=True)
    audio = serializers.FileField(required=False, allow_null=True)
    # JSONField (not ListField) so a multipart request — which can only ever
    # carry a plain string per field — passes through to validate_tags()
    # unparsed instead of being rejected by ListField before we can json.loads() it.
    tags = serializers.JSONField(required=False)

    class Meta:
        model = Flashcard
        fields = [
            "topic", "front_text", "back_text", "hint", "translation", "explanation", "notes",
            "tags", "difficulty", "front_image", "back_image", "audio",
        ]

    def validate_front_text(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Հարցը պարտադիր է։")
        return value

    def validate_back_text(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Պատասխանը պարտադիր է։")
        return value

    def validate_front_image(self, value):
        if value:
            validate_flashcard_image(value)
        return value

    def validate_back_image(self, value):
        if value:
            validate_flashcard_image(value)
        return value

    def validate_audio(self, value):
        if value:
            validate_flashcard_audio(value)
        return value

    def validate_tags(self, value):
        # multipart/form-data can't carry a real JSON array — the frontend
        # sends it as a single field holding a JSON-encoded string (works
        # identically whether the request is multipart or plain JSON, so
        # this is the one path both card-create and card-edit go through).
        if isinstance(value, str):
            import json
            try:
                value = json.loads(value)
            except ValueError:
                raise serializers.ValidationError("Անվավեր tags ձևաչափ։")
        if not isinstance(value, list) or not all(isinstance(t, str) for t in value):
            raise serializers.ValidationError("tags-ը պետք է լինի տողերի ցուցակ։")
        cleaned = [t.strip() for t in value if t.strip()]
        if any(len(t) > 40 for t in cleaned):
            raise serializers.ValidationError("Յուրաքանչյուր tag-ը պետք է լինի առավելագույնը 40 նիշ։")
        return cleaned


class CardMoveSerializer(serializers.Serializer):
    deck_id = serializers.IntegerField()


class CardFlagSerializer(serializers.Serializer):
    favorite = serializers.BooleanField(required=False)
    difficult = serializers.BooleanField(required=False)


class MarkCardSerializer(serializers.Serializer):
    grade = serializers.ChoiceField(choices=["again", "hard", "good", "easy"])
