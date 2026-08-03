from django.urls import path

from .views import (
    AssignmentCreateView,
    AssignmentDetailView,
    AssignmentListView,
    AssignmentReviewActionView,
    AssignmentStartView,
    AssignmentSubmitView,
    CancelInvitationView,
    InvitationListView,
    RespondInvitationView,
    SendInvitationView,
    StudentSearchView,
    TeacherStudentRosterView,
)

urlpatterns = [
    path("students/", TeacherStudentRosterView.as_view(), name="teacher_student_roster"),
    path("students/search/", StudentSearchView.as_view(), name="student_search"),
    path("invitations/", InvitationListView.as_view(), name="invitation_list"),
    path("invitations/send/", SendInvitationView.as_view(), name="send_invitation"),
    path("invitations/<int:pk>/respond/", RespondInvitationView.as_view(), name="respond_invitation"),
    path("invitations/<int:pk>/", CancelInvitationView.as_view(), name="cancel_invitation"),
    path("assignments/", AssignmentListView.as_view(), name="assignment_list"),
    path("assignments/create/", AssignmentCreateView.as_view(), name="assignment_create"),
    path("assignments/<int:pk>/detail/", AssignmentDetailView.as_view(), name="assignment_detail"),
    path("assignments/<int:pk>/start/", AssignmentStartView.as_view(), name="assignment_start"),
    path("assignments/<int:pk>/submit/", AssignmentSubmitView.as_view(), name="assignment_submit"),
    path("assignments/<int:pk>/review/", AssignmentReviewActionView.as_view(), name="assignment_review"),
]