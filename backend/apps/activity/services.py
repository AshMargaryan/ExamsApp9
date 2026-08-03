from datetime import timedelta

from django.db.models import Q
from django.utils import timezone

from .models import StudySession

IDLE_THRESHOLD = timedelta(minutes=5)


def record_heartbeat(user) -> StudySession:
    """
    Extend the user's currently open session, or close it and start a new
    one if more than IDLE_THRESHOLD has passed since the last heartbeat.
    The frontend only calls this while it has observed real activity
    (clicks/keys/scroll/nav) on a learning page, so a heartbeat arriving is
    itself evidence the user was active up to `now`.
    """
    now = timezone.now()
    session = StudySession.objects.filter(user=user, ended_at__isnull=True).first()

    if session is None:
        return StudySession.objects.create(user=user, last_activity_at=now)

    if now - session.last_activity_at > IDLE_THRESHOLD:
        session.ended_at = session.last_activity_at
        session.save(update_fields=["ended_at"])
        return StudySession.objects.create(user=user, last_activity_at=now)

    session.last_activity_at = now
    session.save(update_fields=["last_activity_at"])
    return session


def total_seconds_since(user, since) -> int:
    """Sum of active study time from sessions overlapping [since, now]."""
    sessions = StudySession.objects.filter(user=user).filter(
        Q(ended_at__gte=since) | Q(ended_at__isnull=True, last_activity_at__gte=since)
    )

    total = timedelta()
    for session in sessions:
        effective_end = session.ended_at or session.last_activity_at
        effective_start = max(session.started_at, since)
        if effective_end > effective_start:
            total += effective_end - effective_start

    return int(total.total_seconds())


def weekly_seconds(user) -> int:
    return total_seconds_since(user, timezone.now() - timedelta(days=7))