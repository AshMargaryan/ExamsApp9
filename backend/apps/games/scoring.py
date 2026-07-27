"""
Competition scoring: correctness + speed. Deliberately a plain function over
primitives with no Django/ORM dependency, so it can be lifted as-is into a
future tournament/league mode without pulling in this app's room/participant
models — feed it a ScoringConfig and the four facts about one answer, get a
point value back.
"""
from dataclasses import dataclass, field

DEFAULT_BASE_POINTS = {"easy": 10, "medium": 20, "hard": 30}
DEFAULT_CORRECTNESS_WEIGHT = 0.8
DEFAULT_SPEED_WEIGHT = 0.2


@dataclass(frozen=True)
class ScoringConfig:
    """
    One scoring "profile". The ~80/20 correctness/speed split is the
    default, not a constant baked into the math — build a different config
    (from a room's GameSettings, or a future TournamentSettings row) to
    change the weighting, or the per-tier base points, without touching
    compute_score itself.
    """

    base_points: dict = field(default_factory=lambda: dict(DEFAULT_BASE_POINTS))
    correctness_weight: float = DEFAULT_CORRECTNESS_WEIGHT
    speed_weight: float = DEFAULT_SPEED_WEIGHT

    def base_for(self, tier: str) -> int:
        return self.base_points.get(tier, 0)


def compute_score(
    *,
    tier: str,
    is_correct: bool,
    time_taken_seconds: float | None,
    time_limit_seconds: float,
    config: ScoringConfig = ScoringConfig(),
) -> int:
    """
    Points for one answer:
      - Incorrect, or unanswered: 0 — no partial credit, no speed bonus.
      - Correct: `correctness_weight` share of the tier's base points,
        always awarded in full, plus up to `speed_weight` share more for
        answering quickly — full speed bonus at 0s elapsed, none left right
        at the deadline, linear in between.
    """
    if not is_correct:
        return 0

    base = config.base_for(tier)
    correctness_points = base * config.correctness_weight

    speed_fraction = 1.0
    if time_taken_seconds is not None and time_limit_seconds > 0:
        speed_fraction = max(0.0, min(1.0, 1 - (time_taken_seconds / time_limit_seconds)))
    speed_points = base * config.speed_weight * speed_fraction

    return round(correctness_points + speed_points)
