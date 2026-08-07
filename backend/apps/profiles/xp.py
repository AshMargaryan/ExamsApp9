"""
Single entry point for granting XP. Every XP source (achievements, games,
practice, mock exams, ...) should call `award_xp` rather than touching
Profile.total_xp directly, so lifetime XP and the current month's ranking
tally never drift apart.
"""
from django.db.models import F

from apps.rankings.services import record_xp_gain

from .models import Profile


def award_xp(user, amount: int) -> None:
    if amount <= 0:
        return
    Profile.objects.filter(user=user).update(total_xp=F("total_xp") + amount)
    record_xp_gain(user, amount)
