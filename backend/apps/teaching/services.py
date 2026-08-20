from datetime import datetime, time, timedelta

from django.contrib.auth import get_user_model
from django.db.models import Avg, Count, Max, Q
from django.db.models.functions import TruncDate, TruncWeek
from django.utils import timezone

from apps.activity.models import StudySession
from apps.activity.services import IDLE_THRESHOLD
from apps.knowledge.models import TopicMastery
from apps.mistakes.models import MistakeEntry
from apps.mock_exams.models import MockExamAttempt, MockExamAttemptStatus
from apps.practice.models import AttemptAnswer, PracticeAttempt, Tier
from apps.streaks.models import LearningStreak

from .models import Assignment, AssignmentStatus, AssignmentType, ConnectionStatus, TeacherStudentConnection

# Armenian display labels for practice tiers — Tier.choices' human labels are
# English (admin-facing), so problem-set review text is built from this
# instead of get_tier_display().
TIER_LABELS_HY = {
    Tier.EASY: "Հեշտ",
    Tier.MEDIUM: "Միջին",
    Tier.HARD: "Դժվար",
}

ALL_TIERS = {Tier.EASY, Tier.MEDIUM, Tier.HARD}

# Scroll fraction close enough to "fully read" to count as 100% — browsers
# rarely let window.scrollY reach the exact theoretical max (subpixel
# rounding, overscroll, layout shifts), so a hard >=1.0 check would leave
# the reading portion permanently stuck just under it.
READ_THRESHOLD = 0.9


def accepted_student_count(teacher) -> int:
    return TeacherStudentConnection.objects.filter(
        teacher=teacher, status=ConnectionStatus.ACCEPTED, active=True
    ).count()


def is_connected(teacher, student) -> bool:
    return TeacherStudentConnection.objects.filter(
        teacher=teacher, student=student, status=ConnectionStatus.ACCEPTED, active=True
    ).exists()


def _since(assignment):
    """
    Progress/completion threshold: only practice work done after this point
    counts. Normally the assignment's creation time; bumped forward when the
    student redoes a rejected assignment (see AssignmentRedoView) so old
    completions from before the redo stop counting.
    """
    return assignment.progress_reset_at or assignment.created_at


def _completed_tiers(user, subtopic, since) -> set:
    return set(
        PracticeAttempt.objects.filter(
            user=user, subtopic=subtopic, completed_at__isnull=False, revealed_answers=False,
            completed_at__gte=since,
        ).values_list("tier", flat=True)
    )


def _subtopic_fully_done(user, subtopic, since) -> bool:
    return ALL_TIERS <= _completed_tiers(user, subtopic, since)


def _latest_mock_exam_attempt(assignment):
    """Latest attempt started after the assignment's progress threshold — same reset rule as practice tiers."""
    return (
        MockExamAttempt.objects.filter(
            user=assignment.student, exam=assignment.mock_exam, started_at__gte=_since(assignment),
        )
        .order_by("-started_at")
        .first()
    )


def is_content_complete(assignment) -> bool:
    """
    Whether the student has actually finished the underlying problems for
    this assignment — gates the "submit" action, but never mutates status
    itself (that's the student's/teacher's call via submit/review). A
    subtopic/topic only counts once every tier is completed, matching
    assignment_progress reaching 100.
    """
    since = _since(assignment)
    if assignment.assignment_type == AssignmentType.SUBTOPIC:
        return _subtopic_fully_done(assignment.student, assignment.subtopic, since)

    if assignment.assignment_type == AssignmentType.TOPIC:
        subtopics = list(assignment.topic.subtopics.all())
        if not subtopics:
            return False
        return all(_subtopic_fully_done(assignment.student, s, since) for s in subtopics)

    attempt = _latest_mock_exam_attempt(assignment)
    return attempt is not None and attempt.status == MockExamAttemptStatus.COMPLETED


