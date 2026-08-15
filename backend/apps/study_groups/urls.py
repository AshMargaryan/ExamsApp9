from django.urls import path

from .views import (
    GroupCreateView,
    GroupDetailView,
    GroupSearchView,
    JoinGroupView,
    LeaveGroupView,
    TransferLeadershipView,
)

urlpatterns = [
    path("", GroupCreateView.as_view(), name="group_create"),
    path("search/", GroupSearchView.as_view(), name="group_search"),
    path("<int:pk>/", GroupDetailView.as_view(), name="group_detail"),
    path("<int:pk>/join/", JoinGroupView.as_view(), name="group_join"),
    path("<int:pk>/leave/", LeaveGroupView.as_view(), name="group_leave"),
    path("<int:pk>/transfer-leadership/", TransferLeadershipView.as_view(), name="group_transfer_leadership"),
]
