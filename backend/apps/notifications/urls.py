from django.urls import path

from .views import MarkAllNotificationsReadView, MarkNotificationReadView, NotificationListView

urlpatterns = [
    path("", NotificationListView.as_view(), name="notification_list"),
    path("<int:pk>/read/", MarkNotificationReadView.as_view(), name="notification_mark_read"),
    path("read-all/", MarkAllNotificationsReadView.as_view(), name="notification_mark_all_read"),
]
