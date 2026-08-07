from django.urls import path

from .views import (
    CancelChildRequestView, ChildDashboardView, ChildRequestListView, ChildrenListView,
    GoalDeleteView, GoalListCreateView, MarkNotificationsReadView, NotificationListView,
    RespondChildRequestView, SearchChildrenView, SendChildRequestView, UnlinkChildView, WeeklyReportView,
)

urlpatterns = [
    path("children/", ChildrenListView.as_view(), name="parents-children"),
    path("search-children/", SearchChildrenView.as_view(), name="parents-search-children"),
    path("requests/", ChildRequestListView.as_view(), name="parents-requests"),
    path("requests/send/", SendChildRequestView.as_view(), name="parents-request-send"),
    path("requests/<int:pk>/respond/", RespondChildRequestView.as_view(), name="parents-request-respond"),
    path("requests/<int:pk>/", CancelChildRequestView.as_view(), name="parents-request-cancel"),
    path("children/<int:child_id>/", UnlinkChildView.as_view(), name="parents-unlink"),
    path("children/<int:child_id>/dashboard/", ChildDashboardView.as_view(), name="parents-dashboard"),
    path("children/<int:child_id>/weekly-report/", WeeklyReportView.as_view(), name="parents-weekly-report"),
    path("children/<int:child_id>/goals/", GoalListCreateView.as_view(), name="parents-goals"),
    path("goals/<int:goal_id>/", GoalDeleteView.as_view(), name="parents-goal-delete"),
    path("notifications/", NotificationListView.as_view(), name="parents-notifications"),
    path("notifications/mark-read/", MarkNotificationsReadView.as_view(), name="parents-notifications-mark-read"),
]
