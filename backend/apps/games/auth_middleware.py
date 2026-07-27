"""
WebSocket auth: browsers can't set an Authorization header on a WS
handshake, so the frontend passes the same JWT access token it already
uses for REST calls as a `?token=` query param instead. Validated exactly
like DRF's JWTAuthentication (same SimpleJWT AccessToken class), so a
token rejected by the REST API is rejected here too.
"""
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import AccessToken


@database_sync_to_async
def _get_user_from_token(token: str):
    User = get_user_model()
    try:
        access = AccessToken(token)
        return User.objects.get(pk=access["user_id"])
    except (TokenError, KeyError, User.DoesNotExist):
        return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        query_string = scope.get("query_string", b"").decode()
        token = parse_qs(query_string).get("token", [None])[0]
        scope["user"] = await _get_user_from_token(token) if token else AnonymousUser()
        return await super().__call__(scope, receive, send)
