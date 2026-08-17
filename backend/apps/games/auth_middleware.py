"""
WebSocket auth: browsers can't set an Authorization header on a WS
handshake, so the frontend passes the same JWT access token it already
uses for REST calls as a `?token=` query param instead. Validated to the
same standard as the REST API — meaning both the token's own signature and
expiry (SimpleJWT's AccessToken) AND that its session is still live, exactly
as apps/users/authentication.py:SessionAwareJWTAuthentication does for HTTP.

Keeping those two paths in step is the whole point: a token rejected by the
REST API must be rejected here too. Without the session check, revoking a
device (or logging out) would still leave that device able to open sockets —
and so to keep receiving chat messages, notifications and game state in
realtime — until its access token happened to expire up to 30 minutes later.
"""
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from django.utils import timezone
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import AccessToken

from apps.users.models import UserSession


@database_sync_to_async
def _get_user_from_token(token: str):
    User = get_user_model()
    try:
        access = AccessToken(token)
        # A token with no session_id predates device sessions (or was minted
        # outside issue_tokens_for_user); treat it as unauthenticated rather
        # than granting it an unrevocable socket.
        session_id = access.get("session_id")
        session = UserSession.objects.filter(session_id=session_id).first() if session_id else None
        if session is None or not session.is_active:
            return AnonymousUser()

        user = User.objects.get(pk=access["user_id"])
        UserSession.objects.filter(pk=session.pk).update(last_activity_at=timezone.now())
        return user
    except (TokenError, KeyError, User.DoesNotExist):
        return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        query_string = scope.get("query_string", b"").decode()
        token = parse_qs(query_string).get("token", [None])[0]
        scope["user"] = await _get_user_from_token(token) if token else AnonymousUser()
        return await super().__call__(scope, receive, send)
