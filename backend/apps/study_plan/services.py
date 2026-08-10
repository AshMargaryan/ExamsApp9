"""
Builds each student's daily study plan. Task *selection* is fully
deterministic (real DB ids, real deep links — see the `_*_candidates`
helpers) so the feature works end-to-end regardless of which AI provider is
configured; task *narration* (headline + per-task blurb) is handed to the
configured provider via `_ai_narrate`, with a heuristic-text fallback used
whenever the provider's response can't be parsed as the requested JSON
(the expected outcome with `MockAIProvider`, which returns free text).
"""
import json
from collections import defaultdict
from datetime import timedelta

from django.db import IntegrityError, transaction
from django.db.models import Q
from django.utils import timezone

from apps.flashcards.models import FlashcardProgress, FlashcardProgressStatus, FlashcardReview
from apps.mistakes.models import MistakeEntry
from apps.mock_exams.models import MockExamAttempt, MockExamAttemptStatus
from apps.practice.models import PracticeAttempt
from apps.practice.services import get_recommended_subtopics

from .models import CheckInFeeling, DailyStudyPlan, StudyTask, StudyTaskType, TaskCheckIn

MAX_PER_TYPE = 2
MAX_TASKS = 6
MISTAKE_LOOKBACK_DAYS = 30
CHECK_IN_BOOST_DAYS = 3

FALLBACK_HEADLINE = "Այսօրվա անհատական ուսումնական պլանը պատրաստ է՝ կենտրոնացած քո թույլ կողմերի վրա։"


# ---------------------------------------------------------------------------
# Candidate builders — one per signal source, each returns plain dicts with
# real ids/link paths already resolved.
# ---------------------------------------------------------------------------

