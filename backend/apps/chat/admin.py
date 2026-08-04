from django.contrib import admin

from .models import Attachment, Conversation, ConversationParticipant, Message


class ConversationParticipantInline(admin.TabularInline):
    model = ConversationParticipant
    extra = 0
    fields = ["user", "role", "active", "joined_at", "last_read_message"]
    readonly_fields = ["joined_at"]
    autocomplete_fields = ["user", "last_read_message"]


class MessageInline(admin.TabularInline):
    model = Message
    extra = 0
    fields = ["sender", "message_type", "text", "created_at"]
    readonly_fields = ["created_at"]


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ["id", "type", "name", "created_by", "updated_at", "created_at"]
    list_filter = ["type"]
    search_fields = ["name", "id"]
    inlines = [ConversationParticipantInline, MessageInline]


@admin.register(ConversationParticipant)
class ConversationParticipantAdmin(admin.ModelAdmin):
    list_display = ["id", "conversation", "user", "role", "active", "joined_at"]
    list_filter = ["role", "active"]
    search_fields = ["user__username", "conversation__name"]
    autocomplete_fields = ["conversation", "user", "last_read_message"]


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ["id", "conversation", "sender", "message_type", "created_at", "deleted_at"]
    list_filter = ["message_type"]
    search_fields = ["text", "sender__username"]
    autocomplete_fields = ["conversation", "sender"]


@admin.register(Attachment)
class AttachmentAdmin(admin.ModelAdmin):
    list_display = ["id", "original_filename", "conversation", "uploaded_by", "file_type", "file_size", "uploaded_at"]
    list_filter = ["file_type"]
    search_fields = ["original_filename", "uploaded_by__username"]
    autocomplete_fields = ["conversation", "uploaded_by", "message"]
