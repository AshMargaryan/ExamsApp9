"""
Question-selection engine for multiplayer competition rooms. Pulls from the
existing apps.practice dataset — nothing here is subject-specific, so adding
a new Subject/Topic there makes it selectable here with no code change.
"""
import random

from django.db.models import Count

from apps.practice.models import Question, Tier

from .models import GameQuestion, GameRoom, GameSettings

TIER_LABELS_HY = {
    Tier.EASY: "հեշտ",
    Tier.MEDIUM: "միջին",
    Tier.HARD: "դժվար",
}


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