def _flashcard_candidates(user, limit=MAX_PER_TYPE):
    now = timezone.now()
    progresses = (
        FlashcardProgress.objects
        .filter(user=user)
        .exclude(status=FlashcardProgressStatus.KNOWN)
        .filter(Q(due_at__isnull=True) | Q(due_at__lte=now))
        .select_related("card__deck")
    )
    by_deck = defaultdict(list)
    for p in progresses:
        by_deck[p.card.deck].append(p)

    ranked = sorted(
        by_deck.items(),
        key=lambda kv: (-sum(1 for p in kv[1] if p.is_difficult), -len(kv[1])),
    )

    candidates = []
    for deck, deck_progresses in ranked[:limit]:
        count = min(len(deck_progresses), 15)
        candidates.append({
            "task_type": StudyTaskType.FLASHCARD_REVIEW,
            "subject_name": deck.get_subject_display(),
            "topic_label": deck.title,
            "title": f"Կրկնիր {count} բառաքարտ «{deck.title}» խմբից",
            "blurb": "Այս քարտերը ժամանակն է կրկնելու։",
            "link_path": f"/flashcards/{deck.id}",
            "target_id": deck.id,
            "target_count": count,
            "estimated_minutes": max(5, count // 2),
            "params": {},
        })
    return candidates


def _practice_candidates(user, limit=MAX_PER_TYPE):
    recs = get_recommended_subtopics(user, limit=limit)
    candidates = []
    for r in recs:
        tier = r["suggested_tier"]
        blurb = (
            f"Դու {r['mistake_count']} անգամ սխալվել ես այս թեմայում։"
            if r["mistake_count"] else "Այս թեման դեռ չես սկսել։"
        )
        candidates.append({
            "task_type": StudyTaskType.PRACTICE_WEAK_TOPIC,
            "subject_name": r["subject_name"],
            "topic_label": r["subtopic_name"],
            "title": f"Լուծիր վարժություններ «{r['subtopic_name']}» թեմայից",
            "blurb": blurb,
            "link_path": f"/practice/subtopic/{r['subtopic_id']}/{tier}",
            "target_id": r["subtopic_id"],
            "target_count": None,
            "estimated_minutes": 10,
            "params": {"tier": tier},
        })
    return candidates


def _mistake_candidates(user, limit=MAX_PER_TYPE):
    since = timezone.now() - timedelta(days=MISTAKE_LOOKBACK_DAYS)
    entries = (
        MistakeEntry.objects
        .filter(user=user, created_at__gte=since)
        .order_by("-created_at")
    )
    grouped = defaultdict(list)
    for e in entries:
        grouped[(e.subject_name, e.topic_label)].append(e)

    ranked = sorted(grouped.items(), key=lambda kv: -len(kv[1]))
    candidates = []
    for (subject_name, topic_label), group in ranked[:limit]:
        label = topic_label or subject_name
        candidates.append({
            "task_type": StudyTaskType.MISTAKE_RETRY,
            "subject_name": subject_name,
            "topic_label": topic_label,
            "title": f"Կրկնիր {len(group)} սխալ «{label}» թեմայից",
            "blurb": "Այս հարցերում սխալվել ես վերջերս, փորձիր նորից։",
            "link_path": "/mistake-notebook",
            "target_id": group[0].id,
            "target_count": None,
            "estimated_minutes": 5,
            "params": {"entry_ids": [e.id for e in group]},
        })
    return candidates


def _mock_exam_candidates(user, limit=MAX_PER_TYPE):
    attempts = (
        MockExamAttempt.objects
        .filter(user=user, status=MockExamAttemptStatus.COMPLETED)
        .select_related("exam")
        .order_by("exam_id", "-completed_at")
    )
    latest_by_exam = {}
    for a in attempts:
        latest_by_exam.setdefault(a.exam_id, a)

    scored = []
    for attempt in latest_by_exam.values():
        bands = [
            ("հեշտ", attempt.easy_correct, attempt.easy_total),
            ("միջին", attempt.medium_correct, attempt.medium_total),
            ("բարձր", attempt.hard_correct, attempt.hard_total),
        ]
        bands = [(name, c, t) for name, c, t in bands if t > 0]
        if not bands:
            continue
        weakest = min(bands, key=lambda b: b[1] / b[2])
        ratio = weakest[1] / weakest[2]
        scored.append((ratio, attempt, weakest))

    scored.sort(key=lambda item: item[0])
    candidates = []
    for ratio, attempt, (band_name, correct, total) in scored[:limit]:
        exam = attempt.exam
        candidates.append({
            "task_type": StudyTaskType.MOCK_EXAM_RETAKE,
            "subject_name": exam.get_subject_display(),
            "topic_label": exam.title,
            "title": f"Նորից փորձիր «{exam.title}»",
            "blurb": f"Վերջին փորձում ամենաթույլ արդյունքը եղել է {band_name} մակարդակի հարցերում։",
            "link_path": f"/mock-exams/{exam.id}/history",
            "target_id": exam.id,
            "target_count": None,
            "estimated_minutes": attempt.duration_minutes or 60,
            "params": {},
        })
    return candidates


def _recently_struggled_topics(user, days=CHECK_IN_BOOST_DAYS):
    """(subject_name, topic_label) pairs the student marked 'struggled' on
    recently — used to bump those topics back to the top of tomorrow's
    plan even when the raw mistake count alone wouldn't rank them first."""
    since = timezone.now() - timedelta(days=days)
    return set(
        TaskCheckIn.objects
        .filter(task__plan__user=user, feeling=CheckInFeeling.STRUGGLED, created_at__gte=since)
        .values_list("task__subject_name", "task__topic_label")
    )


def build_candidates(user):
    """Mistakes first (most urgent/recent), then weak practice topics, then
    flashcards, then mock exam retakes — capped to MAX_TASKS overall so the
    list stays a real daily plan, not a dump of every weak signal. Any topic
    recently marked 'struggled' via a check-in is then bumped to the front,
    preserving relative order otherwise (stable sort)."""
    candidates = (
        _mistake_candidates(user)
        + _practice_candidates(user)
        + _flashcard_candidates(user)
        + _mock_exam_candidates(user)
    )
    struggled = _recently_struggled_topics(user)
    if struggled:
        candidates.sort(key=lambda c: (c["subject_name"], c["topic_label"]) not in struggled)
    return candidates[:MAX_TASKS]


# ---------------------------------------------------------------------------
# AI narration — optional layer on top of the deterministic candidates.
# ---------------------------------------------------------------------------

def _student_context_lines(user):
    """Real facts about this student for the LLM to ground its coaching
    message in — never invented, always something already computed
    elsewhere (apps.profiles.analytics.coach(), apps.streaks). Keeps the
    message personal without a second LLM round trip."""
    from apps.profiles.analytics import coach as rule_based_coach
    from apps.streaks.models import LearningStreak

    lines = []

    streak = LearningStreak.objects.filter(user=user).first()
    if streak and streak.current_streak:
        lines.append(f"Ընթացիկ streak. {streak.current_streak} օր անընդմեջ ուսուցում։")

    evidence = rule_based_coach(user)
    if evidence.get("available"):
        e = evidence["evidence"]
        lines.append(
            f"Ամենաթույլ թեման. «{e['topic']}», {e['incorrect_count']} սխալ, "
            f"վերջին սխալների {e['mistake_share_percent']}%-ը։"
        )
        if e.get("accuracy_delta") is not None:
            lines.append(f"Ճշտության փոփոխություն նախորդ ամսվա նկատմամբ. {e['accuracy_delta']}%։")

    return lines


def _ai_narrate(user, candidates):
    if not candidates:
        return None

    from apps.ai_assistant.providers.base import AIMessage, AIRequest
    from apps.ai_assistant.services.ai_service import AIProviderError, AIService

    task_lines = [f"{i}. [{c['subject_name']}] {c['title']} — {c['blurb']}" for i, c in enumerate(candidates)]
    context_lines = _student_context_lines(user)
    context_block = (
        "\n\nԱշակերտի մասին իրական տվյալներ (օգտագործիր coach_message-ում, մի հորինիր նոր թվեր).\n"
        + "\n".join(context_lines)
        if context_lines else ""
    )
    prompt = (
        "Դու ջերմ, խրախուսող անհատական ուսումնական մենթոր ես, ով ուղղակի "
        "դիմում է աշակերտին («դու»)։ Ստորև աշակերտի այսօրվա առաջադրանքների "
        "ցանկն է՝ կազմված իր թույլ կողմերի հիման վրա։ Գրիր."
        "\n1) կարճ, խրախուսող վերնագիր (headline)"
        "\n2) 2-3 նախադասությամբ անհատականացված մենթորական հաղորդագրություն "
        "(coach_message)՝ հիմնված ստորև տրված իրական տվյալների վրա (streak, "
        "ամենաթույլ թեմա, միտում) — կոնկրետ, ջերմ, ոչ ընդհանրական։ Եթե տվյալներ "
        "չկան, գրիր ընդհանուր խրախուսական նախադասություն։"
        "\n3) յուրաքանչյուր առաջադրանքի համար մեկ նախադասությամբ բացատրություն "
        "(blurb)՝ ինչու է այն կարևոր։"
        "\nՊատասխանիր ԲԱՑԱՌԱՊԵՍ այս JSON ձևաչափով, առանց այլ տեքստի.\n"
        '{"headline": "...", "coach_message": "...", "tasks": [{"index": 0, "blurb": "..."}, ...]}'
        + context_block + "\n\n" + "\n".join(task_lines)
    )
    request = AIRequest(
        messages=[AIMessage(role="user", content=prompt)],
        system_prompt="You output strictly valid JSON matching the requested schema, and nothing else.",
    )
    try:
        response, _response_time_ms = AIService().generate(request)
        data = json.loads(response.content)
        headline = str(data["headline"])
        coach_message = str(data["coach_message"]).strip() if data.get("coach_message") else ""
        blurbs = {int(t["index"]): str(t["blurb"]) for t in data.get("tasks", [])}
        return headline, coach_message, blurbs
    except (AIProviderError, ValueError, KeyError, TypeError):
        return None


# ---------------------------------------------------------------------------
# Plan generation (get-or-create per user/day) and live completion status.
# ---------------------------------------------------------------------------

def generate_daily_plan(user, date=None):
    date = date or timezone.localdate()
    existing = (
        DailyStudyPlan.objects
        .filter(user=user, date=date)
        .prefetch_related("tasks")
        .first()
    )
    if existing:
        return existing

    candidates = build_candidates(user)
    narrated = _ai_narrate(user, candidates)
    headline, coach_message, blurbs = narrated if narrated else (FALLBACK_HEADLINE, "", {})

    try:
        with transaction.atomic():
            plan = DailyStudyPlan.objects.create(
                user=user, date=date, headline=headline, coach_message=coach_message,
            )
            StudyTask.objects.bulk_create([
                StudyTask(
                    plan=plan,
                    order=i,
                    task_type=c["task_type"],
                    subject_name=c["subject_name"],
                    topic_label=c["topic_label"],
                    title=c["title"],
                    blurb=blurbs.get(i, c["blurb"]),
                    link_path=c["link_path"],
                    target_id=c["target_id"],
                    target_count=c["target_count"],
                    estimated_minutes=c["estimated_minutes"],
                    params=c["params"],
                )
                for i, c in enumerate(candidates)
            ])
    except IntegrityError:
        # Lost a race against a concurrent request for the same (user, date).
        return DailyStudyPlan.objects.prefetch_related("tasks").get(user=user, date=date)

    return plan


def completion_status(task):
    """{"done": bool, "progress": "3/15" | None} derived live from the
    relevant app's own activity tables — never from a stored flag."""
    plan_date = task.plan.date
    user = task.plan.user

    if task.task_type == StudyTaskType.FLASHCARD_REVIEW:
        total = task.target_count or 1
        done_count = min(
            FlashcardReview.objects.filter(
                user=user, card__deck_id=task.target_id, reviewed_at__date=plan_date,
            ).count(),
            total,
        )
        return {"done": done_count >= total, "progress": f"{done_count}/{total}"}

    if task.task_type == StudyTaskType.PRACTICE_WEAK_TOPIC:
        done = PracticeAttempt.objects.filter(
            user=user, subtopic_id=task.target_id, tier=task.params.get("tier"),
            completed_at__date=plan_date,
        ).exists()
        return {"done": done, "progress": None}

    if task.task_type == StudyTaskType.MISTAKE_RETRY:
        entry_ids = task.params.get("entry_ids") or [task.target_id]
        done = MistakeEntry.objects.filter(
            id__in=entry_ids, user=user, last_retried_at__date=plan_date,
        ).exists()
        return {"done": done, "progress": None}

    if task.task_type == StudyTaskType.MOCK_EXAM_RETAKE:
        done = MockExamAttempt.objects.filter(
            user=user, exam_id=task.target_id,
            status=MockExamAttemptStatus.COMPLETED, completed_at__date=plan_date,
        ).exists()
        return {"done": done, "progress": None}

    return {"done": False, "progress": None}


class CheckInError(Exception):
    pass


def record_check_in(task, feeling):
    """Store (or update) this task's self-rating. Only allowed once the
    underlying activity is actually done — a check-in is a reflection on
    real work, not a way to influence tomorrow's plan without doing
    anything. Raises CheckInError on an invalid feeling or an incomplete
    task; callers translate that to a 400."""
    if feeling not in CheckInFeeling.values:
        raise CheckInError("invalid feeling")
    if not completion_status(task)["done"]:
        raise CheckInError("task not completed yet")

    check_in, _created = TaskCheckIn.objects.update_or_create(
        task=task, defaults={"feeling": feeling},
    )
    return check_in
