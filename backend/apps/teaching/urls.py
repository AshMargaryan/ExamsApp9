from django.urls import path

from .views import (
    AssignmentCreateView,
    AssignmentListView,
    AssignmentStatusUpdateView,
    CancelInvitationView,
    InvitationListView,
    RespondInvitationView,
    SendInvitationView,
    StudentSearchView,
)

urlpatterns = [
    path("students/search/", StudentSearchView.as_view(), name="student_search"),
    path("invitations/", InvitationListView.as_view(), name="invitation_list"),
    path("invitations/send/", SendInvitationView.as_view(), name="send_invitation"),
    path("invitations/<int:pk>/respond/", RespondInvitationView.as_view(), name="respond_invitation"),
    path("invitations/<int:pk>/", CancelInvitationView.as_view(), name="cancel_invitation"),
    path("assignments/", AssignmentListView.as_view(), name="assignment_list"),
    path("assignments/create/", AssignmentCreateView.as_view(), name="assignment_create"),
    path("assignments/<int:pk>/status/", AssignmentStatusUpdateView.as_view(), name="assignment_status_update"),
]
