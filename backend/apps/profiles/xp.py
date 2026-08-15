"""
Single entry point for granting XP. Every XP source (achievements, games,
practice, mock exams, ...) should call `award_xp` rather than touching
Profile.total_xp directly, so lifetime XP and the current month's ranking
tally never drift apart.
"""
from django.db.models import F

from apps.rankings.services import record_subject_xp_gain, record_xp_gain

from .models import Profile


def award_xp(user, amount: int, subject: str | None = None) -> None:
    """`subject`, when given, is one of apps.profiles.subjects.SUBJECT_LABELS'
    canonical keys (math/physics/biology/chemistry/english) — credits the
    same amount to that subject's XP ledger in addition to the overall one.
    Omit it when the XP source has no subject (e.g. an achievement unlock)."""
    if amount <= 0:
        return
    Profile.objects.filter(user=user).update(total_xp=F("total_xp") + amount)
    record_xp_gain(user, amount)
    if subject:
        record_subject_xp_gain(user, subject, amount)
