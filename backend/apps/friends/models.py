from django.conf import settings
from django.db import models


class FriendRequestStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    ACCEPTED = "accepted", "Accepted"
    REJECTED = "rejected", "Rejected"


class FriendRequest(models.Model):
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sent_friend_requests"
    )
    receiver = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="received_friend_requests"
    )
    status = models.CharField(
        max_length=10, choices=FriendRequestStatus.choices, default=FriendRequestStatus.PENDING
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.sender} -> {self.receiver} ({self.status})"


class Block(models.Model):
    """
    One-directional: `blocker` chose to block `blocked`. Enforcement is
    symmetric though (see services.is_blocked) — if either side has
    blocked the other, neither can start a new DM with them — but the row
    itself only ever represents the blocker's own action, so unblocking
    doesn't require the other person's cooperation.
    """

    blocker = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="blocks_made"
    )
    blocked = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="blocks_received"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["blocker", "blocked"], name="unique_block_pair"),
        ]

    def __str__(self):
        return f"{self.blocker} blocked {self.blocked}"


class Friendship(models.Model):
    """
    One row per friend pair, always stored with user1_id < user2_id so
    membership can't be duplicated in the reverse direction. Deliberately
    standalone (no FKs out to other apps) so it can later back a friends
    leaderboard / competition feature without this app knowing about them.
    """

    user1 = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="friendships_as_user1"
    )
    user2 = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="friendships_as_user2"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("user1", "user2")]

    def __str__(self):
        return f"{self.user1} <-> {self.user2}"
