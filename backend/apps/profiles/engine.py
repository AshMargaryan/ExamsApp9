"""
Achievement-unlock engine. Call `evaluate_achievements(user)` after any
activity that might move an achievement's underlying metric (practice
submission, streak update, ...). Cheap to call repeatedly — already-unlocked
achievements are skipped, and evaluators are simple aggregate queries.

To add a new achievement type: add a RequirementType choice in models.py,
add a matching evaluator function below, and register it in
REQUIREMENT_EVALUATORS. No schema change needed for new thresholds — those
are just Achievement rows (seeded via management command / admin / migration).
"""
from django.db.models import F, Max

from apps.practice.models import AttemptAnswer, PracticeAttempt
from apps.streaks.models import LearningStreak

from .models import Achievement, RequirementType, UserAchievement


def _questions_solved(user) -> int:
    return AttemptAnswer.objects.filter(
        attempt__user=user,
        attempt__completed_at__isnull=False,
        attempt__revealed_answers=False,
        is_correct=True,
    ).count()


def _best_score(user) -> float:
    best = PracticeAttempt.objects.filter(
        user=user, completed_at__isnull=False, revealed_answers=False,
    ).aggregate(Max("score"))["score__max"]
    return best or 0


def _longest_streak(user) -> int:
    streak = LearningStreak.objects.filter(user=user).first()
    return streak.longest_streak if streak else 0


def _games_played(user) -> int:
    from apps.games.models import GameStats  # local import: avoids a load-order dependency on apps.games

    stats = GameStats.objects.filter(user=user).first()
    return stats.games_played if stats else 0


def _games_won(user) -> int:
    from apps.games.models import GameStats

    stats = GameStats.objects.filter(user=user).first()
    return stats.wins if stats else 0


REQUIREMENT_EVALUATORS = {
    RequirementType.QUESTIONS_SOLVED: _questions_solved,
    RequirementType.PERFECT_SCORE: _best_score,
    RequirementType.STREAK_DAYS: _longest_streak,
    RequirementType.GAMES_PLAYED: _games_played,
    RequirementType.GAMES_WON: _games_won,
}


def evaluate_achievements(user) -> list[Achievement]:
    """Unlocks any achievements the user now qualifies for. Returns the newly unlocked ones."""
    already_unlocked_ids = set(
        UserAchievement.objects.filter(user=user).values_list("achievement_id", flat=True)
    )
    newly_unlocked = []

    for achievement in Achievement.objects.exclude(id__in=already_unlocked_ids):
        evaluator = REQUIREMENT_EVALUATORS.get(achievement.requirement_type)
        if evaluator is None:
            continue
        if evaluator(user) >= achievement.requirement_value:
            _, created = UserAchievement.objects.get_or_create(user=user, achievement=achievement)
            if created:
                newly_unlocked.append(achievement)

    if newly_unlocked:
        from .models import Profile

        xp_gained = sum(a.xp_reward for a in newly_unlocked)
        if xp_gained:
            Profile.objects.filter(user=user).update(total_xp=F("total_xp") + xp_gained)

    return newly_unlocked
