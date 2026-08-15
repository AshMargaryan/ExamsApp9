from django.urls import path

from .views import (
    RegisterView, LoginView, LogoutView, MeView, ChangePasswordView, SessionAwareTokenRefreshView,
    GoogleAuthView, AppleAuthView, OAuthCompleteRegisterView,
    SessionListView, SessionRevokeView, SessionManagementListView, SessionManagementRevokeView,
    SchoolSearchView, UniversitySearchView,
    VerifyEmailView, ResendVerificationCodeView,
    PasswordResetRequestView, PasswordResetConfirmView,
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("refresh/", SessionAwareTokenRefreshView.as_view(), name="token_refresh"),
    path("google/", GoogleAuthView.as_view(), name="google_auth"),
    path("apple/", AppleAuthView.as_view(), name="apple_auth"),
    path("oauth/complete/", OAuthCompleteRegisterView.as_view(), name="oauth_complete"),
    path("me/", MeView.as_view(), name="me"),
    path("change-password/", ChangePasswordView.as_view(), name="change_password"),
    path("sessions/", SessionListView.as_view(), name="session_list"),
    path("sessions/<int:pk>/revoke/", SessionRevokeView.as_view(), name="session_revoke"),
    path("sessions/manage/list/", SessionManagementListView.as_view(), name="session_management_list"),
    path("sessions/manage/revoke/", SessionManagementRevokeView.as_view(), name="session_management_revoke"),
    path("schools/", SchoolSearchView.as_view(), name="school_search"),
    path("universities/", UniversitySearchView.as_view(), name="university_search"),
    path("verify-email/", VerifyEmailView.as_view(), name="verify_email"),
    path("verify-email/resend/", ResendVerificationCodeView.as_view(), name="resend_verification"),
    path("password-reset/", PasswordResetRequestView.as_view(), name="password_reset_request"),
    path("password-reset/confirm/", PasswordResetConfirmView.as_view(), name="password_reset_confirm"),
]
