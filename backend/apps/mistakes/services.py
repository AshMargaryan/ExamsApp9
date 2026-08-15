"""
Snapshot builders for the Mistake Notebook. `record_mistake` is shared by
apps.practice and apps.mock_exams, since both apps' question models expose
the same shape (.choices/.statements with text/order, is_correct/is_true,
plus .text/.hint) for the question types they have in common — only
`question_type` strings differ per app (multiple_choice vs single_choice,
short_answer vs free_response, true_false vs multi_statement), and mock
exams add a fourth type (matching) practice doesn't have.
"""
from .models import MistakeEntry, MistakeEntrySource, MistakeType

NO_ANSWER = "(չպատասխանված)"


def was_attempted(answer_data: dict) -> bool:
    """True if the student actually submitted something for this question,
    as opposed to leaving it blank (e.g. finishing a mock exam early)."""
    return bool(
        answer_data.get("selected_choice_id")
        or answer_data.get("answer_text")
        or answer_data.get("selected_statement_ids")
        or answer_data.get("match_pairs")
    )


def _choice_snapshot(question, answer_data):
    choices = list(question.choices.all())
    selected_id = answer_data.get("selected_choice_id")
    selected = next((c for c in choices if c.id == selected_id), None) if selected_id else None
    your_answer = selected.text if selected else NO_ANSWER
    correct = next((c.text for c in choices if c.is_correct), "")
    render_data = {"choices": [{"id": c.id, "text": c.text, "order": c.order} for c in choices]}
    return your_answer, correct, render_data


def _text_snapshot(question, answer_data):
    your_answer = answer_data.get("answer_text", "").strip() or NO_ANSWER
    return your_answer, question.correct_answer_text, {}


def _statements_snapshot(question, answer_data):
    statements = list(question.statements.all())
    selected_ids = set(answer_data.get("selected_statement_ids", []))
    your_answer = "; ".join(
        f"{s.label}՝ {'Ճիշտ' if s.id in selected_ids else 'Սխալ'}" for s in statements
    ) or NO_ANSWER
    correct = "; ".join(f"{s.label}՝ {'Ճիշտ' if s.is_true else 'Սխալ'}" for s in statements)
    render_data = {
        "statements": [{"id": s.id, "label": s.label, "text": s.text, "order": s.order} for s in statements]
    }
    return your_answer, correct, render_data


def _matching_snapshot(question, answer_data):
    statements = list(question.statements.all())  # left items (label + match_target)
    choices = list(question.choices.all())  # right items, number = order + 1
    choice_by_number = {c.order + 1: c for c in choices}
    match_pairs = answer_data.get("match_pairs") or {}

    def choice_for(statement):
        chosen_id = match_pairs.get(str(statement.id)) or match_pairs.get(statement.id)
        return next((c for c in choices if c.id == chosen_id), None)

    your_parts, correct_parts = [], []
    for s in statements:
        chosen = choice_for(s)
        your_parts.append(f"{s.label}→{chosen.text if chosen else '?'}")
        correct_choice = choice_by_number.get(s.match_target)
        correct_parts.append(f"{s.label}→{correct_choice.text if correct_choice else '?'}")

    render_data = {
        "left": [{"id": s.id, "label": s.label, "text": s.text, "order": s.order} for s in statements],
        "right": [{"id": c.id, "text": c.text, "order": c.order} for c in choices],
    }
    return "; ".join(your_parts), "; ".join(correct_parts), render_data


_SNAPSHOT_BUILDERS = {
    "multiple_choice": _choice_snapshot,
    "single_choice": _choice_snapshot,
    "short_answer": _text_snapshot,
    "free_response": _text_snapshot,
    "true_false": _statements_snapshot,
    "multi_statement": _statements_snapshot,
    "matching": _matching_snapshot,
}


def record_mistake(user, *, source, subject_name, topic_label, question, question_type,
                    answer_data, explanation="", hint=""):
    """Logs one incorrect answer to a practice.Question or
    mock_exams.MockExamQuestion. `answer_data` is the same dict already
    passed to that app's score_answer()."""
    build = _SNAPSHOT_BUILDERS[question_type]
    your_answer, correct_answer, render_data = build(question, answer_data)
    mistake_type = MistakeType.INCORRECT if was_attempted(answer_data) else MistakeType.NOT_ATTEMPTED
    MistakeEntry.objects.create(
        user=user, source=source, mistake_type=mistake_type,
        subject_name=subject_name, topic_label=topic_label or "",
        question_type=question_type, question_text=question.text, render_data=render_data,
        your_answer_text=your_answer, correct_answer_text=correct_answer,
        explanation=explanation, hint=hint or getattr(question, "hint", ""),
        content_object=question,
    )


def record_flashcard_mistake(user, card):
    """Logs a flashcard graded "again" (the student didn't know it)."""
    MistakeEntry.objects.create(
        user=user, source=MistakeEntrySource.FLASHCARD,
        subject_name=card.deck.get_subject_display(), topic_label=card.topic or card.deck.title,
        question_type="flashcard", question_text=card.front_text,
        render_data={"back_text": card.back_text, "translation": card.translation},
        your_answer_text=NO_ANSWER, correct_answer_text=card.back_text,
        explanation=card.explanation, hint=card.hint,
        content_object=card,
    )
