"""
ASGI config for config project.

Routes HTTP to the normal Django app and WebSocket connections to each
realtime app's consumer (see apps.games / apps.chat's consumers.py +
routing.py). apps.games.auth_middleware.JWTAuthMiddleware is generic (not
games-specific — it just validates the same JWT access token DRF uses) and
is shared by every app's WebSocket routes rather than each app reimplementing
WS auth.

For more information on this file, see
https://docs.djangoproject.com/en/5.0/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Must be created before importing anything that touches Django models.
django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter  # noqa: E402

from apps.chat.routing import websocket_urlpatterns as chat_websocket_urlpatterns  # noqa: E402
from apps.games.auth_middleware import JWTAuthMiddleware  # noqa: E402
from apps.games.routing import websocket_urlpatterns as games_websocket_urlpatterns  # noqa: E402

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": JWTAuthMiddleware(
        URLRouter(games_websocket_urlpatterns + chat_websocket_urlpatterns)
    ),
})