def assignment_progress(assignment) -> int:
    """
    Rough completion percentage (0-100) for subtopic/topic assignments.
    Deliberately coarse — not meant to track every question. Not meaningful
    for mock_exam assignments — see mock_exam_status() instead.
    """
    since = _since(assignment)
    if assignment.assignment_type == AssignmentType.SUBTOPIC:
        subtopic = assignment.subtopic
        if subtopic.learning_material.strip():
            read_fraction = max(0.0, min(1.0, assignment.learning_progress))
            reading_pct = 25 if read_fraction >= READ_THRESHOLD else 25 * read_fraction
        else:
            reading_pct = 25
        tiers_done = _completed_tiers(assignment.student, subtopic, since)
        tier_pct = 25 * len(ALL_TIERS & tiers_done)
        return round(min(100.0, reading_pct + tier_pct))

    if assignment.assignment_type == AssignmentType.TOPIC:
        subtopics = list(assignment.topic.subtopics.all())
        if not subtopics:
            return 0
        done = sum(1 for s in subtopics if _subtopic_fully_done(assignment.student, s, since))
        return round(100 * done / len(subtopics))

    attempt = _latest_mock_exam_attempt(assignment)
    return 100 if attempt is not None and attempt.status == MockExamAttemptStatus.COMPLETED else 0


# An answer row exists for every question the draft-save touches (even ones
# left blank), so "a row exists" doesn't mean "the student answered it" —
# mirrors the actually-answered check FinishAttemptView uses when scoring.
_ANSWERED_LOOKUP = (
    Q(selected_choice__isnull=False)
    | ~Q(answer_text="")
    | ~Q(selected_statement_ids=[])
    | ~Q(match_pairs={})
)


def mock_exam_status(assignment) -> str | None:
    """
    Coarse status for a mock_exam assignment, shown to the teacher instead
    of a percentage: "not_started" | "started" | "drafted" | "completed".
    None for non-mock_exam assignments.
    """
    if assignment.assignment_type != AssignmentType.MOCK_EXAM:
        return None
    attempt = _latest_mock_exam_attempt(assignment)
    if attempt is None:
        return "not_started"
    if attempt.status == MockExamAttemptStatus.COMPLETED:
        return "completed"
    if attempt.answers.filter(_ANSWERED_LOOKUP).exists():
        return "drafted"
    return "started"


def _question_review(question, answer) -> dict:
    # `order`, `match_target` and `match_pairs` exist so the review page can
    # render a `matching` question as what it is. Without them it fell into
    # the statements branch and was drawn as a true/false list, printing
    # "Ճիշտ"/"Սխալ" beside each left-hand item from an `is_true` that
    # MockExamStatement's own docstring says is unused for matching items.
    # Practice questions have no matching type and their models carry
    # neither field, hence the getattr defaults.
    return {
        "id": question.id,
        "text": question.text,
        "question_type": question.question_type,
        "choices": [
            {"id": c.id, "text": c.text, "is_correct": c.is_correct, "order": c.order}
            for c in question.choices.all()
        ],
        "statements": [
            {
                "id": s.id,
                "label": s.label,
                "text": s.text,
                "is_true": s.is_true,
                "match_target": getattr(s, "match_target", None),
            }
            for s in question.statements.all()
        ],
        "correct_answer_text": question.correct_answer_text or None,
        "selected_choice_id": answer.selected_choice_id if answer else None,
        "answer_text": answer.answer_text if answer else "",
        "selected_statement_ids": answer.selected_statement_ids if answer else [],
        "match_pairs": getattr(answer, "match_pairs", None) or {} if answer else {},
        "is_correct": answer.is_correct if answer else False,
    }


