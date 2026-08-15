from django.contrib import admin

from .models import Document, DocumentAttachment, Folder


@admin.register(Folder)
class FolderAdmin(admin.ModelAdmin):
    list_display = ["name", "user", "parent", "deleted_at", "updated_at"]
    list_filter = ["deleted_at"]
    search_fields = ["name", "user__username"]

    def get_queryset(self, request):
        return Folder.all_objects.all()


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ["title", "user", "folder", "is_favorite", "is_pinned", "deleted_at", "updated_at"]
    list_filter = ["deleted_at", "is_favorite", "is_pinned"]
    search_fields = ["title", "user__username"]

    def get_queryset(self, request):
        return Document.all_objects.all()


@admin.register(DocumentAttachment)
class DocumentAttachmentAdmin(admin.ModelAdmin):
    list_display = ["original_filename", "document", "file_type", "file_size", "uploaded_at"]
    search_fields = ["original_filename", "uploaded_by__username"]
