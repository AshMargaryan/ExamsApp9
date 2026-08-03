from apps.mock_exams.models import MockExamAttempt, MockExamAttemptStatus
from apps.practice.models import PracticeAttempt, Tier

from .models import AssignmentType, ConnectionStatus, TeacherStudentConnection


def accepted_student_count(teacher) -> int:
    return TeacherStudentConnection.objects.filter(
        teacher=teacher, status=ConnectionStatus.ACCEPTED, active=True
    ).count()


def is_connected(teacher, student) -> bool:
    return TeacherStudentConnection.objects.filter(
        teacher=teacher, student=student, status=ConnectionStatus.ACCEPTED, active=True
    ).exists()


def is_content_complete(assignment) -> bool:
    """
    Whether the student has actually finished the underlying problems for
    this assignment — gates the "submit" action, but never mutates status
    itself (that's the student's/teacher's call via submit/review).
    """
    if assignment.assignment_type == AssignmentType.SUBTOPIC:
        return PracticeAttempt.objects.filter(
            user=assignment.student, subtopic=assignment.subtopic,
            completed_at__isnull=False, revealed_answers=False,
        ).exists()

    if assignment.assignment_type == AssignmentType.TOPIC:
        subtopic_ids = set(assignment.topic.subtopics.values_list("id", flat=True))
        if not subtopic_ids:
            return False
        completed_subtopic_ids = set(
            PracticeAttempt.objects.filter(
                user=assignment.student, subtopic_id__in=subtopic_ids,
                completed_at__isnull=False, revealed_answers=False,
            ).values_list("subtopic_id", flat=True)
        )
        return subtopic_ids <= completed_subtopic_ids

    return MockExamAttempt.objects.filter(
        user=assignment.student, exam=assignment.mock_exam, status=MockExamAttemptStatus.COMPLETED,
    ).exists()


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
            "label": f"{attempt.subtopic.name} ({attempt.get_tier_display()})",
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


def build_problem_sets(assignment) -> list[dict]:
    """Per-question breakdown for the teacher's (or student's own) review page."""
    if assignment.assignment_type == AssignmentType.SUBTOPIC:
        return _practice_problem_sets(assignment, [assignment.subtopic])
    if assignment.assignment_type == AssignmentType.TOPIC:
        return _practice_problem_sets(assignment, assignment.topic.subtopics.all())
    return _mock_exam_problem_sets(assignment)