"""
ASGI config for config project.

Routes HTTP to the normal Django app and WebSocket connections to the games
app's realtime consumer (see apps.games.consumers / apps.games.routing) and
the notifications app's push consumer (see apps.notifications.consumers /
apps.notifications.routing).

For more information on this file, see
https://docs.djangoproject.com/en/5.0/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Must be created before importing anything that touches Django models.
django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter  # noqa: E402

from apps.games.auth_middleware import JWTAuthMiddleware  # noqa: E402
from apps.games.routing import websocket_urlpatterns as game_websocket_urlpatterns  # noqa: E402
from apps.notifications.routing import websocket_urlpatterns as notification_websocket_urlpatterns  # noqa: E402

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": JWTAuthMiddleware(
        URLRouter(game_websocket_urlpatterns + notification_websocket_urlpatterns)
    ),
})
