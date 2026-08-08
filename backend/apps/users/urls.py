from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    RegisterView, LoginView, MeView,
    GoogleAuthView, OAuthCompleteRegisterView,
    SchoolSearchView, UniversitySearchView,
    VerifyEmailView, ResendVerificationCodeView,
    PasswordResetRequestView, PasswordResetConfirmView,
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("google/", GoogleAuthView.as_view(), name="google_auth"),
    path("oauth/complete/", OAuthCompleteRegisterView.as_view(), name="oauth_complete"),
    path("me/", MeView.as_view(), name="me"),
    path("schools/", SchoolSearchView.as_view(), name="school_search"),
    path("universities/", UniversitySearchView.as_view(), name="university_search"),
    path("verify-email/", VerifyEmailView.as_view(), name="verify_email"),
    path("verify-email/resend/", ResendVerificationCodeView.as_view(), name="resend_verification"),
    path("password-reset/", PasswordResetRequestView.as_view(), name="password_reset_request"),
    path("password-reset/confirm/", PasswordResetConfirmView.as_view(), name="password_reset_confirm"),
]
