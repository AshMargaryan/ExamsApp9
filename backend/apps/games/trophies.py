"""
Competitive trophy reward — public/random games only.

There is no per-game trophy concept elsewhere in the app to reuse: XP
(apps.profiles.xp) is per-question and always awarded; rankings.RankingAward
is a *monthly* top-3 XP leaderboard snapshot, unrelated to any single game.
This is a new, narrowly-scoped addition that plugs into the existing
GameStats/GameParticipant models (see models.py) rather than introducing a
parallel trophy system.

Formula
-------
Only the top 3 finishers of a PUBLIC room earn anything (mirrors
rankings.services.TOP_N_AWARDED's top-3 shape). The winner's share scales
with sqrt(participant_count / REFERENCE_PARTICIPANTS) so a bigger public
game is worth more without being linearly (and therefore absurdly) more
valuable than a small one:

    reward(rank, participant_count) =
        round(BASE_TROPHY_REWARD * sqrt(participant_count / REFERENCE_PARTICIPANTS)
              * RANK_MULTIPLIER[rank])

REFERENCE_PARTICIPANTS=10 anchors the scale to the "player_count" queue's
minimum room size. BASE_TROPHY_REWARD=6 was chosen to land in the same
single/low-double-digit range as this app's existing small-reward currencies
(achievement xp_reward values run 10-200; per-game score/XP runs in the tens
to low hundreds — see scoring.DEFAULT_BASE_POINTS), so trophies read as a
distinct, smaller-scale currency rather than a second XP.

Examples (winner / 2nd / 3rd):
    2 participants:  3 / 2 / 1
    10 participants:  6 / 3 / 2
    50 participants: 13 / 7 / 3

Note this is NOT linear: 50 players is 5x the room of 10 players, but only
~2.2x the trophies (13 vs 6).

Speed bonus XP
--------------
Separate axis, separate reward: with independent per-player pacing (see
gameplay.py) nobody waits on anyone else mid-game, but finishing all your
questions quickly is otherwise invisible in the reward math (base XP =
score, which already has its own small per-answer speed component via
ScoringConfig.speed_weight — see scoring.py — but that's per-question, not
"how fast did you clear the whole game"). SPEED_BONUS_XP rewards the 3
fastest participants who genuinely completed every question (not
force-finished by the total_game_time cap — see
GameParticipant.time_taken_to_finish_seconds) with a flat, small XP bonus,
applies in BOTH public and private rooms (it's XP, not a trophy — the
public/private trophy boundary from GameRoomType doesn't apply here), and
is stored separately (GameParticipant.speed_bonus_xp) so results can show
it as its own line instead of being silently folded into the score-based
XP number.
"""
import math

from .models import GameParticipant, GameRoom, GameRoomType, GameStats

BASE_TROPHY_REWARD = 6
REFERENCE_PARTICIPANTS = 10
RANK_MULTIPLIER = {1: 1.0, 2: 0.5, 3: 0.25}

SPEED_BONUS_XP = {1: 15, 2: 8, 3: 3}


def trophies_for_rank(rank: int, participant_count: int) -> int:
    """Trophies for finishing `rank` in a public game of `participant_count`
    players. 0 for anyone outside the top 3, or for degenerate room sizes."""
    multiplier = RANK_MULTIPLIER.get(rank)
    if multiplier is None or participant_count < 2:
        return 0
    scale = math.sqrt(participant_count / REFERENCE_PARTICIPANTS)
    return max(1, round(BASE_TROPHY_REWARD * scale * multiplier))


def award_trophies(room: GameRoom, participants: list[GameParticipant]) -> None:
    """
    Credits trophies to the top-3 finishers of a PUBLIC room, once.

    `participants` must already be ranked (participant.rank set) and saved
    by the caller after this returns (it only mutates trophies_earned in
    memory — see services._settle_room, which does the actual save/
    update_fields). Idempotency is the caller's responsibility: this must
    only ever be invoked from inside the settle transaction, guarded by
    `room.trophies_awarded` under a row lock (see services._settle_room).

    Private/local rooms (room.type != PUBLIC) never get anything, enforced
    here server-side regardless of what any client claims.
    """
    if room.type != GameRoomType.PUBLIC:
        return
    if room.trophies_awarded:
        return

    participant_count = room.participant_count_at_start or len(participants)

    for participant in participants:
        reward = trophies_for_rank(participant.rank, participant_count)
        if not reward:
            continue
        participant.trophies_earned = reward
        stats, _ = GameStats.objects.get_or_create(user=participant.user)
        stats.trophies += reward
        stats.save(update_fields=["trophies"])

    room.trophies_awarded = True


def award_speed_bonuses(participants: list[GameParticipant]) -> None:
    """
    Grants the 3 fastest full-completers of THIS game a flat XP bonus,
    mutating participant.speed_bonus_xp in memory (caller adds it into
    xp_earned and saves — see services._settle_room). Only participants who
    answered every question before the deadline (unanswered_questions == 0,
    time_taken_to_finish_seconds is not None) are eligible — being
    force-finished by the total_game_time cap is "ran out of time", not
    "finished fast". Works for both public and private rooms.
    """
    eligible = [
        p for p in participants
        if p.time_taken_to_finish_seconds is not None and p.unanswered_questions == 0
    ]
    eligible.sort(key=lambda p: p.time_taken_to_finish_seconds)

    for rank, participant in enumerate(eligible[:3], start=1):
        participant.speed_bonus_xp = SPEED_BONUS_XP[rank]
