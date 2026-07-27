"""
Shared answer-scoring logic for anything that grades a practice Question —
currently the solo practice flow (views.SubmitTierView) and the multiplayer
gameplay engine (apps.games).
"""
from .models import Question, QuestionType


def score_answer(question: Question, answer_data: dict) -> dict:
    """
    Scores one answer against `question`. Returns a dict shaped like
    AttemptAnswer/GameAnswer's own fields (is_correct, selected_choice,
    answer_text, selected_statement_ids) so callers can persist it directly.
    """
    qtype = question.question_type

    if qtype == QuestionType.MULTIPLE_CHOICE:
        choice = None
        is_correct = False
        choice_id = answer_data.get("selected_choice_id")
        if choice_id:
            choice = question.choices.filter(pk=choice_id).first()
            is_correct = bool(choice and choice.is_correct)
        return dict(
            is_correct=is_correct, selected_choice=choice,
            answer_text="", selected_statement_ids=[],
        )

    if qtype == QuestionType.SHORT_ANSWER:
        user_text = answer_data.get("answer_text", "").strip().lower()
        correct = question.correct_answer_text.strip().lower()
        is_correct = bool(user_text) and user_text == correct
        return dict(
            is_correct=is_correct, selected_choice=None,
            answer_text=answer_data.get("answer_text", ""), selected_statement_ids=[],
        )

    if qtype == QuestionType.TRUE_FALSE:
        selected_ids = set(answer_data.get("selected_statement_ids", []))
        correct_ids = set(question.statements.filter(is_true=True).values_list("id", flat=True))
        is_correct = selected_ids == correct_ids
        return dict(
            is_correct=is_correct, selected_choice=None,
            answer_text="", selected_statement_ids=list(selected_ids),
        )

    raise ValueError(f"Unknown question type: {qtype}")
