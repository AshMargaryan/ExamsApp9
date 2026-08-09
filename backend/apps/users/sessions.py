from django.conf import settings
from django.contrib.auth import get_user_model
from django.core import signing
from django.db import transaction

from .models import UserSession

User = get_user_model()

MANAGEMENT_TICKET_SALT = "apps.users.sessions.management_ticket"
MANAGEMENT_TICKET_MAX_AGE_SECONDS = 10 * 60


class DeviceLimitReached(Exception):
    """Raised by create_session() when the user already has the max number
    of active sessions. Callers turn this into a 403 with a management
    ticket the frontend can use to list/revoke an existing session."""


def get_device_limit(user) -> int:
    """Single seam for subscription-tier device limits later — currently a
    flat setting regardless of user, but every call site already goes
    through here, so swapping in e.g. `user.subscription.max_devices` is a
    one-function change."""
    return settings.MAX_ACTIVE_DEVICES_PER_USER


def _parse_platform(user_agent: str) -> str:
    if "iPhone" in user_agent or "iPad" in user_agent:
        return "iOS"
    if "Android" in user_agent:
        return "Android"
    if "Mac OS X" in user_agent:
        return "macOS"
    if "Windows" in user_agent:
        return "Windows"
    if "Linux" in user_agent:
        return "Linux"
    return ""


def _parse_browser(user_agent: str) -> str:
    if "Edg/" in user_agent:
        return "Edge"
    if "OPR/" in user_agent:
        return "Opera"
    if "Chrome/" in user_agent and "Chromium" not in user_agent:
        return "Chrome"
    if "Firefox/" in user_agent:
        return "Firefox"
    if "Safari/" in user_agent and "Chrome/" not in user_agent:
        return "Safari"
    return ""


def _client_ip(request) -> str | None:
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def create_session(user, request) -> UserSession:
    """Race-safe: locks the user row for the duration of the count-then-create,
    so two concurrent logins for the same user can't both slip past the cap."""
    user_agent = request.META.get("HTTP_USER_AGENT", "")
    with transaction.atomic():
        locked_user = User.objects.select_for_update().get(pk=user.pk)
        active_count = UserSession.objects.filter(user=locked_user, revoked_at__isnull=True).count()
        if active_count >= get_device_limit(locked_user):
            raise DeviceLimitReached()
        return UserSession.objects.create(
            user=locked_user,
            platform=_parse_platform(user_agent),
            browser=_parse_browser(user_agent),
            ip_address=_client_ip(request),
        )


def make_management_ticket(user_id: int) -> str:
    """Short-lived, signed, scoped to nothing but list/revoke of this user's
    sessions — issued when a login is rejected for hitting the device limit,
    so the user can free a slot without ever getting a real, fully-scoped
    access token."""
    return signing.dumps({"user_id": user_id}, salt=MANAGEMENT_TICKET_SALT)


def read_management_ticket(ticket: str) -> int:
    """Returns the user_id. Raises signing.BadSignature/SignatureExpired."""
    data = signing.loads(ticket, salt=MANAGEMENT_TICKET_SALT, max_age=MANAGEMENT_TICKET_MAX_AGE_SECONDS)
    return data["user_id"]
