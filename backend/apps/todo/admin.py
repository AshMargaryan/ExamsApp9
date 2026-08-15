from django.contrib import admin

from .models import Category, Project, Subtask, Tag, Task


class SubtaskInline(admin.TabularInline):
    model = Subtask
    extra = 0


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ["title", "user", "priority", "due_date", "is_completed", "is_deleted"]
    list_filter = ["priority", "is_completed", "is_deleted", "recurrence_freq"]
    search_fields = ["title", "description", "user__username"]
    inlines = [SubtaskInline]


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ["name", "user", "deadline", "is_archived"]
    search_fields = ["name", "user__username"]


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "user", "is_default"]
    search_fields = ["name", "user__username"]


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ["name", "user"]
    search_fields = ["name", "user__username"]
