from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from .models import UserSession

User = get_user_model()

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


def create_session(user, request) -> tuple[UserSession, list[UserSession]]:
    """Create a session for this device, signing out the oldest devices if the
    account is already at its cap.

    Returns (new_session, evicted_sessions). `evicted_sessions` is normally
    empty; when it isn't, the caller reports it to the client so the user finds
    out that another device was signed out rather than silently discovering it
    later.

    Eviction is by `created_at` — the device that logged in first is the one
    that goes, which is what a user means by "log out the old one". (Note this
    is oldest-login, not least-recently-used: a phone that logged in months ago
    and is used daily still loses to a laptop that logged in yesterday. Switch
    the ordering to `last_activity_at` if that turns out to be the wrong call.)

    Race-safe: locks the user row for the duration of the count-evict-create,
    so two concurrent logins for the same user can't both slip past the cap.
    """
    user_agent = request.META.get("HTTP_USER_AGENT", "")
    with transaction.atomic():
        locked_user = User.objects.select_for_update().get(pk=user.pk)
        limit = get_device_limit(locked_user)

        active = list(
            UserSession.objects.filter(user=locked_user, revoked_at__isnull=True).order_by("created_at")
        )
        # Free exactly enough room for this device. Usually that's one session;
        # a loop rather than a single delete because the limit can drop (e.g. a
        # subscription downgrade) while sessions are already open above it.
        surplus = len(active) - limit + 1
        evicted: list[UserSession] = []
        if surplus > 0:
            evicted = active[:surplus]
            revoked_at = timezone.now()
            UserSession.objects.filter(pk__in=[s.pk for s in evicted]).update(revoked_at=revoked_at)
            for session in evicted:
                session.revoked_at = revoked_at

        session = UserSession.objects.create(
            user=locked_user,
            platform=_parse_platform(user_agent),
            browser=_parse_browser(user_agent),
            ip_address=_client_ip(request),
        )
        return session, evicted
