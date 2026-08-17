from django.conf import settings
from django.db import models

# A video call room realistically caps low — past ~8 tiles the grid layout
# and everyone's upload bandwidth both degrade — unlike a study group's
# roster, which can be much larger.
CALL_MIN_CAPACITY = 2
CALL_MAX_CAPACITY = 8


class CallRoomStatus(models.TextChoices):
    WAITING = "waiting", "Waiting"  # registration open, participants < capacity
    READY = "ready", "Ready"  # registration closed, capacity reached, not yet connected
    ACTIVE = "active", "Active"  # live call in progress — set once signaling (Milestone 3) starts it
    ENDED = "ended", "Ended"


class CallRoom(models.Model):
    """A capacity-gated call request scoped to one study group — "N people
    register, once N is reached only they may enter the live call." Distinct
    from StudyGroup.max_members: a group of 30 can spawn many small call
    rooms, same relationship as apps.games.GameRoom to whatever page created
    it. No media/signaling state lives here yet (Milestone 1 scope) — this
    is purely the registration/capacity lobby."""

    study_group = models.ForeignKey(
        "study_groups.StudyGroup", on_delete=models.CASCADE, related_name="call_rooms"
    )
    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="created_call_rooms"
    )
    capacity = models.PositiveSmallIntegerField()
    status = models.CharField(max_length=10, choices=CallRoomStatus.choices, default=CallRoomStatus.WAITING)

    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["study_group", "status"]),
        ]

    def __str__(self):
        return f"Call in {self.study_group} by {self.creator} ({self.status})"


class CallParticipant(models.Model):
    room = models.ForeignKey(CallRoom, on_delete=models.CASCADE, related_name="participants")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="call_participations"
    )
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["joined_at"]
        constraints = [
            models.UniqueConstraint(fields=["room", "user"], name="unique_call_room_participant"),
        ]

    def __str__(self):
        return f"{self.user} in {self.room}"
