from django.urls import path

from .views import (
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
]
