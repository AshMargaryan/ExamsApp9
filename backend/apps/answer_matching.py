"""
Shared free-text answer matching for graded questions.

The question bank is written in Armenian/Russian school notation, where the
decimal separator is a comma (`2,5`, and `0{,}5` once it has been through
LaTeX). Plain `==` on the raw strings therefore marks a student who types the
mathematically identical `2.5` as wrong, which is a grading defect rather than
a student error.

`answers_match` compares in three widening tiers, none of which can ever accept
a numerically different value:

  1. normalised string equality (case, whitespace, LaTeX noise removed);
  2. numeric equality, with `,` and `.` both read as the decimal separator and
     trailing zeros ignored;
  3. the student's *leading* number against a numeric expected answer, so
     "2,5 մոլ" is accepted when the bank stores "2,5" and the question text
     already fixes the unit.

Deliberately NOT handled: unit correctness (the bank stores no unit alongside
the value, so there is nothing to check against) and algebraically equivalent
but textually different expressions.
"""
from __future__ import annotations

import re
from decimal import Decimal, InvalidOperation

# `0{,}5` is how the dataset encodes a decimal comma inside LaTeX.
_LATEX_COMMA = re.compile(r"\{\s*,\s*\}")
# `_` and braces are subscript markup: `C_4H_{10}O` and `C4H10O` are the same
# molecular formula, and only the second is typable on a student's keyboard.
_TEX_JUNK = re.compile(r"[\\${}_]+")
_WS = re.compile(r"\s+")

_NUMBER = re.compile(r"[+-]?\d+(?:[.,]\d+)?")
_LEADING_NUMBER = re.compile(r"^\s*([+-]?\d+(?:[.,]\d+)?)")


def normalize_answer(text) -> str:
    """Case/whitespace/LaTeX-insensitive form used for tier-1 comparison."""
    if text is None:
        return ""
    s = _LATEX_COMMA.sub(",", str(text))
    s = _TEX_JUNK.sub("", s)
    s = s.replace("−", "-").replace("–", "-").replace("—", "-")
    s = _WS.sub(" ", s).strip().lower()
    return s


def to_decimal(text) -> Decimal | None:
    """Parses a bare number written with either decimal separator."""
    s = normalize_answer(text).replace(" ", "")
    if not s:
        return None
    s = s.replace(",", ".")
    if s.startswith("+"):
        s = s[1:]
    if not re.fullmatch(r"-?\d+(\.\d+)?", s):
        return None
    try:
        return Decimal(s)
    except InvalidOperation:
        return None


def leading_decimal(text) -> Decimal | None:
    """The number a student's answer starts with, e.g. '2,5 մոլ' -> 2.5."""
    s = normalize_answer(text)
    m = _LEADING_NUMBER.match(s)
    if not m:
        return None
    return to_decimal(m.group(1))


def answers_match(user_text, correct_text) -> bool:
    """True when `user_text` is an acceptable rendering of `correct_text`."""
    user_norm = normalize_answer(user_text)
    correct_norm = normalize_answer(correct_text)
    if not user_norm or not correct_norm:
        return False

    if user_norm == correct_norm:
        return True

    correct_num = to_decimal(correct_text)
    if correct_num is None:
        return False

    user_num = to_decimal(user_text)
    if user_num is not None:
        return user_num == correct_num

    lead = leading_decimal(user_text)
    return lead is not None and lead == correct_num
