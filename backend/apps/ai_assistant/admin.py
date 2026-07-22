from django.contrib import admin

from .models import Attachment, Conversation, Message, ToolCall


class MessageInline(admin.TabularInline):
    model = Message
    extra = 0
    fields = ["role", "content", "status", "created_at"]
    readonly_fields = ["created_at"]


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ["id", "title", "owner", "is_archived", "is_pinned", "last_message_at", "deleted_at"]
    list_filter = ["is_archived", "is_pinned"]
    search_fields = ["title", "owner__username"]
    inlines = [MessageInline]


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ["id", "conversation", "role", "status", "provider", "created_at"]
    list_filter = ["role", "status", "provider"]
    search_fields = ["content"]


admin.site.register(Attachment)
admin.site.register(ToolCall)
