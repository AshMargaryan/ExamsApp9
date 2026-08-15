from django.urls import reverse
from rest_framework import serializers

from .content import extract_plain_text
from .models import Document, DocumentAttachment, Folder
from .validators import validate_attachment_file


class FolderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Folder
        fields = ["id", "parent", "name", "color", "sort_order", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_parent(self, parent):
        if parent is None:
            return parent
        request = self.context["request"]
        if parent.user_id != request.user.id:
            raise serializers.ValidationError("Թղթապանակը գոյություն չունի։")
        instance = self.instance
        if instance is not None:
            node = parent
            while node is not None:
                if node.id == instance.id:
                    raise serializers.ValidationError("Թղթապանակը չի կարող տեղափոխվել իր իսկ մեջ։")
                node = node.parent
        return parent

    def validate(self, attrs):
        # Mirrors the DB-level case-insensitive unique constraint (see
        # Folder.Meta.constraints) so a collision surfaces as a clean 400
        # instead of an unhandled IntegrityError; the DB constraint stays as
        # the race-condition backstop.
        name = attrs.get("name", self.instance.name if self.instance else None)
        parent = attrs["parent"] if "parent" in attrs else (self.instance.parent if self.instance else None)
        if name:
            request = self.context["request"]
            siblings = Folder.objects.filter(user=request.user, parent=parent, name__iexact=name)
            if self.instance is not None:
                siblings = siblings.exclude(pk=self.instance.pk)
            if siblings.exists():
                raise serializers.ValidationError({"name": "Այս անունով թղթապանակ արդեն կա այս տեղում։"})
        return attrs


class DocumentAttachmentSerializer(serializers.ModelSerializer):
    download_url = serializers.SerializerMethodField()

    class Meta:
        model = DocumentAttachment
        fields = [
            "id", "document", "file_type", "original_filename", "mime_type",
            "file_size", "uploaded_at", "download_url",
        ]
        read_only_fields = fields

    def get_download_url(self, obj):
        url = reverse("note-attachment-download", args=[obj.id])
        request = self.context.get("request")
        return request.build_absolute_uri(url) if request else url


class AttachmentUploadSerializer(serializers.Serializer):
    document = serializers.PrimaryKeyRelatedField(queryset=Document.objects.all())
    file = serializers.FileField()

    def validate(self, attrs):
        attachment_type, mime_type = validate_attachment_file(attrs["file"])
        attrs["file_type"] = attachment_type
        attrs["mime_type"] = mime_type
        return attrs


class DocumentListSerializer(serializers.ModelSerializer):
    """Lighter payload for list views — omits the full editor `content` JSON."""

    snippet = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            "id", "folder", "title", "icon", "tags", "is_favorite", "is_pinned",
            "created_at", "updated_at", "deleted_at", "snippet",
        ]
        read_only_fields = fields

    def get_snippet(self, obj):
        return obj.content_text[:160]


class DocumentSerializer(serializers.ModelSerializer):
    attachments = DocumentAttachmentSerializer(many=True, read_only=True)

    class Meta:
        model = Document
        fields = [
            "id", "folder", "title", "icon", "content", "tags", "is_favorite",
            "is_pinned", "created_at", "updated_at", "deleted_at", "attachments",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "deleted_at", "attachments"]

    def validate_folder(self, folder):
        if folder is None:
            return folder
        request = self.context["request"]
        if folder.user_id != request.user.id:
            raise serializers.ValidationError("Թղթապանակը գոյություն չունի։")
        return folder

    def create(self, validated_data):
        validated_data["content_text"] = extract_plain_text(validated_data.get("content", {}))
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if "content" in validated_data:
            validated_data["content_text"] = extract_plain_text(validated_data["content"])
        return super().update(instance, validated_data)