def _practice_problem_sets(assignment, subtopics) -> list[dict]:
    problem_sets = []
    attempts = (
        PracticeAttempt.objects.filter(
            user=assignment.student, subtopic__in=subtopics, completed_at__isnull=False, revealed_answers=False,
            completed_at__gte=_since(assignment),
        )
        .select_related("subtopic")
        .prefetch_related("answers__question__choices", "answers__question__statements")
        .order_by("subtopic__order", "tier")
    )
    tier_order = {Tier.EASY: 0, Tier.MEDIUM: 1, Tier.HARD: 2}
    for attempt in sorted(attempts, key=lambda a: (a.subtopic.order, tier_order.get(a.tier, 99))):
        answers_by_question = {a.question_id: a for a in attempt.answers.all()}
        questions = attempt.subtopic.questions.filter(tier=attempt.tier).prefetch_related("choices", "statements")
        problem_sets.append({
            "label": f"{attempt.subtopic.name} ({TIER_LABELS_HY.get(attempt.tier, attempt.tier)})",
            "score": attempt.score,
            "questions": [
                _question_review(q, answers_by_question.get(q.id)) for q in questions
            ],
        })
    return problem_sets


def _mock_exam_problem_sets(assignment) -> list[dict]:
    attempt = (
        MockExamAttempt.objects.filter(
            user=assignment.student, exam=assignment.mock_exam, status=MockExamAttemptStatus.COMPLETED,
            started_at__gte=_since(assignment),
        )
        .order_by("-completed_at")
        .first()
    )
    if attempt is None:
        return []

    answers_by_question = {a.question_id: a for a in attempt.answers.all()}
    questions = attempt.exam.questions.prefetch_related("choices", "statements")
    return [{
        "label": attempt.exam.title,
        "score": attempt.scaled_score,
        "questions": [_question_review(q, answers_by_question.get(q.id)) for q in questions],
    }]


def roster_student_ids(teacher) -> list[int]:
    return list(
        TeacherStudentConnection.objects.filter(
            teacher=teacher, status=ConnectionStatus.ACCEPTED, active=True
        ).values_list("student_id", flat=True)
    )


def dashboard_stats(teacher, student_ids: list[int]) -> dict:
    """Top-strip numbers for the teacher home page."""
    now = timezone.now()
    pending_review_count = Assignment.objects.filter(
        teacher=teacher, status=AssignmentStatus.SUBMITTED
    ).count()
    overdue_count = Assignment.objects.filter(
        teacher=teacher,
        due_date__isnull=False,
        due_date__lt=now,
        status__in=[AssignmentStatus.ASSIGNED, AssignmentStatus.IN_PROGRESS],
    ).count()
    online_now_count = StudySession.objects.filter(
        user_id__in=student_ids, ended_at__isnull=True, last_activity_at__gte=now - IDLE_THRESHOLD
    ).values("user_id").distinct().count()
    return {
        "student_count": len(student_ids),
        "pending_review_count": pending_review_count,
        "overdue_count": overdue_count,
        "online_now_count": online_now_count,
    }


def pending_review_queue(teacher, limit: int = 20):
    """Submitted assignments awaiting the teacher's decision, oldest first (most urgent)."""
    return (
        Assignment.objects.filter(teacher=teacher, status=AssignmentStatus.SUBMITTED)
        .select_related("student__profile", "mock_exam", "topic", "subtopic")
        .order_by("submitted_at")[:limit]
    )


def class_weak_spots(student_ids: list[int], limit: int = 6) -> list[dict]:
    """
    Where the class struggles most: mistake-log entries across all connected
    students, grouped by subject/topic. Both INCORRECT and NOT_ATTEMPTED
    count — a blank answer is a gap too, not just a wrong one.
    """
    rows = (
        MistakeEntry.objects.filter(user_id__in=student_ids)
        .values("subject_name", "topic_label")
        .annotate(count=Count("id"))
        .order_by("-count")[:limit]
    )
    return [
        {
            "subject_name": row["subject_name"],
            "topic_label": row["topic_label"],
            "count": row["count"],
        }
        for row in rows
    ]


