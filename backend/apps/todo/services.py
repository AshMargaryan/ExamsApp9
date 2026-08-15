import calendar
import datetime

from django.db import transaction
from django.utils import timezone

from apps.notifications.models import NotificationType
from apps.notifications.services import create_notification

from .models import DEFAULT_CATEGORIES, Category, RecurrenceFrequency, Task


def ensure_default_categories(user):
    """Lazily seeds this user's default category set the first time they
    touch the To-Do API. A no-op (get_or_create) on every later call, so it's
    safe to call unconditionally from the list/dashboard views."""
    for name, color, icon in DEFAULT_CATEGORIES:
        Category.objects.get_or_create(
            user=user, name=name, defaults={"color": color, "icon": icon, "is_default": True},
        )


def _add_months(date, months):
    month_index = date.month - 1 + months
    year = date.year + month_index // 12
    month = month_index % 12 + 1
    day = min(date.day, calendar.monthrange(year, month)[1])
    return date.replace(year=year, month=month, day=day)


def _next_due_date(due_date, freq, interval):
    if freq == RecurrenceFrequency.DAILY:
        return due_date + datetime.timedelta(days=interval)
    if freq == RecurrenceFrequency.WEEKDAYS:
        d = due_date
        remaining = interval
        while remaining > 0:
            d += datetime.timedelta(days=1)
            if d.weekday() < 5:  # Mon-Fri
                remaining -= 1
        return d
    if freq == RecurrenceFrequency.WEEKLY:
        return due_date + datetime.timedelta(weeks=interval)
    if freq == RecurrenceFrequency.MONTHLY:
        return _add_months(due_date, interval)
    return None


def _due_datetime(task):
    if task.due_date is None:
        return None
    due_time = task.due_time or datetime.time.min
    naive = datetime.datetime.combine(task.due_date, due_time)
    return timezone.make_aware(naive) if timezone.is_naive(naive) else naive


def check_and_fire_reminders(user):
    """Fires (and dedupes) reminder notifications for this user's tasks whose
    reminder time has passed. Called from the dashboard/list views instead of
    a background scheduler — the codebase has no Celery/cron, so an active
    user's own requests are what drive this, mirroring how notifications'
    WebSocket push is just a nudge on top of REST-as-source-of-truth."""
    now = timezone.now()
    candidates = Task.objects.filter(
        user=user, is_deleted=False, is_completed=False,
        reminder_offset_minutes__isnull=False, reminder_fired_at__isnull=True,
        due_date__isnull=False,
    )
    for task in candidates:
        due_at = _due_datetime(task)
        if due_at is None:
            continue
        reminder_at = due_at - datetime.timedelta(minutes=task.reminder_offset_minutes)
        if now >= reminder_at:
            create_notification(
                user,
                NotificationType.TODO_REMINDER,
                f"«{task.title}» ժամկետը մոտենում է",
                context={"task_id": task.id},
                link="/todo",
            )
            task.reminder_fired_at = now
            task.save(update_fields=["reminder_fired_at"])


@transaction.atomic
def complete_task(task):
    """Marks a task complete and, if it recurs, creates the next occurrence.
    Returns the newly created next-occurrence Task, or None."""
    task.is_completed = True
    task.completed_at = timezone.now()
    task.save(update_fields=["is_completed", "completed_at"])

    if task.recurrence_freq == RecurrenceFrequency.NONE or task.due_date is None:
        return None

    next_date = _next_due_date(task.due_date, task.recurrence_freq, task.recurrence_interval)
    if next_date is None:
        return None
    if task.recurrence_end_date and next_date > task.recurrence_end_date:
        return None

    next_task = Task.objects.create(
        user=task.user,
        title=task.title,
        description=task.description,
        notes=task.notes,
        project=task.project,
        category=task.category,
        priority=task.priority,
        due_date=next_date,
        due_time=task.due_time,
        estimated_duration_minutes=task.estimated_duration_minutes,
        reminder_offset_minutes=task.reminder_offset_minutes,
        recurrence_freq=task.recurrence_freq,
        recurrence_interval=task.recurrence_interval,
        recurrence_end_date=task.recurrence_end_date,
        recurrence_parent=task.recurrence_parent or task,
    )
    next_task.tags.set(task.tags.all())
    for subtask in task.subtasks.all():
        subtask.pk = None
        subtask.task = next_task
        subtask.is_completed = False
        subtask.save()
    return next_task


def uncomplete_task(task):
    task.is_completed = False
    task.completed_at = None
    task.save(update_fields=["is_completed", "completed_at"])
