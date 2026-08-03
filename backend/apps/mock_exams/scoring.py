"""
Shared answer-scoring logic for Mock Exams — mirrors apps.practice.scoring
but against this app's own models, plus the raw-score -> 20-point conversion.
"""
from .models import MockExamQuestion, MockExamQuestionType


def score_answer(question: MockExamQuestion, answer_data: dict) -> dict:
    """
    Scores one answer against `question`. Returns a dict shaped like
    MockExamAnswer's own fields so callers can persist it directly.
    """
    qtype = question.question_type

    if qtype == MockExamQuestionType.SINGLE_CHOICE:
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

    if qtype == MockExamQuestionType.FREE_RESPONSE:
        user_text = answer_data.get("answer_text", "").strip().lower()
        correct = question.correct_answer_text.strip().lower()
        is_correct = bool(user_text) and user_text == correct
        return dict(
            is_correct=is_correct, selected_choice=None,
            answer_text=answer_data.get("answer_text", ""), selected_statement_ids=[],
        )

    if qtype == MockExamQuestionType.MULTI_STATEMENT:
        selected_ids = set(answer_data.get("selected_statement_ids", []))
        correct_ids = set(question.statements.filter(is_true=True).values_list("id", flat=True))
        is_correct = selected_ids == correct_ids
        return dict(
            is_correct=is_correct, selected_choice=None,
            answer_text="", selected_statement_ids=list(selected_ids),
        )

    if qtype == MockExamQuestionType.MATCHING:
        # pairs: {statement_id (str): choice_id (int)}. Correct iff EVERY left
        # item is connected to the right item whose number (order+1) == match_target.
        pairs = answer_data.get("match_pairs") or {}
        pairs = {str(k): v for k, v in pairs.items()}
        choice_number = {c.id: c.order + 1 for c in question.choices.all()}
        statements = list(question.statements.all())
        is_correct = bool(statements)
        for st in statements:
            cid = pairs.get(str(st.id))
            if cid is None or choice_number.get(cid) != st.match_target:
                is_correct = False
                break
        return dict(
            is_correct=is_correct, selected_choice=None,
            answer_text="", selected_statement_ids=[], match_pairs=pairs,
        )

    raise ValueError(f"Unknown question type: {qtype}")


def _tier_probabilities(q: int) -> tuple[float, float, float]:
    """
    q = raw number of correctly-answered questions (0-65). Returns
    (P(E), P(M), P(H)), clamped to >=0 and renormalized to sum to 1.

    Raw P(E) can exceed 1 (and raw P(M) go negative) at very low q — e.g.
    q=0 gives raw P(E)=1.033 — so a clamp-then-renormalize pass is required
    on top of the base formula, not just P(M) = 1 - P(E) - P(H).
    """
    p_easy = max(0.0, 1 - (q - 1) / 30)
    p_hard = max(0.0, (q - 25) / 40)
    p_medium = max(0.0, 1 - p_easy - p_hard)

    total = p_easy + p_medium + p_hard
    if total <= 0:
        return 1.0, 0.0, 0.0
    return p_easy / total, p_medium / total, p_hard / total


def compute_scaled_score(
    raw_score: int,
    easy_correct: int, easy_total: int,
    medium_correct: int, medium_total: int,
    hard_correct: int, hard_total: int,
) -> float:
    """20-point score = 20 * weighted average of per-difficulty accuracy,
    weighted by difficulty probabilities derived from the overall raw score."""
    p_easy, p_medium, p_hard = _tier_probabilities(raw_score)

    acc_easy = easy_correct / easy_total if easy_total else 0.0
    acc_medium = medium_correct / medium_total if medium_total else 0.0
    acc_hard = hard_correct / hard_total if hard_total else 0.0

    score = 20 * (p_easy * acc_easy + p_medium * acc_medium + p_hard * acc_hard)
    return round(min(20.0, max(0.0, score)), 2)