def recent_activity_feed(teacher, student_ids: list[int], limit: int = 15) -> list[dict]:
    """
    Chronological feed merging assignment lifecycle events (submitted,
    approved, sent back for rework) and new students joining the roster.
    Built from existing timestamp fields rather than a dedicated event log,
    since those already fully capture "what happened when" for this teacher.
    """
    events = []

    submitted = Assignment.objects.filter(
        teacher=teacher, submitted_at__isnull=False
    ).select_related("student__profile").order_by("-submitted_at")[:limit]
    for a in submitted:
        events.append({"type": "submitted", "at": a.submitted_at, "student": a.student, "title": a.title})

    reviewed = Assignment.objects.filter(
        teacher=teacher, reviewed_at__isnull=False
    ).select_related("student__profile").order_by("-reviewed_at")[:limit]
    for a in reviewed:
        kind = "approved" if a.status == AssignmentStatus.COMPLETED else "rejected"
        events.append({"type": kind, "at": a.reviewed_at, "student": a.student, "title": a.title})

    joined = TeacherStudentConnection.objects.filter(
        teacher=teacher, status=ConnectionStatus.ACCEPTED, active=True, accepted_at__isnull=False
    ).select_related("student__profile").order_by("-accepted_at")[:limit]
    for c in joined:
        events.append({"type": "joined", "at": c.accepted_at, "student": c.student, "title": ""})

    events.sort(key=lambda e: e["at"], reverse=True)
    return events[:limit]


def build_problem_sets(assignment) -> list[dict]:
    """Per-question breakdown for the teacher's (or student's own) review page."""
    if assignment.assignment_type == AssignmentType.SUBTOPIC:
        return _practice_problem_sets(assignment, [assignment.subtopic])
    if assignment.assignment_type == AssignmentType.TOPIC:
        return _practice_problem_sets(assignment, assignment.topic.subtopics.all())
    return _mock_exam_problem_sets(assignment)


# ---------------------------------------------------------------------------
# Class analytics
#
# Everything below is computed from timestamps that genuinely exist. Notably
# absent, because the data does not support them: XP over time (MonthlyXP is
# monthly and mutated in place, with no transaction ledger), rank over time
# (RankHistory is only written when a student personally opens a leaderboard,
# so it's absent for anyone who doesn't), and mastery/streak over time (both
# store current state only, with no snapshots). A chart of any of those would
# be fabricated, so none is offered.
# ---------------------------------------------------------------------------

# range key -> (days back, bucket granularity)
TREND_RANGES = {
    "week": (7, "day"),
    "month": (30, "day"),
    "semester": (126, "week"),
}
DEFAULT_TREND_RANGE = "month"

# Below this many answers in a week, a week-over-week accuracy comparison is
# noise rather than a trend.
MIN_ANSWERS_FOR_ACCURACY_TREND = 5
ACCURACY_DROP_THRESHOLD = 10.0
INACTIVE_DAYS = 7
REPEATED_MISTAKE_MIN = 3
REPEATED_MISTAKE_WINDOW_DAYS = 30
WEAK_MASTERY_THRESHOLD = 50.0
WEAK_MASTERY_MIN_ATTEMPTS = 3
LOW_TEST_SCORE_THRESHOLD = 50.0


def _bucket_start(d, granularity: str):
    """Monday-anchored for weekly buckets, so a bucket key from Python matches
    what TruncWeek produced in SQL."""
    return d - timedelta(days=d.weekday()) if granularity == "week" else d


def _start_of_day(d):
    """Local midnight on `d`, as an aware datetime for timestamp filtering."""
    return timezone.make_aware(datetime.combine(d, time.min), timezone.get_current_timezone())


