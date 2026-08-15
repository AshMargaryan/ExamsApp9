from django.contrib import admin

from .models import (
    Article, ArticleFeedback, Category, SearchQuery,
    SupportTicket, TicketAttachment, TicketMessage,
)


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "key", "icon", "order"]
    prepopulated_fields = {"key": ("name",)}


@admin.register(Article)
class ArticleAdmin(admin.ModelAdmin):
    list_display = [
        "title", "category", "section", "is_published", "order",
        "view_count", "helpful_count", "unhelpful_count", "updated_at",
    ]
    list_filter = ["category", "section", "is_published"]
    list_editable = ["is_published", "order"]
    search_fields = ["title", "summary", "content", "tags"]
    prepopulated_fields = {"slug": ("title",)}


@admin.register(ArticleFeedback)
class ArticleFeedbackAdmin(admin.ModelAdmin):
    list_display = ["article", "is_helpful", "reason", "user", "created_at"]
    list_filter = ["is_helpful", "reason"]
    readonly_fields = ["article", "user", "is_helpful", "reason", "comment", "created_at"]


@admin.register(SearchQuery)
class SearchQueryAdmin(admin.ModelAdmin):
    list_display = ["query", "results_count", "user", "created_at"]
    list_filter = ["results_count"]
    search_fields = ["query"]
    readonly_fields = ["query", "results_count", "user", "created_at"]


class TicketMessageInline(admin.TabularInline):
    model = TicketMessage
    extra = 1
    fields = ["sender", "text", "created_at"]
    readonly_fields = ["created_at"]


class TicketAttachmentInline(admin.TabularInline):
    model = TicketAttachment
    extra = 0
    fields = ["file", "original_filename", "uploaded_by", "created_at"]
    readonly_fields = ["created_at"]


@admin.register(SupportTicket)
class SupportTicketAdmin(admin.ModelAdmin):
    list_display = ["subject", "user", "category", "status", "created_at", "updated_at"]
    list_filter = ["status", "category"]
    list_editable = ["status"]
    search_fields = ["subject", "description", "user__username"]
    readonly_fields = ["user", "category", "description", "diagnostic_info", "source_article_slugs", "ai_context", "created_at"]
    inlines = [TicketMessageInline, TicketAttachmentInline]
