"""
Question-selection engine for multiplayer competition rooms. Pulls from the
existing apps.practice dataset — nothing here is subject-specific, so adding
a new Subject/Topic there makes it selectable here with no code change.
"""
import random

from django.db.models import Count

from apps.practice.models import Question, QuestionType, Tier

from .models import GameQuestion, GameRoom, GameSettings

TIER_LABELS_HY = {
    Tier.EASY: "հեշտ",
    Tier.MEDIUM: "միջին",
    Tier.HARD: "դժվար",
}

# Matchmaking rooms don't go through the manual room-creation form (which
# lets the host pick question_count/tier split/per-tier time limits
# explicitly) — see build_default_settings. These are the defaults applied
# there. Harder tiers get more time, same proportions as scoring's base
# points (scoring.DEFAULT_BASE_POINTS) so effort/reward roughly track time.
DEFAULT_MATCHMAKING_QUESTION_COUNT = 10
DEFAULT_TIER_TIME_LIMITS = {Tier.EASY: 15, Tier.MEDIUM: 20, Tier.HARD: 30}
MIN_MATCHMAKING_QUESTIONS = 5


def available_question_counts(subject, topic, question_types) -> dict:
    """{tier_value: count} of questions matching the subject/topic/type filters."""
    qs = Question.objects.filter(
        subtopic__topic__domain__subject=subject, question_type__in=question_types
    )
    if topic:
        qs = qs.filter(subtopic__topic=topic)

    counts = {tier: 0 for tier in Tier.values}
    for row in qs.values("tier").annotate(total=Count("id")):
        counts[row["tier"]] = row["total"]
    return counts


def select_questions(settings: GameSettings) -> list[Question]:
    """
    Randomly picks settings.question_count questions honoring the
    subject/topic/question-type filters and the easy/medium/hard
    distribution. Each question can only be drawn once (tiers are disjoint
    and random.sample never repeats within a tier), so the result never
    repeats within this single call.
    """
    base_qs = Question.objects.filter(
        subtopic__topic__domain__subject=settings.subject,
        question_type__in=settings.question_types,
    )
    if settings.topic:
        base_qs = base_qs.filter(subtopic__topic=settings.topic)

    tier_counts = {
        Tier.EASY: settings.easy_count,
        Tier.MEDIUM: settings.medium_count,
        Tier.HARD: settings.hard_count,
    }

    chosen_ids: list[int] = []
    for tier, count in tier_counts.items():
        if count <= 0:
            continue
        pool = list(base_qs.filter(tier=tier).values_list("id", flat=True))
        if len(pool) < count:
            raise ValueError(
                f"Բավարար «{TIER_LABELS_HY[tier]}» հարցեր չկան (հասանելի՝ {len(pool)}, "
                f"պահանջվում է՝ {count})։"
            )
        chosen_ids.extend(random.sample(pool, count))

    random.shuffle(chosen_ids)

    by_id = {
        q.id: q
        for q in Question.objects.filter(id__in=chosen_ids).prefetch_related("choices", "statements")
    }
    return [by_id[qid] for qid in chosen_ids]


def _default_tier_split(subject, topic, question_types, desired_total: int) -> dict:
    """
    Proportionally allocates `desired_total` questions across easy/medium/
    hard, capped by what's actually available, shrinking the total instead
    of over-requesting a tier that doesn't have enough. Raises ValueError if
    fewer than MIN_MATCHMAKING_QUESTIONS exist across all tiers combined —
    surfaced to the matchmaking caller instead of silently spawning a room
    that would later "start" with zero/too-few questions.
    """
    counts = available_question_counts(subject, topic, question_types)
    total_available = sum(counts.values())
    if total_available < MIN_MATCHMAKING_QUESTIONS:
        raise ValueError(
            f"Այս առարկայի համար բավարար հարցեր չկան հանրային խաղի համար "
            f"(հասանելի՝ {total_available}, նվազագույնը պահանջվում է՝ {MIN_MATCHMAKING_QUESTIONS})։"
        )

    target = min(desired_total, total_available)
    tiers = [Tier.EASY, Tier.MEDIUM, Tier.HARD]
    split = {tier: min(counts.get(tier, 0), target // len(tiers)) for tier in tiers}

    # Distribute the remainder (from integer division / capped tiers) into
    # whichever tiers still have room, until `target` is reached.
    remaining = target - sum(split.values())
    while remaining > 0:
        progressed = False
        for tier in tiers:
            if remaining <= 0:
                break
            if split[tier] < counts.get(tier, 0):
                split[tier] += 1
                remaining -= 1
                progressed = True
        if not progressed:
            break

    return split


def build_default_settings(
    room: GameRoom, subject, topic=None, question_count: int = DEFAULT_MATCHMAKING_QUESTION_COUNT
) -> GameSettings:
    """
    Auto-configures a matchmaking-spawned room's GameSettings — the manual
    "create room" flow lets the host fill in a GameSettingsSerializer
    directly, but matchmaking only ever collects a subject (see
    services._spawn_matchmaking_room / views.FindGameView), so this fills in
    sensible defaults for everything else. Raises ValueError (surfaced as a
    400 to the user) if the subject doesn't have enough questions, rather
    than spawning a room that would silently "start" with too few/no
    questions — the root cause of the old instant "Game Over" bug.
    """
    question_types = list(QuestionType.values)
    split = _default_tier_split(subject, topic, question_types, question_count)
    total = sum(split.values())

    return GameSettings.objects.create(
        room=room,
        subject=subject,
        topic=topic,
        question_count=total,
        easy_count=split[Tier.EASY],
        medium_count=split[Tier.MEDIUM],
        hard_count=split[Tier.HARD],
        easy_time_limit=DEFAULT_TIER_TIME_LIMITS[Tier.EASY],
        medium_time_limit=DEFAULT_TIER_TIME_LIMITS[Tier.MEDIUM],
        hard_time_limit=DEFAULT_TIER_TIME_LIMITS[Tier.HARD],
        question_types=question_types,
    )


def populate_game_questions(room: GameRoom) -> list[GameQuestion]:
    """
    Locks in this room's question set. Call only once per room — callers
    should check `GameQuestion.objects.filter(room=room).exists()` first
    (see services._start_game_engine).
    """
    questions = select_questions(room.settings)
    return GameQuestion.objects.bulk_create(
        [GameQuestion(room=room, question=q, order=i) for i, q in enumerate(questions)]
    )