def class_trends(student_ids: list[int], range_key: str = DEFAULT_TREND_RANGE) -> dict:
    """
    Class-wide activity over time, bucketed server-side.

    Empty buckets are returned explicitly with null accuracy / null exam score
    rather than zeros, so the chart can show "no data that day" instead of
    implying the class scored 0%.
    """
    if range_key not in TREND_RANGES:
        range_key = DEFAULT_TREND_RANGE
    days_back, granularity = TREND_RANGES[range_key]

    today = timezone.localdate()
    start_date = _bucket_start(today - timedelta(days=days_back - 1), granularity)
    start_dt = _start_of_day(start_date)

    trunc = TruncWeek if granularity == "week" else TruncDate

    # Build the full bucket skeleton up front so gaps stay visible.
    buckets: dict = {}
    step = timedelta(days=7 if granularity == "week" else 1)
    cursor = start_date
    while cursor <= today:
        buckets[cursor] = {
            "date": cursor.isoformat(),
            "questions": 0,
            "correct": 0,
            "accuracy": None,
            "study_minutes": 0,
            "active_students": 0,
            "mistakes": 0,
            "exam_avg_score": None,
            "exam_count": 0,
        }
        cursor += step

    if not student_ids:
        return {"range": range_key, "granularity": granularity, "buckets": list(buckets.values())}

    # Practice answers -> volume + accuracy.
    answer_rows = (
        AttemptAnswer.objects.filter(
            attempt__user_id__in=student_ids,
            attempt__completed_at__isnull=False,
            attempt__revealed_answers=False,
            answered_at__gte=start_dt,
        )
        .annotate(bucket=trunc("answered_at"))
        .values("bucket")
        .annotate(questions=Count("id"), correct=Count("id", filter=Q(is_correct=True)))
    )
    for row in answer_rows:
        b = buckets.get(row["bucket"])
        if b is None:
            continue
        b["questions"] = row["questions"]
        b["correct"] = row["correct"]
        b["accuracy"] = round(100 * row["correct"] / row["questions"], 1) if row["questions"] else None

    # Mistake log -> how much the class is getting wrong. Append-only and never
    # deduped, so these counts are honest.
    for row in (
        MistakeEntry.objects.filter(user_id__in=student_ids, created_at__gte=start_dt)
        .annotate(bucket=trunc("created_at"))
        .values("bucket")
        .annotate(count=Count("id"))
    ):
        b = buckets.get(row["bucket"])
        if b is not None:
            b["mistakes"] = row["count"]

    # Completed mock exams -> average scaled score. Usually sparse: most
    # students sit only a handful of exams, so most buckets stay null.
    for row in (
        MockExamAttempt.objects.filter(
            user_id__in=student_ids,
            status=MockExamAttemptStatus.COMPLETED,
            completed_at__gte=start_dt,
            scaled_score__isnull=False,
        )
        .annotate(bucket=trunc("completed_at"))
        .values("bucket")
        .annotate(avg_score=Avg("scaled_score"), count=Count("id"))
    ):
        b = buckets.get(row["bucket"])
        if b is not None:
            b["exam_avg_score"] = round(row["avg_score"], 1)
            b["exam_count"] = row["count"]

    # Study sessions -> minutes and distinct active students. Bucketed in
    # Python because a session's length is (end - start) rather than a stored
    # column; a session spanning midnight is attributed to the day it began,
    # matching the approximation apps.profiles.analytics already uses.
    actives: dict = {}
    for session in StudySession.objects.filter(
        user_id__in=student_ids, started_at__gte=start_dt
    ).values("user_id", "started_at", "last_activity_at", "ended_at"):
        key = _bucket_start(timezone.localtime(session["started_at"]).date(), granularity)
        b = buckets.get(key)
        if b is None:
            continue
        finish = session["ended_at"] or session["last_activity_at"]
        b["study_minutes"] += max(0, round((finish - session["started_at"]).total_seconds() / 60))
        actives.setdefault(key, set()).add(session["user_id"])
    for key, users in actives.items():
        buckets[key]["active_students"] = len(users)

    return {"range": range_key, "granularity": granularity, "buckets": list(buckets.values())}


