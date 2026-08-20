from django.conf import settings
from rest_framework import serializers
from rest_framework.reverse import reverse

from .models import (
    Article, Category, FeedbackReason, SupportTicket, TicketAttachment, TicketCategory, TicketMessage,
)


class CategorySerializer(serializers.ModelSerializer):
    # Annotated on the queryset as `_article_count` by the view — falls back
    # to a per-row query only if a caller ever serializes one outside that
    # queryset (e.g. in a shell/test).
    article_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ["id", "key", "name", "icon", "description", "order", "article_count"]

    def get_article_count(self, obj) -> int:
        count = getattr(obj, "_article_count", None)
        return count if count is not None else obj.articles.filter(is_published=True).count()


class ArticleListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Article
        fields = [
            "id", "slug", "title", "summary", "section", "tags",
            "view_count", "helpful_count", "unhelpful_count",
        ]


class ArticleDetailSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)

    class Meta:
        model = Article
        fields = [
            "id", "slug", "title", "summary", "content", "section", "tags", "category",
            "view_count", "helpful_count", "unhelpful_count", "updated_at",
        ]


class ArticleFeedbackInputSerializer(serializers.Serializer):
    is_helpful = serializers.BooleanField()
    reason = serializers.ChoiceField(choices=FeedbackReason.choices, required=False, allow_blank=True, default="")
    comment = serializers.CharField(required=False, allow_blank=True, default="")


class TicketAttachmentSerializer(serializers.ModelSerializer):
    # Same rationale as chat's AttachmentSerializer.download_url: points at
    # the authenticated download view so access control (ticket owner only)
    # is enforced on every read, not just at upload time.
    download_url = serializers.SerializerMethodField()

    class Meta:
        model = TicketAttachment
        fields = ["id", "original_filename", "mime_type", "size", "download_url", "created_at"]

    def get_download_url(self, obj) -> str:
        request = self.context.get("request")
        path = reverse("help_ticket_attachment_download", kwargs={"pk": obj.pk})
        return request.build_absolute_uri(path) if request else f"{settings.BACKEND_URL}{path}"


class TicketMessageSerializer(serializers.ModelSerializer):
    attachments = TicketAttachmentSerializer(many=True, read_only=True)
    is_staff = serializers.SerializerMethodField()

    class Meta:
        model = TicketMessage
        fields = ["id", "text", "is_staff", "attachments", "created_at"]

    def get_is_staff(self, obj) -> bool:
        # A null sender is the documented "staff reply written via Django
        # admin" case — but the admin's own TicketMessageInline exposes
        # `sender` as an editable field, so a support agent who fills it in
        # with their own account produced a message the frontend then
        # attributed to the *student*: support's words, in the student's own
        # bubble, labelled "Դու". Observed on a seeded ticket where support
        # asked a question and the thread showed the student asking it.
        #
        # Authorship is the honest test, and both ticket endpoints scope the
        # queryset to `user=request.user`, so the viewer is always the
        # ticket's owner: anyone else who wrote in this thread is support.
        request = self.context.get("request")
        viewer_id = getattr(getattr(request, "user", None), "id", None)
        return obj.sender_id is None or (viewer_id is not None and obj.sender_id != viewer_id)


class TicketListSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupportTicket
        fields = ["id", "category", "subject", "status", "created_at", "updated_at"]


class TicketDetailSerializer(serializers.ModelSerializer):
    # Attachments uploaded with the ticket itself (message is null); replies
    # carry their own attachments nested under each TicketMessage instead.
    attachments = serializers.SerializerMethodField()
    messages = TicketMessageSerializer(many=True, read_only=True)

    class Meta:
        model = SupportTicket
        fields = [
            "id", "category", "subject", "description", "status",
            "source_article_slugs", "attachments", "messages", "created_at", "updated_at",
        ]

    def get_attachments(self, obj):
        initial = [a for a in obj.attachments.all() if a.message_id is None]
        return TicketAttachmentSerializer(initial, many=True, context=self.context).data


class TicketCreateSerializer(serializers.Serializer):
    category = serializers.ChoiceField(choices=TicketCategory.choices)
    description = serializers.CharField(trim_whitespace=True)
    diagnostic_info = serializers.JSONField(required=False, allow_null=True, default=None)
    source_article_slugs = serializers.ListField(
        child=serializers.SlugField(max_length=100), required=False, default=list,
    )
    ai_context = serializers.CharField(required=False, allow_blank=True, default="")


class TicketMessageCreateSerializer(serializers.Serializer):
    text = serializers.CharField(required=False, allow_blank=True, default="", trim_whitespace=True)
