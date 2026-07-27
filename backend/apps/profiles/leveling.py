"""
XP -> level curve. Level is never stored — always derived from total_xp so it
can't drift out of sync. Each level requires 100 more XP than the last
(level 1: 0xp, level 2: 100xp, level 3: 300xp, level 4: 600xp, ...).
"""

XP_PER_LEVEL_STEP = 100


def xp_required_for_level(level: int) -> int:
    """Total cumulative XP needed to reach `level` (level >= 1)."""
    if level <= 1:
        return 0
    n = level - 1
    return XP_PER_LEVEL_STEP * n * (n + 1) // 2


def level_for_xp(total_xp: int) -> int:
    level = 1
    while xp_required_for_level(level + 1) <= total_xp:
        level += 1
    return level


def xp_progress(total_xp: int) -> dict:
    level = level_for_xp(total_xp)
    current_floor = xp_required_for_level(level)
    next_ceiling = xp_required_for_level(level + 1)
    return {
        "level": level,
        "xp_into_level": total_xp - current_floor,
        "xp_for_next_level": next_ceiling - current_floor,
    }