def _weekly_accuracy_drops(student_ids: list[int]) -> dict:
    """{user_id: (drop_points, latest_accuracy)} for students whose accuracy fell
    week-over-week. One query for the whole roster.

    Caveat worth knowing: AttemptAnswer rows are updated in place on a retake
    while keeping their original answered_at, so an old week's accuracy can
    shift retroactively. Good enough to flag a trend, not an audit record."""
    two_weeks_ago = timezone.now() - timedelta(days=14)
    rows = (
        AttemptAnswer.objects.filter(
            attempt__user_id__in=student_ids,
            attempt__completed_at__isnull=False,
            attempt__revealed_answers=False,
            answered_at__gte=two_weeks_ago,
        )
        .annotate(bucket=TruncWeek("answered_at"))
        .values("attempt__user_id", "bucket")
        .annotate(total=Count("id"), correct=Count("id", filter=Q(is_correct=True)))
    )

    per_user: dict = {}
    for row in rows:
        per_user.setdefault(row["attempt__user_id"], []).append(row)

    drops = {}
    for user_id, user_rows in per_user.items():
        user_rows.sort(key=lambda r: r["bucket"])
        if len(user_rows) < 2:
            continue
        prior, latest = user_rows[-2], user_rows[-1]
        if min(prior["total"], latest["total"]) < MIN_ANSWERS_FOR_ACCURACY_TREND:
            continue
        prior_acc = 100 * prior["correct"] / prior["total"]
        latest_acc = 100 * latest["correct"] / latest["total"]
        drop = prior_acc - latest_acc
        if drop >= ACCURACY_DROP_THRESHOLD:
            drops[user_id] = (round(drop, 1), round(latest_acc, 1))
    return drops


