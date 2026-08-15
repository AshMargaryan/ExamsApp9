import datetime

from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Category, Project, Subtask, Tag, Task, TaskPriority
from .serializers import (
    CategorySerializer,
    ProjectMiniSerializer,
    ProjectSerializer,
    SubtaskSerializer,
    TagSerializer,
    TaskBulkActionSerializer,
    TaskSerializer,
)
from .services import check_and_fire_reminders, complete_task, ensure_default_categories, uncomplete_task

PRIORITY_ORDER = {"urgent": 0, "high": 1, "medium": 2, "low": 3}


class TaskListCreateView(generics.ListCreateAPIView):
    """GET /api/todo/tasks/ — this user's non-deleted tasks, with optional
    ?priority=, ?project=, ?category=, ?tag=, ?completed=, ?filter=today|
    overdue|upcoming|important, ?sort=priority|due_date|created_at|project|
    category|duration|completion. POST creates a task."""
    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        check_and_fire_reminders(self.request.user)
        qs = (
            Task.objects.filter(user=self.request.user, is_deleted=False)
            .select_related("project", "category")
            .prefetch_related("tags", "subtasks")
        )
        params = self.request.query_params

        priority = params.get("priority")
        if priority:
            qs = qs.filter(priority=priority)
        project = params.get("project")
        if project:
            qs = qs.filter(project_id=project)
        category = params.get("category")
        if category:
            qs = qs.filter(category_id=category)
        tag = params.get("tag")
        if tag:
            qs = qs.filter(tags__name=tag)
        completed = params.get("completed")
        if completed is not None:
            qs = qs.filter(is_completed=completed.lower() == "true")

        today = timezone.localdate()
        quick = params.get("filter")
        if quick == "today":
            qs = qs.filter(due_date=today)
        elif quick == "overdue":
            qs = qs.filter(due_date__lt=today, is_completed=False)
        elif quick == "upcoming":
            qs = qs.filter(due_date__gt=today)
        elif quick == "important":
            qs = qs.filter(priority__in=[TaskPriority.URGENT, TaskPriority.HIGH], is_completed=False)

        sort = params.get("sort")
        if sort == "due_date":
            qs = qs.order_by("due_date", "-priority")
        elif sort == "created_at":
            qs = qs.order_by("-created_at")
        elif sort == "project":
            qs = qs.order_by("project__name")
        elif sort == "category":
            qs = qs.order_by("category__name")
        elif sort == "duration":
            qs = qs.order_by("estimated_duration_minutes")
        elif sort == "completion":
            qs = qs.order_by("is_completed")

        return qs.distinct()

    def list(self, request, *args, **kwargs):
        queryset = list(self.get_queryset())
        if request.query_params.get("sort") == "priority":
            queryset.sort(key=lambda t: PRIORITY_ORDER.get(t.priority, 4))
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class TaskDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/PUT/DELETE /api/todo/tasks/<id>/ — DELETE soft-deletes
    (recoverable from the trash)."""
    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Task.objects.filter(user=self.request.user, is_deleted=False)

    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.deleted_at = timezone.now()
        instance.save(update_fields=["is_deleted", "deleted_at"])


class TaskCompleteView(APIView):
    """POST /api/todo/tasks/<id>/complete/ — toggles completion. Completing a
    recurring task creates its next occurrence (see services.complete_task)."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        task = get_object_or_404(Task, pk=pk, user=request.user, is_deleted=False)
        next_task = None
        if task.is_completed:
            uncomplete_task(task)
        else:
            next_task = complete_task(task)
        ctx = {"request": request}
        payload = {"task": TaskSerializer(task, context=ctx).data}
        if next_task:
            payload["next_occurrence"] = TaskSerializer(next_task, context=ctx).data
        return Response(payload)


