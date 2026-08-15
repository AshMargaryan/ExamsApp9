from django.urls import path

from . import views

urlpatterns = [
    path("dashboard/", views.TaskDashboardView.as_view(), name="todo-dashboard"),

    path("tasks/bulk/", views.TaskBulkActionView.as_view(), name="todo-task-bulk"),
    path("tasks/", views.TaskListCreateView.as_view(), name="todo-task-list"),
    path("tasks/<int:pk>/", views.TaskDetailView.as_view(), name="todo-task-detail"),
    path("tasks/<int:pk>/complete/", views.TaskCompleteView.as_view(), name="todo-task-complete"),
    path("tasks/<int:pk>/duplicate/", views.TaskDuplicateView.as_view(), name="todo-task-duplicate"),
    path(
        "tasks/<int:task_id>/subtasks/",
        views.SubtaskListCreateView.as_view(), name="todo-subtask-list",
    ),
    path(
        "tasks/<int:task_id>/subtasks/<int:pk>/",
        views.SubtaskDetailView.as_view(), name="todo-subtask-detail",
    ),

    path("projects/", views.ProjectListCreateView.as_view(), name="todo-project-list"),
    path("projects/<int:pk>/", views.ProjectDetailView.as_view(), name="todo-project-detail"),

    path("categories/", views.CategoryListCreateView.as_view(), name="todo-category-list"),
    path("categories/<int:pk>/", views.CategoryDetailView.as_view(), name="todo-category-detail"),

    path("tags/", views.TagListView.as_view(), name="todo-tag-list"),

    path("trash/", views.TrashListView.as_view(), name="todo-trash-list"),
    path("trash/<int:pk>/restore/", views.TrashRestoreView.as_view(), name="todo-trash-restore"),
    path("trash/<int:pk>/", views.TrashPermanentDeleteView.as_view(), name="todo-trash-delete"),
]
