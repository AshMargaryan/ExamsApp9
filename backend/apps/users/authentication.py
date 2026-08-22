from datetime import timedelta

from django.utils import timezone
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed

from .models import UserSession

# Debounce window for the last_activity_at write below — this runs on every
# authenticated request, so without a debounce it's an UPDATE per request
# against what becomes the hottest table in the database under load.
ACTIVITY_WRITE_INTERVAL = timedelta(seconds=60)


class SessionAwareJWTAuthentication(JWTAuthentication):
    """Standard SimpleJWT auth, plus a per-request check that the token's
    session_id claim (set in apps/users/utils.py:issue_tokens_for_user) still
    points at a non-revoked UserSession. This is what makes revoking a
    device's session take effect immediately, on its very next API call,
    instead of only once its ~30-minute access token happens to expire."""

    def get_user(self, validated_token):
        user = super().get_user(validated_token)

        session_id = validated_token.get("session_id")
        session = UserSession.objects.filter(session_id=session_id).first() if session_id else None
        if session is None or not session.is_active:
            raise AuthenticationFailed("Session revoked.", code="session_revoked")

        now = timezone.now()
        if now - session.last_activity_at >= ACTIVITY_WRITE_INTERVAL:
            UserSession.objects.filter(pk=session.pk).update(last_activity_at=now)
        return user
