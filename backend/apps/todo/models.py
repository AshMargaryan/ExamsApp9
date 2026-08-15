from django.conf import settings
from django.db import models


class TaskPriority(models.TextChoices):
    URGENT = "urgent", "Urgent"
    HIGH = "high", "High"
    MEDIUM = "medium", "Medium"
    LOW = "low", "Low"


class RecurrenceFrequency(models.TextChoices):
    NONE = "none", "Does not repeat"
    DAILY = "daily", "Every day"
    WEEKDAYS = "weekdays", "Every weekday"
    WEEKLY = "weekly", "Every week"
    MONTHLY = "monthly", "Every month"


DEFAULT_CATEGORIES = [
    # (name, color, icon) — lazily seeded per user by services.ensure_default_categories.
    ("Դպրոց", "#6366f1", "graduation-cap"),
    ("Աշխատանք", "#0ea5e9", "briefcase"),
    ("Անձնական", "#22c55e", "user"),
    ("Ֆիթնես", "#f97316", "dumbbell"),
    ("Ֆինանսներ", "#eab308", "wallet"),
    ("Նախագծեր", "#a855f7", "rocket"),
    ("Գնումներ", "#ec4899", "shopping-cart"),
    ("Այլ", "#64748b", "more-horizontal"),
]


class Project(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="todo_projects"
    )
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True, default="")
    color = models.CharField(max_length=20, blank=True, default="#6366f1")
    icon = models.CharField(max_length=40, blank=True, default="rocket")
    deadline = models.DateField(null=True, blank=True)
    is_archived = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        indexes = [models.Index(fields=["user", "is_archived"])]

    def __str__(self):
        return f"{self.user} / {self.name}"


class Category(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="todo_categories"
    )
    name = models.CharField(max_length=60)
    color = models.CharField(max_length=20, blank=True, default="#64748b")
    icon = models.CharField(max_length=40, blank=True, default="more-horizontal")
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-is_default", "name"]
        constraints = [
            models.UniqueConstraint(fields=["user", "name"], name="unique_todo_category_per_user"),
        ]

    def __str__(self):
        return f"{self.user} / {self.name}"


class Tag(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="todo_tags"
    )
    name = models.CharField(max_length=40)

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(fields=["user", "name"], name="unique_todo_tag_per_user"),
        ]

    def __str__(self):
        return f"#{self.name}"


class Task(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="todo_tasks"
    )
    title = models.CharField(max_length=300)
    description = models.TextField(blank=True, default="")
    notes = models.TextField(blank=True, default="")

    project = models.ForeignKey(
        Project, on_delete=models.SET_NULL, null=True, blank=True, related_name="tasks"
    )
    category = models.ForeignKey(
        Category, on_delete=models.SET_NULL, null=True, blank=True, related_name="tasks"
    )
    tags = models.ManyToManyField(Tag, blank=True, related_name="tasks")

    priority = models.CharField(max_length=10, choices=TaskPriority.choices, default=TaskPriority.MEDIUM)

    due_date = models.DateField(null=True, blank=True, db_index=True)
    due_time = models.TimeField(null=True, blank=True)
    estimated_duration_minutes = models.PositiveIntegerField(null=True, blank=True)

    # Minutes before due_date/due_time to fire a reminder notification (e.g.
    # 5/15/60/1440). Null = no reminder. See services.check_and_fire_reminders.
    reminder_offset_minutes = models.PositiveIntegerField(null=True, blank=True)
    reminder_fired_at = models.DateTimeField(null=True, blank=True)

    recurrence_freq = models.CharField(
        max_length=10, choices=RecurrenceFrequency.choices, default=RecurrenceFrequency.NONE
    )
    recurrence_interval = models.PositiveIntegerField(default=1)
    recurrence_end_date = models.DateField(null=True, blank=True)
    # Set on the next-occurrence task created by services.complete_task, so a
    # recurring chain can be traced back to where it started.
    recurrence_parent = models.ForeignKey(
        "self", on_delete=models.SET_NULL, null=True, blank=True, related_name="recurrence_children"
    )

    is_completed = models.BooleanField(default=False, db_index=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    is_deleted = models.BooleanField(default=False, db_index=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "is_deleted", "is_completed", "due_date"]),
            models.Index(fields=["user", "is_deleted", "project"]),
        ]

    def __str__(self):
        return f"{self.user} / {self.title}"


class Subtask(models.Model):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="subtasks")
    title = models.CharField(max_length=300)
    is_completed = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order", "created_at"]

    def __str__(self):
        return f"{self.task_id} / {self.title}"