def students_needing_attention(teacher, student_ids: list[int]) -> list[dict]:
    """
    Students showing at least one concrete warning sign, each returned with the
    evidence that flagged them so the teacher sees *why*, not just a red dot.

    Only signals backed by real data are checked. Deliberately excluded:
    rank drops (RankHistory is too sparse to be trustworthy), XP decline (no
    ledger), and error-type profiles (error_category is only filled in when a
    student personally asks for classification, so it's overwhelmingly unset).

    A student with no signal is omitted entirely rather than listed as "fine" —
    this is a worklist, not a roster.
    """
    if not student_ids:
        return []

    now = timezone.now()
    today = timezone.localdate()
    signals: dict = {sid: [] for sid in student_ids}

    # --- Inactivity -------------------------------------------------------
    last_session = {
        row["user_id"]: row["last"]
        for row in StudySession.objects.filter(user_id__in=student_ids)
        .values("user_id")
        .annotate(last=Max("last_activity_at"))
    }
    streak_by_user = {
        s.user_id: s for s in LearningStreak.objects.filter(user_id__in=student_ids)
    }
    for sid in student_ids:
        candidates = []
        if sid in last_session and last_session[sid]:
            candidates.append(timezone.localtime(last_session[sid]).date())
        streak = streak_by_user.get(sid)
        if streak and streak.last_activity_date:
            candidates.append(streak.last_activity_date)
        if not candidates:
            signals[sid].append({
                "kind": "never_active",
                "label": "Դեռ չի սկսել սովորել",
                "value": None,
                "detail": "Ակտիվություն դեռ չի գրանցվել։",
            })
            continue
        days_idle = (today - max(candidates)).days
        if days_idle >= INACTIVE_DAYS:
            signals[sid].append({
                "kind": "inactive",
                "label": "Վաղուց ակտիվ չէ",
                "value": days_idle,
                "detail": f"Վերջին ակտիվությունը՝ {days_idle} օր առաջ։",
            })

    # --- Accuracy decline -------------------------------------------------
    for user_id, (drop, latest) in _weekly_accuracy_drops(student_ids).items():
        signals[user_id].append({
            "kind": "accuracy_drop",
            "label": "Ճշգրտությունն ընկնում է",
            "value": drop,
            "detail": f"{latest}% այս շաբաթ ({drop} տոկոսային կետով ցածր)։",
        })

    # --- Repeated mistakes on one topic -----------------------------------
    window_start = now - timedelta(days=REPEATED_MISTAKE_WINDOW_DAYS)
    worst_topic: dict = {}
    for row in (
        MistakeEntry.objects.filter(user_id__in=student_ids, created_at__gte=window_start)
        .values("user_id", "subject_name", "topic_label")
        .annotate(count=Count("id"))
        .order_by("-count")
    ):
        if row["count"] < REPEATED_MISTAKE_MIN or row["user_id"] in worst_topic:
            continue
        worst_topic[row["user_id"]] = row
    for user_id, row in worst_topic.items():
        topic = row["topic_label"] or row["subject_name"]
        signals[user_id].append({
            "kind": "repeated_mistakes",
            "label": "Կրկնվող սխալներ",
            "value": row["count"],
            "detail": f"{topic} — {row['count']} սխալ վերջին ամսում։",
        })

    # --- Weak topic (FK-backed mastery, practice subjects only) -----------
    seen_weak = set()
    for tm in (
        TopicMastery.objects.filter(
            user_id__in=student_ids,
            mastery_score__isnull=False,
            mastery_score__lt=WEAK_MASTERY_THRESHOLD,
            attempts_count__gte=WEAK_MASTERY_MIN_ATTEMPTS,
        )
        .select_related("subtopic")
        .order_by("mastery_score")
    ):
        if tm.user_id in seen_weak:
            continue
        seen_weak.add(tm.user_id)
        signals[tm.user_id].append({
            "kind": "weak_topic",
            "label": "Թույլ թեմա",
            "value": round(tm.mastery_score, 1),
            "detail": f"{tm.subtopic.name} — {round(tm.mastery_score)}% յուրացում։",
        })

    # --- Poor most-recent mock exam ---------------------------------------
    seen_exam = set()
    for attempt in (
        MockExamAttempt.objects.filter(
            user_id__in=student_ids,
            status=MockExamAttemptStatus.COMPLETED,
            scaled_score__isnull=False,
        )
        .select_related("exam")
        .order_by("-completed_at")
    ):
        if attempt.user_id in seen_exam:
            continue
        seen_exam.add(attempt.user_id)
        if attempt.scaled_score < LOW_TEST_SCORE_THRESHOLD:
            signals[attempt.user_id].append({
                "kind": "low_test_score",
                "label": "Ցածր թեստի արդյունք",
                "value": round(attempt.scaled_score, 1),
                "detail": f"{attempt.exam.title} — {round(attempt.scaled_score)} միավոր։",
            })

    # --- Overdue assignments ----------------------------------------------
    for row in (
        Assignment.objects.filter(
            teacher=teacher,
            student_id__in=student_ids,
            due_date__isnull=False,
            due_date__lt=now,
            status__in=[AssignmentStatus.ASSIGNED, AssignmentStatus.IN_PROGRESS],
        )
        .values("student_id")
        .annotate(count=Count("id"))
    ):
        signals[row["student_id"]].append({
            "kind": "overdue_assignment",
            "label": "Ուշացած առաջադրանք",
            "value": row["count"],
            "detail": f"{row['count']} առաջադրանք ժամկետանց է։",
        })

    flagged_ids = [sid for sid, s in signals.items() if s]
    if not flagged_ids:
        return []

    user_by_id = {
        u.id: u
        for u in get_user_model().objects.filter(id__in=flagged_ids).select_related("profile")
    }

    rows = [
        {"student": user_by_id[sid], "signals": signals[sid]}
        for sid in flagged_ids
        if sid in user_by_id
    ]
    # Most-signals first: the students in the deepest trouble lead the list.
    rows.sort(key=lambda r: len(r["signals"]), reverse=True)
    return rows
