from django.conf import settings
from django.db import models


class ChallengeStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    ACCEPTED = "accepted", "Accepted"
    DECLINED = "declined", "Declined"
    CANCELLED = "cancelled", "Cancelled"
    EXPIRED = "expired", "Expired"


class ChallengeInvite(models.Model):
    """
    A 1v1 challenge between friends. Modeled on apps.friends.FriendRequest —
    a thin invite/response record — plus a link to the games app's existing
    room infrastructure once accepted, rather than duplicating any of it.
    `subject` reuses apps.games.GameSettings' own FK (apps.practice.Subject),
    which naturally limits challenges to subjects with real practice content
    (only Math/English today) — no separate "is this subject ready" check
    needed, the FK choices already are that check.
    """

    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sent_challenges"
    )
    receiver = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="received_challenges"
    )
    status = models.CharField(max_length=10, choices=ChallengeStatus.choices, default=ChallengeStatus.PENDING)

    subject = models.ForeignKey("practice.Subject", on_delete=models.PROTECT, related_name="+")
    topic = models.ForeignKey(
        "practice.Topic", null=True, blank=True, on_delete=models.PROTECT, related_name="+"
    )

    room = models.OneToOneField(
        "games.GameRoom", null=True, blank=True, on_delete=models.SET_NULL, related_name="challenge"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField()

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.sender} -> {self.receiver} ({self.status})"
