from django.db.models import Count, Q
from django.utils import timezone

from apps.activity.models import StudySession
from apps.activity.services import IDLE_THRESHOLD
from apps.mistakes.models import MistakeEntry
from apps.mock_exams.models import MockExamAttempt, MockExamAttemptStatus
from apps.practice.models import PracticeAttempt, Tier

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
    return {
        "id": question.id,
        "text": question.text,
        "question_type": question.question_type,
        "choices": [
            {"id": c.id, "text": c.text, "is_correct": c.is_correct}
            for c in question.choices.all()
        ],
        "statements": [
            {"id": s.id, "label": s.label, "text": s.text, "is_true": s.is_true}
            for s in question.statements.all()
        ],
        "correct_answer_text": question.correct_answer_text or None,
        "selected_choice_id": answer.selected_choice_id if answer else None,
        "answer_text": answer.answer_text if answer else "",
        "selected_statement_ids": answer.selected_statement_ids if answer else [],
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
