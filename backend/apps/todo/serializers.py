from django.utils import timezone
from rest_framework import serializers

from .models import Category, Project, Subtask, Tag, Task


class SubtaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subtask
        fields = ["id", "title", "is_completed", "order"]


class ProjectSerializer(serializers.ModelSerializer):
    task_count = serializers.SerializerMethodField()
    completed_count = serializers.SerializerMethodField()
    progress_percent = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            "id", "name", "description", "color", "icon", "deadline", "is_archived",
            "created_at", "updated_at", "task_count", "completed_count", "progress_percent",
        ]

    def get_task_count(self, obj):
        return obj.tasks.filter(is_deleted=False).count()

    def get_completed_count(self, obj):
        return obj.tasks.filter(is_deleted=False, is_completed=True).count()

    def get_progress_percent(self, obj):
        total = self.get_task_count(obj)
        if not total:
            return 0
        return round(self.get_completed_count(obj) / total * 100)


class ProjectMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ["id", "name", "color", "icon"]


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "color", "icon", "is_default"]
        read_only_fields = ["is_default"]

    def validate_name(self, value):
        request = self.context["request"]
        qs = Category.objects.filter(user=request.user, name=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Այս անունով կատեգորիա արդեն կա։")
        return value


class CategoryMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "color", "icon"]


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ["id", "name"]


class TaskSerializer(serializers.ModelSerializer):
    project = serializers.PrimaryKeyRelatedField(
        queryset=Project.objects.none(), required=False, allow_null=True
    )
    category = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.none(), required=False, allow_null=True
    )
    project_detail = ProjectMiniSerializer(source="project", read_only=True)
    category_detail = CategoryMiniSerializer(source="category", read_only=True)

    tags = serializers.ListField(
        child=serializers.CharField(max_length=40), write_only=True, required=False
    )
    tags_detail = serializers.SerializerMethodField()

    subtasks = SubtaskSerializer(many=True, read_only=True)
    subtasks_input = serializers.ListField(
        child=serializers.CharField(max_length=300), write_only=True, required=False
    )
    subtask_progress = serializers.SerializerMethodField()

    priority_display = serializers.CharField(source="get_priority_display", read_only=True)
    recurrence_freq_display = serializers.CharField(source="get_recurrence_freq_display", read_only=True)
    is_overdue = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            "id", "title", "description", "notes",
            "project", "project_detail", "category", "category_detail",
            "tags", "tags_detail",
            "priority", "priority_display",
            "due_date", "due_time", "estimated_duration_minutes",
            "reminder_offset_minutes",
            "recurrence_freq", "recurrence_freq_display", "recurrence_interval", "recurrence_end_date",
            "subtasks", "subtasks_input", "subtask_progress",
            "is_completed", "completed_at", "is_overdue",
            "created_at", "updated_at",
        ]
        read_only_fields = ["is_completed", "completed_at"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request is not None:
            self.fields["project"].queryset = Project.objects.filter(user=request.user)
            self.fields["category"].queryset = Category.objects.filter(user=request.user)

    def get_tags_detail(self, obj):
        return [t.name for t in obj.tags.all()]

    def get_subtask_progress(self, obj):
        subtasks = list(obj.subtasks.all())
        total = len(subtasks)
        completed = sum(1 for s in subtasks if s.is_completed)
        return {"completed": completed, "total": total}

    def get_is_overdue(self, obj):
        if obj.is_completed or obj.due_date is None:
            return False
        return obj.due_date < timezone.localdate()

    def _sync_tags(self, task, tag_names, user):
        tags = []
        for raw in tag_names:
            name = raw.strip().lstrip("#")
            if not name:
                continue
            tag, _ = Tag.objects.get_or_create(user=user, name=name)
            tags.append(tag)
        task.tags.set(tags)

    def create(self, validated_data):
        tag_names = validated_data.pop("tags", [])
        subtasks_input = validated_data.pop("subtasks_input", [])
        user = validated_data.pop("user")
        task = Task.objects.create(user=user, **validated_data)
        self._sync_tags(task, tag_names, user)
        for index, title in enumerate(subtasks_input):
            if title.strip():
                Subtask.objects.create(task=task, title=title.strip(), order=index)
        return task

    def update(self, instance, validated_data):
        tag_names = validated_data.pop("tags", None)
        validated_data.pop("subtasks_input", None)
        validated_data.pop("user", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if tag_names is not None:
            self._sync_tags(instance, tag_names, instance.user)
        return instance


class TaskBulkActionSerializer(serializers.Serializer):
    ACTIONS = (
        "complete", "incomplete", "delete", "set_priority",
        "set_category", "set_project", "add_tag", "set_due_date",
    )
    ids = serializers.ListField(child=serializers.IntegerField(), allow_empty=False)
    action = serializers.ChoiceField(choices=ACTIONS)
    priority = serializers.CharField(required=False)
    category = serializers.IntegerField(required=False, allow_null=True)
    project = serializers.IntegerField(required=False, allow_null=True)
    tag = serializers.CharField(required=False)
    due_date = serializers.DateField(required=False, allow_null=True)