class TaskDuplicateView(APIView):
    """POST /api/todo/tasks/<id>/duplicate/"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        task = get_object_or_404(Task, pk=pk, user=request.user, is_deleted=False)
        clone = Task.objects.create(
            user=task.user, title=f"{task.title} (կրկնօրինակ)", description=task.description,
            notes=task.notes, project=task.project, category=task.category, priority=task.priority,
            due_date=task.due_date, due_time=task.due_time,
            estimated_duration_minutes=task.estimated_duration_minutes,
            reminder_offset_minutes=task.reminder_offset_minutes,
            recurrence_freq=task.recurrence_freq, recurrence_interval=task.recurrence_interval,
            recurrence_end_date=task.recurrence_end_date,
        )
        clone.tags.set(task.tags.all())
        for subtask in task.subtasks.all():
            Subtask.objects.create(task=clone, title=subtask.title, order=subtask.order)
        return Response(
            TaskSerializer(clone, context={"request": request}).data, status=status.HTTP_201_CREATED
        )


class TaskBulkActionView(APIView):
    """POST /api/todo/tasks/bulk/ — {ids: [...], action: "...", ...}"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = TaskBulkActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data
        qs = Task.objects.filter(user=request.user, is_deleted=False, id__in=d["ids"])
        action = d["action"]
        updated = 0

        if action == "complete":
            for task in qs.filter(is_completed=False):
                complete_task(task)
                updated += 1
        elif action == "incomplete":
            updated = qs.filter(is_completed=True).update(is_completed=False, completed_at=None)
        elif action == "delete":
            updated = qs.update(is_deleted=True, deleted_at=timezone.now())
        elif action == "set_priority":
            priority = d.get("priority")
            if priority not in TaskPriority.values:
                return Response({"detail": "Անվավեր առաջնահերթություն։"}, status=status.HTTP_400_BAD_REQUEST)
            updated = qs.update(priority=priority)
        elif action == "set_category":
            category = None
            if d.get("category") is not None:
                category = get_object_or_404(Category, pk=d["category"], user=request.user)
            updated = qs.update(category=category)
        elif action == "set_project":
            project = None
            if d.get("project") is not None:
                project = get_object_or_404(Project, pk=d["project"], user=request.user)
            updated = qs.update(project=project)
        elif action == "set_due_date":
            updated = qs.update(due_date=d.get("due_date"))
        elif action == "add_tag":
            name = (d.get("tag") or "").strip().lstrip("#")
            if not name:
                return Response({"detail": "Թեգը դատարկ է։"}, status=status.HTTP_400_BAD_REQUEST)
            tag, _ = Tag.objects.get_or_create(user=request.user, name=name)
            for task in qs:
                task.tags.add(tag)
                updated += 1

        return Response({"updated": updated})


class TaskDashboardView(APIView):
    """GET /api/todo/dashboard/ — today/upcoming/overdue/completed/important
    task buckets, per-project snapshot, and today/week progress."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        ensure_default_categories(request.user)
        check_and_fire_reminders(request.user)

        today = timezone.localdate()
        week_start = today - datetime.timedelta(days=today.weekday())
        week_end = week_start + datetime.timedelta(days=6)

        base = (
            Task.objects.filter(user=request.user, is_deleted=False)
            .select_related("project", "category")
            .prefetch_related("tags", "subtasks")
        )
        ctx = {"request": request}

        def serialize(qs):
            return TaskSerializer(qs, many=True, context=ctx).data

        def progress_for(qs):
            total = qs.count()
            completed = qs.filter(is_completed=True).count()
            return {
                "completed": completed, "total": total,
                "percent": round(completed / total * 100) if total else 0,
            }

        by_project = []
        for project in Project.objects.filter(user=request.user, is_archived=False):
            tasks = base.filter(project=project, is_completed=False)[:5]
            if tasks:
                by_project.append({
                    "project": ProjectMiniSerializer(project).data,
                    "tasks": serialize(tasks),
                })

        return Response({
            "today": serialize(base.filter(due_date=today, is_completed=False)),
            "upcoming": serialize(
                base.filter(due_date__gt=today, due_date__lte=today + datetime.timedelta(days=7),
                            is_completed=False)
            ),
            "overdue": serialize(base.filter(due_date__lt=today, is_completed=False)),
            "completed_today": serialize(base.filter(is_completed=True, completed_at__date=today)),
            "important": serialize(
                base.filter(priority__in=[TaskPriority.URGENT, TaskPriority.HIGH], is_completed=False)
                .exclude(due_date__lt=today)
            ),
            "by_project": by_project,
            "today_progress": progress_for(base.filter(due_date=today)),
            "week_progress": progress_for(base.filter(due_date__gte=week_start, due_date__lte=week_end)),
        })


class SubtaskListCreateView(generics.ListCreateAPIView):
    serializer_class = SubtaskSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_task(self):
        return get_object_or_404(
            Task, pk=self.kwargs["task_id"], user=self.request.user, is_deleted=False
        )

    def get_queryset(self):
        return Subtask.objects.filter(task=self.get_task())

    def perform_create(self, serializer):
        task = self.get_task()
        serializer.save(task=task, order=task.subtasks.count())


class SubtaskDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = SubtaskSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Subtask.objects.filter(task__user=self.request.user, task_id=self.kwargs["task_id"])


class ProjectListCreateView(generics.ListCreateAPIView):
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return Project.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class ProjectDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Project.objects.filter(user=self.request.user)


class CategoryListCreateView(generics.ListCreateAPIView):
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        ensure_default_categories(self.request.user)
        return Category.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class CategoryDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Category.objects.filter(user=self.request.user)


class TagListView(generics.ListAPIView):
    serializer_class = TagSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return Tag.objects.filter(user=self.request.user)


class TrashListView(generics.ListAPIView):
    """GET /api/todo/trash/ — soft-deleted tasks, most recently deleted first."""
    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return Task.objects.filter(user=self.request.user, is_deleted=True).order_by("-deleted_at")


class TrashRestoreView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        task = get_object_or_404(Task, pk=pk, user=request.user, is_deleted=True)
        task.is_deleted = False
        task.deleted_at = None
        task.save(update_fields=["is_deleted", "deleted_at"])
        return Response(TaskSerializer(task, context={"request": request}).data)


class TrashPermanentDeleteView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, pk):
        task = get_object_or_404(Task, pk=pk, user=request.user, is_deleted=True)
        task.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
