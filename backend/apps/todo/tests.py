import datetime

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from .models import Project, RecurrenceFrequency, Task, TaskPriority
from .services import complete_task

User = get_user_model()


def _make_user(username="alice", email="alice@example.com"):
    return User.objects.create_user(username=username, email=email, password="pw123456")


def _make_task(user, **kwargs):
    defaults = {"title": "Study for exam", "priority": TaskPriority.MEDIUM}
    defaults.update(kwargs)
    return Task.objects.create(user=user, **defaults)


class TaskScopingTests(TestCase):
    def setUp(self):
        self.alice = _make_user("alice", "alice@example.com")
        self.bob = _make_user("bob", "bob@example.com")
        self.client = APIClient()
        self.client.force_authenticate(self.alice)

    def test_user_only_sees_own_tasks(self):
        _make_task(self.alice, title="Mine")
        _make_task(self.bob, title="Not mine")

        resp = self.client.get("/api/todo/tasks/")
        self.assertEqual(resp.status_code, 200)
        titles = [t["title"] for t in resp.data]
        self.assertEqual(titles, ["Mine"])

    def test_cannot_retrieve_another_users_task(self):
        other_task = _make_task(self.bob)
        resp = self.client.get(f"/api/todo/tasks/{other_task.id}/")
        self.assertEqual(resp.status_code, 404)

    def test_create_task_with_tags_and_subtasks(self):
        resp = self.client.post("/api/todo/tasks/", {
            "title": "Finish project",
            "priority": "high",
            "tags": ["school", "exam"],
            "subtasks_input": ["Research", "Write"],
        }, format="json")
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(sorted(resp.data["tags_detail"]), ["exam", "school"])
        self.assertEqual(resp.data["subtask_progress"], {"completed": 0, "total": 2})

    def test_delete_is_soft(self):
        task = _make_task(self.alice)
        resp = self.client.delete(f"/api/todo/tasks/{task.id}/")
        self.assertEqual(resp.status_code, 204)
        task.refresh_from_db()
        self.assertTrue(task.is_deleted)
        self.assertFalse(Task.objects.filter(id=task.id, is_deleted=False).exists())

        resp = self.client.get("/api/todo/trash/")
        self.assertEqual([t["id"] for t in resp.data], [task.id])

        resp = self.client.post(f"/api/todo/trash/{task.id}/restore/")
        self.assertEqual(resp.status_code, 200)
        task.refresh_from_db()
        self.assertFalse(task.is_deleted)


class DashboardTests(TestCase):
    def setUp(self):
        self.user = _make_user()
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_buckets_and_progress(self):
        today = timezone.localdate()
        _make_task(self.user, title="Today task", due_date=today)
        _make_task(self.user, title="Overdue task", due_date=today - datetime.timedelta(days=2))
        _make_task(self.user, title="Upcoming task", due_date=today + datetime.timedelta(days=3))
        _make_task(
            self.user, title="Done today", due_date=today,
            is_completed=True, completed_at=timezone.now(),
        )
        _make_task(self.user, title="Urgent one", priority=TaskPriority.URGENT)

        resp = self.client.get("/api/todo/dashboard/")
        self.assertEqual(resp.status_code, 200)
        data = resp.data
        self.assertEqual([t["title"] for t in data["today"]], ["Today task"])
        self.assertEqual([t["title"] for t in data["overdue"]], ["Overdue task"])
        self.assertEqual([t["title"] for t in data["upcoming"]], ["Upcoming task"])
        self.assertEqual([t["title"] for t in data["completed_today"]], ["Done today"])
        self.assertIn("Urgent one", [t["title"] for t in data["important"]])
        self.assertEqual(data["today_progress"], {"completed": 1, "total": 2, "percent": 50})

    def test_default_categories_seeded_lazily(self):
        resp = self.client.get("/api/todo/categories/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 8)
        names = {c["name"] for c in resp.data}
        self.assertIn("Դպրոց", names)


class RecurrenceTests(TestCase):
    def setUp(self):
        self.user = _make_user()

    def test_completing_daily_task_creates_next_occurrence(self):
        today = timezone.localdate()
        task = _make_task(
            self.user, due_date=today,
            recurrence_freq=RecurrenceFrequency.DAILY, recurrence_interval=1,
        )
        next_task = complete_task(task)
        self.assertIsNotNone(next_task)
        self.assertEqual(next_task.due_date, today + datetime.timedelta(days=1))
        self.assertEqual(next_task.recurrence_parent_id, task.id)
        self.assertFalse(next_task.is_completed)

    def test_recurrence_stops_after_end_date(self):
        today = timezone.localdate()
        task = _make_task(
            self.user, due_date=today,
            recurrence_freq=RecurrenceFrequency.DAILY,
            recurrence_end_date=today,
        )
        next_task = complete_task(task)
        self.assertIsNone(next_task)

    def test_non_recurring_task_creates_no_occurrence(self):
        task = _make_task(self.user, due_date=timezone.localdate())
        self.assertIsNone(complete_task(task))


class BulkActionTests(TestCase):
    def setUp(self):
        self.user = _make_user()
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_bulk_complete_and_set_priority(self):
        t1 = _make_task(self.user, title="A")
        t2 = _make_task(self.user, title="B")

        resp = self.client.post("/api/todo/tasks/bulk/", {
            "ids": [t1.id, t2.id], "action": "complete",
        }, format="json")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["updated"], 2)
        self.assertTrue(Task.objects.get(id=t1.id).is_completed)

        resp = self.client.post("/api/todo/tasks/bulk/", {
            "ids": [t1.id, t2.id], "action": "set_priority", "priority": "urgent",
        }, format="json")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(Task.objects.get(id=t2.id).priority, "urgent")

    def test_bulk_delete_is_soft(self):
        t1 = _make_task(self.user)
        self.client.post("/api/todo/tasks/bulk/", {"ids": [t1.id], "action": "delete"}, format="json")
        t1.refresh_from_db()
        self.assertTrue(t1.is_deleted)


class ProjectProgressTests(TestCase):
    def setUp(self):
        self.user = _make_user()

    def test_progress_percent_computed_from_tasks(self):
        project = Project.objects.create(user=self.user, name="Launch App")
        _make_task(self.user, project=project, is_completed=True)
        _make_task(self.user, project=project, is_completed=False)

        client = APIClient()
        client.force_authenticate(self.user)
        resp = client.get(f"/api/todo/projects/{project.id}/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["progress_percent"], 50)
        self.assertEqual(resp.data["task_count"], 2)
