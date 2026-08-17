from django.urls import path

from .views import CallCreateView, CallDetailView, CallListView, JoinCallView, LeaveCallView

urlpatterns = [
    path("", CallCreateView.as_view(), name="call_create"),
    path("list/", CallListView.as_view(), name="call_list"),
    path("<int:pk>/", CallDetailView.as_view(), name="call_detail"),
    path("<int:pk>/join/", JoinCallView.as_view(), name="call_join"),
    path("<int:pk>/leave/", LeaveCallView.as_view(), name="call_leave"),
]
