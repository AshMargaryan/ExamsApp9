from django.urls import path

from . import views

urlpatterns = [
    path("today/", views.TodayStudyPlanView.as_view(), name="study-plan-today"),
    path("tasks/<int:task_id>/check-in/", views.TaskCheckInView.as_view(), name="study-plan-task-check-in"),
]
