import uuid

from django.conf import settings
from django.contrib.postgres.fields import ArrayField
from django.db import models


# ---------------------------------------------------------------------------
# Categories & Articles
# ---------------------------------------------------------------------------

class Category(models.Model):
    key = models.SlugField(max_length=50, unique=True)
    name = models.CharField(max_length=100)
    icon = models.CharField(max_length=10, blank=True, default="")
    description = models.CharField(max_length=255, blank=True, default="")
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]
        verbose_name_plural = "categories"

    def __str__(self):
        return self.name


class ArticleSection(models.TextChoices):
    """Drives the "Getting started / Features / Troubleshooting" grouping
    shown on a category page — a simple field beats a full subcategory
    taxonomy for what's still a handful of articles per category."""

    GUIDE = "guide", "Getting started"
    FEATURE = "feature", "Features"
    TROUBLESHOOTING = "troubleshooting", "Troubleshooting"


class Article(models.Model):
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name="articles")
    slug = models.SlugField(max_length=100, unique=True)
    title = models.CharField(max_length=255)
    summary = models.CharField(max_length=500, blank=True, default="")
    content = models.TextField(blank=True, default="")  # Markdown
    section = models.CharField(
        max_length=20, choices=ArticleSection.choices, default=ArticleSection.GUIDE
    )
    tags = ArrayField(models.CharField(max_length=50), default=list, blank=True)
    order = models.PositiveIntegerField(default=0)
    is_published = models.BooleanField(default=True)

    view_count = models.PositiveIntegerField(default=0)
    helpful_count = models.PositiveIntegerField(default=0)
    unhelpful_count = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order", "id"]
        indexes = [
            models.Index(fields=["category", "section", "is_published"]),
            models.Index(fields=["is_published", "-view_count"]),
        ]

    def __str__(self):
        return self.title


class FeedbackReason(models.TextChoices):
    NOT_SOLVED = "not_solved", "Didn't solve my problem"
    OUTDATED = "outdated", "Outdated"
    TOO_COMPLICATED = "too_complicated", "Too complicated"
    WRONG_INFO = "wrong_info", "Wrong information"
    OTHER = "other", "Other"


class ArticleFeedback(models.Model):
    article = models.ForeignKey(Article, on_delete=models.CASCADE, related_name="feedback")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="help_article_feedback",
    )
    is_helpful = models.BooleanField()
    reason = models.CharField(max_length=20, choices=FeedbackReason.choices, blank=True, default="")
    comment = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{'up' if self.is_helpful else 'down'} on {self.article_id}"


# ---------------------------------------------------------------------------
# Search log — makes zero-result queries visible in admin (spec: "search gaps")
# ---------------------------------------------------------------------------

class SearchQuery(models.Model):
    query = models.CharField(max_length=255)
    results_count = models.PositiveIntegerField(default=0)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="help_search_queries",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["results_count", "-created_at"])]
        verbose_name_plural = "search queries"

    def __str__(self):
        return self.query


# ---------------------------------------------------------------------------
# Support tickets
# ---------------------------------------------------------------------------

class TicketCategory(models.TextChoices):
    ACCOUNT = "account", "Account"
    AI = "ai", "AI"
    PAYMENT = "payment", "Payment"
    BUG = "bug", "Bug"
    STUDY_FEATURE = "study_feature", "Study feature"
    OTHER = "other", "Other"


class TicketStatus(models.TextChoices):
    OPEN = "open", "Open"
    WAITING_FOR_YOU = "waiting_for_you", "Waiting for you"
    IN_PROGRESS = "in_progress", "In progress"
    RESOLVED = "resolved", "Resolved"
    CLOSED = "closed", "Closed"


class SupportTicket(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="support_tickets"
    )
    category = models.CharField(max_length=20, choices=TicketCategory.choices)
    subject = models.CharField(max_length=255, blank=True, default="")
    description = models.TextField()
    status = models.CharField(max_length=20, choices=TicketStatus.choices, default=TicketStatus.OPEN)

    # Browser/OS/page/app-version — collected client-side, never anything
    # sensitive (see lib/help/diagnostics.ts on the frontend).
    diagnostic_info = models.JSONField(null=True, blank=True)

    # Populated when a ticket is escalated from "Ask Gitus AI" so the user
    # never has to re-explain what they already told the AI (spec §27).
    source_article_slugs = ArrayField(models.CharField(max_length=100), default=list, blank=True)
    ai_context = models.TextField(blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        indexes = [models.Index(fields=["user", "-updated_at"])]

    def __str__(self):
        return self.subject or f"Ticket #{self.pk}"

    def save(self, *args, **kwargs):
        if not self.subject:
            self.subject = (self.description[:60] + "…") if len(self.description) > 60 else self.description
        super().save(*args, **kwargs)


class TicketMessage(models.Model):
    ticket = models.ForeignKey(SupportTicket, on_delete=models.CASCADE, related_name="messages")
    # Null sender == a staff reply, written via Django admin.
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name="help_ticket_messages",
    )
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at", "id"]

    def __str__(self):
        return f"[{'staff' if self.sender_id is None else 'user'}] {self.text[:50]}"


def ticket_attachment_upload_path(instance, filename):
    unique_name = f"{uuid.uuid4().hex}_{filename}"
    return f"help_ticket_attachments/{instance.ticket_id}/{unique_name}"


class TicketAttachment(models.Model):
    ticket = models.ForeignKey(SupportTicket, on_delete=models.CASCADE, related_name="attachments")
    message = models.ForeignKey(
        TicketMessage, on_delete=models.SET_NULL, null=True, blank=True, related_name="attachments"
    )
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    file = models.FileField(upload_to=ticket_attachment_upload_path)
    original_filename = models.CharField(max_length=255)
    mime_type = models.CharField(max_length=150)
    size = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at", "id"]

    def __str__(self):
        return self.original_filename
