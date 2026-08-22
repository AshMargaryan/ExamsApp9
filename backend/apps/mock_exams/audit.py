"""
Content auditor for the mock-exam question bank.

Checks the *source JSON* (the import is idempotent, so JSON is the source of
truth) against the editorial contract:

  * language compliance   — Armenian for math/physics/chemistry/biology,
                            English for the English subject
  * question type vs answer format, and whether auto-grading can accept the
    mathematically correct answer
  * whether the solution actually *reaches* the stated final answer, rather
    than stopping at an intermediate threshold
  * min/max items where an integer/natural restriction must be applied on top
    of an inequality
  * Russian-school structural markers (given / find / formula / answer)

Findings are (code, severity, path, number, detail) tuples. Nothing here
rewrites content; `audit_content` only reports.
"""
from __future__ import annotations

import json
import re
import unicodedata
from dataclasses import dataclass, field
from pathlib import Path

# --------------------------------------------------------------------------
# Language
# --------------------------------------------------------------------------

ARMENIAN_SUBJECTS = {"math", "physics", "chemistry", "biology"}
LATIN_SUBJECTS = {"english"}
CYRILLIC_SUBJECTS = {"russian"}

_ARM = re.compile(r"[԰-֏]")
_CYR = re.compile(r"[Ѐ-ӿ]")
_LAT = re.compile(r"[A-Za-z]")

# Option/statement labels are single Armenian letters — "(Ա) __________" — and
# are part of the platform-wide answer-labelling scheme, not prose. Only runs
# of two or more letters count as a *word* in that script.
_ARM_WORD = re.compile(r"[԰-֏]{2,}")
_CYR_WORD = re.compile(r"[Ѐ-ӿ]{2,}")

# Inline/display math, and the LaTeX control words inside it, are
# language-neutral: a formula is not an English word.
_MATH = re.compile(r"\$[^$]*\$|\\\([^)]*\\\)|\\\[[^\]]*\\\]")
_LATEX_CMD = re.compile(r"\\[A-Za-z]+")

# Latin tokens that legitimately appear inside Armenian science text:
# symbols, units, element names, variables.
_ALLOWED_LATIN = {
    # units
    "m", "kg", "s", "a", "k", "mol", "cd", "n", "j", "w", "v", "c", "f", "t",
    "hz", "pa", "si", "ph", "atm", "l", "ml", "g", "mg", "km", "cm", "mm",
    # common variable / quantity symbols
    "x", "y", "z", "p", "q", "r", "e", "h", "u", "b", "d", "i", "o",
    "sin", "cos", "tg", "ctg", "tan", "log", "ln", "lim", "max", "min",
    "co", "no", "so", "nh", "ch", "oh", "hcl", "naoh", "caco", "dna", "rna",
    "atp", "adp", "nadp", "id", "atm",
}

_WORD = re.compile(r"[A-Za-z]{2,}")


def _strip_math(text: str) -> str:
    text = _MATH.sub(" ", text)
    return _LATEX_CMD.sub(" ", text)


def script_profile(text: str) -> dict:
    """Counts of letters by script, ignoring math and LaTeX commands."""
    bare = _strip_math(text)
    return {
        "arm": len(_ARM.findall(bare)),
        "cyr": len(_CYR.findall(bare)),
        "lat": len(_LAT.findall(bare)),
        # word counts ignore single letters used as enumeration labels
        "arm_words": len(_ARM_WORD.findall(bare)),
        "cyr_words": len(_CYR_WORD.findall(bare)),
        "bare": bare,
    }


def language_violation(subject: str, text: str) -> str | None:
    """
    Returns a human-readable reason when `text` is in the wrong language for
    `subject`, else None. Deliberately conservative: it only fires on whole
    fields that are clearly in the wrong script, not on stray symbols.
    """
    if not text or not text.strip():
        return None
    prof = script_profile(text)
    arm, cyr, lat = prof["arm_words"], prof["cyr_words"], prof["lat"]

    if subject in ARMENIAN_SUBJECTS:
        if arm == 0 and lat >= 15:
            words = [w.lower() for w in _WORD.findall(prof["bare"])]
            real = [w for w in words if w not in _ALLOWED_LATIN]
            if len(real) >= 3:
                return f"Armenian expected, field is Latin-only ({len(real)} non-symbol words)"
        if cyr >= 5 and arm == 0:
            return "Armenian expected, field is Cyrillic"
        return None

    if subject in LATIN_SUBJECTS:
        if arm >= 3:
            return f"English expected, field contains Armenian ({arm} Armenian letters)"
        if cyr >= 3:
            return "English expected, field contains Cyrillic"
        return None

    if subject in CYRILLIC_SUBJECTS:
        if cyr == 0 and (arm >= 5 or lat >= 15):
            return "Russian expected, field is not Cyrillic"
        return None

    return None


# --------------------------------------------------------------------------
# Numeric normalisation (also mirrors what grading *should* accept)
# --------------------------------------------------------------------------

# Armenian/Russian school notation writes decimals with a comma, and the
# dataset encodes it as LaTeX `0{,}5`.
_LATEX_COMMA = re.compile(r"\{\s*,\s*\}")
_TEX_JUNK = re.compile(r"[\\${}_\s]+")


def normalize_number(text: str) -> str:
    """
    Canonical form of a numeric answer: LaTeX stripped, decimal comma folded
    to a dot, trailing zeros dropped. Used both for auditing and as the basis
    for tolerant grading.
    """
    if text is None:
        return ""
    s = _LATEX_COMMA.sub(".", str(text))
    s = _TEX_JUNK.sub("", s)
    s = s.replace("−", "-").replace("–", "-")
    # a lone comma between digits is a decimal separator
    s = re.sub(r"(?<=\d),(?=\d)", ".", s)
    if re.fullmatch(r"-?\d+(\.\d+)?", s):
        if "." in s:
            s = s.rstrip("0").rstrip(".")
        return s or "0"
    return s.lower()


def is_numeric(text: str) -> bool:
    return bool(re.fullmatch(r"-?\d+(\.\d+)?", normalize_number(text)))


def numbers_in(text: str) -> set[str]:
    """Every number appearing in `text`, in canonical form."""
    s = _LATEX_COMMA.sub(".", text)
    s = s.replace("−", "-")
    out = set()
    for m in re.finditer(r"-?\d+(?:[.,]\d+)?", s):
        out.add(normalize_number(m.group(0)))
    return out


# --------------------------------------------------------------------------
# Min / max detection
# --------------------------------------------------------------------------

MINMAX_TERMS = [
    "ամենափոքր", "ամենամեծ", "փոքրագույն", "մեծագույն",
    "նվազագույն", "առավելագույն", "նվազագույնը", "առավելագույնը",
    "smallest", "largest", "minimum", "maximum", "least", "greatest",
]
INTEGER_TERMS = ["ամբողջ", "բնական", "integer", "natural", "whole"]


def has_minmax(text: str) -> bool:
    low = text.lower()
    return any(t in low for t in MINMAX_TERMS)


def has_integer_restriction(text: str) -> bool:
    low = text.lower()
    return any(t in low for t in INTEGER_TERMS)


# --------------------------------------------------------------------------
# Russian-school structural markers
# --------------------------------------------------------------------------

GIVEN_MARKERS = ["Տրված է", "Տրված՝", "Given", "Дано"]
FIND_MARKERS = ["Գտնել", "Որոշել", "Find", "Найти"]
ANSWER_MARKERS = ["Պատասխան", "Answer", "Ответ"]


def structure_flags(q: dict) -> set[str]:
    blob = "\n".join(q.get("solution_steps") or [])
    flags = set()
    if not any(m in blob for m in GIVEN_MARKERS):
        flags.add("no_given")
    if not any(m in blob for m in FIND_MARKERS):
        flags.add("no_find")
    if not any(m in blob for m in ANSWER_MARKERS):
        flags.add("no_answer_label")
    return flags


# --------------------------------------------------------------------------
# Per-question checks
# --------------------------------------------------------------------------

ARMENIAN_LETTERS = "ԱԲԳԴԵԶԷԸԹԺԻԼԽԾԿՀՁՂՃՄ"

TEXT_FIELDS = ("question", "hint")


@dataclass
class Finding:
    code: str
    severity: str  # critical | high | medium | low
    subject: str
    path: str
    number: int
    detail: str

    def as_row(self) -> tuple:
        return (self.severity, self.code, self.subject, self.path, self.number, self.detail)


@dataclass
class Auditor:
    findings: list[Finding] = field(default_factory=list)

    def add(self, code, severity, subject, path, number, detail):
        self.findings.append(Finding(code, severity, subject, path, number, detail))

    # -- individual checks -------------------------------------------------

    def check_language(self, subject, path, q):
        for f in TEXT_FIELDS:
            v = q.get(f) or ""
            reason = language_violation(subject, v)
            if reason:
                self.add("LANG", "high", subject, path, q["number"], f"{f}: {reason}")
        for i, step in enumerate(q.get("solution_steps") or []):
            reason = language_violation(subject, step)
            if reason:
                self.add("LANG", "high", subject, path, q["number"],
                         f"solution_steps[{i}]: {reason}")
        for i, opt in enumerate(q.get("options") or []):
            reason = language_violation(subject, opt)
            if reason:
                self.add("LANG", "medium", subject, path, q["number"],
                         f"options[{i}]: {reason}")

    def check_type_format(self, subject, path, q):
        qtype = q.get("type")
        n = q["number"]

        if qtype == "single_choice":
            opts = q.get("options") or []
            co = (q.get("correct_option") or "").strip()
            if len(opts) < 2:
                self.add("TYPE", "critical", subject, path, n,
                         f"single_choice with {len(opts)} options")
            if q.get("answer"):
                self.add("TYPE", "high", subject, path, n,
                         "single_choice also carries a free-text `answer`")
            if len(co) != 1 or co not in ARMENIAN_LETTERS:
                self.add("GRADE", "critical", subject, path, n,
                         f"correct_option {co!r} is not a single Armenian letter")
            else:
                idx = ARMENIAN_LETTERS.index(co)
                if idx >= len(opts):
                    self.add("GRADE", "critical", subject, path, n,
                             f"correct_option {co!r} -> index {idx} but only {len(opts)} options")
            dupes = {o for o in opts if opts.count(o) > 1}
            if dupes:
                self.add("TYPE", "high", subject, path, n,
                         f"duplicate options: {sorted(dupes)[:2]}")

        elif qtype == "free_response":
            ans = q.get("answer")
            if ans is None or not str(ans).strip():
                self.add("TYPE", "critical", subject, path, n, "free_response with empty answer")
            if q.get("options"):
                self.add("TYPE", "high", subject, path, n, "free_response carries `options`")

        elif qtype == "multi_statement":
            sts = q.get("statements") or []
            co = q.get("correct_option") or ""
            if len(sts) < 2:
                self.add("TYPE", "critical", subject, path, n,
                         f"multi_statement with {len(sts)} statements")
            labels = set()
            for s in sts:
                m = re.match(r"\s*([԰-֏])\s*\)", s)
                if m:
                    labels.add(m.group(1))
            cited = set(re.findall(r"[԰-֏]", co))
            # drop the Armenian conjunction "և" used as "and"
            cited.discard("և")
            stray = cited - labels
            if labels and stray:
                self.add("GRADE", "critical", subject, path, n,
                         f"correct_option cites {sorted(stray)} not among statement labels {sorted(labels)}")
            if not cited:
                self.add("GRADE", "critical", subject, path, n,
                         f"multi_statement correct_option {co!r} names no statement")

        elif qtype == "matching":
            left = q.get("left") or []
            right = q.get("right") or []
            if not left or not right:
                self.add("TYPE", "critical", subject, path, n, "matching missing left/right")
            for item in left:
                tgt = item.get("target")
                if not isinstance(tgt, int) or not (1 <= tgt <= len(right)):
                    self.add("GRADE", "critical", subject, path, n,
                             f"left {item.get('label')!r} target={tgt!r} outside 1..{len(right)}")
            labels = [i.get("label") for i in left]
            if len(set(labels)) != len(labels):
                self.add("TYPE", "high", subject, path, n, "duplicate left labels")
        else:
            self.add("TYPE", "critical", subject, path, n, f"unknown type {qtype!r}")

    def check_solution_reaches_answer(self, subject, path, q):
        """The defect class the brief calls out: solution stops at a threshold."""
        if q.get("type") != "free_response":
            return
        ans = str(q.get("answer") or "").strip()
        if not ans:
            return
        n = q["number"]
        steps = q.get("solution_steps") or []
        if not steps:
            self.add("SOLUTION", "critical", subject, path, n, "no solution steps")
            return

        canon = normalize_number(ans)
        blob = "\n".join(steps)
        found_anywhere = canon in numbers_in(blob) if is_numeric(ans) else canon in normalize_number(blob)
        last = normalize_number(steps[-1]) if not is_numeric(ans) else None
        found_last = (
            canon in numbers_in(steps[-1]) if is_numeric(ans)
            else (canon in (last or ""))
        )

        if not found_anywhere:
            sev = "critical" if has_minmax(q.get("question", "")) else "high"
            self.add("SOLUTION", sev, subject, path, n,
                     f"answer {ans!r} never appears in the solution")
        elif not found_last:
            sev = "high" if has_minmax(q.get("question", "")) else "medium"
            self.add("SOLUTION", sev, subject, path, n,
                     f"answer {ans!r} is not in the final step (stops mid-derivation)")

    def check_minmax(self, subject, path, q):
        text = q.get("question", "")
        if not has_minmax(text) or q.get("type") != "free_response":
            return
        ans = str(q.get("answer") or "")
        n = q["number"]
        steps = q.get("solution_steps") or []
        blob = "\n".join(steps)

        if has_integer_restriction(text) and not is_numeric(ans):
            self.add("MINMAX", "critical", subject, path, n,
                     f"integer/natural restriction but answer {ans!r} is not an integer")
        elif has_integer_restriction(text) and "." in normalize_number(ans):
            self.add("MINMAX", "critical", subject, path, n,
                     f"integer restriction but answer {ans!r} is a decimal")

        # A threshold appears in the derivation and the final answer differs
        # from it -> the transition must be spelled out for the student.
        if has_integer_restriction(text) and is_numeric(ans):
            thresholds = {x for x in numbers_in(blob) if "." in x}
            if thresholds and normalize_number(ans) not in numbers_in(blob):
                self.add("MINMAX", "critical", subject, path, n,
                         f"threshold(s) {sorted(thresholds)[:3]} shown but answer {ans!r} never derived")

    def check_grading_tolerance(self, subject, path, q):
        """Would a student typing the mathematically correct answer be accepted?"""
        if q.get("type") != "free_response":
            return
        ans = str(q.get("answer") or "")
        n = q["number"]
        if not ans:
            return
        raw = ans.strip()
        # A decimal comma is correct Armenian/Russian notation and
        # apps.answer_matching accepts the dot form too, so it is not a defect.
        if ans != raw or "  " in raw:
            self.add("GRADE", "medium", subject, path, n, f"answer {raw!r} has stray whitespace")
        if re.search(r"[\\${}_]", raw):
            self.add("GRADE", "high", subject, path, n,
                     f"answer {raw!r} contains LaTeX markup a student cannot type")

    def check_structure(self, subject, path, q):
        """Russian-school presentation markers."""
        n = q["number"]
        if not (q.get("hint") or "").strip():
            self.add("STRUCT", "medium", subject, path, n, "no hint")
        steps = q.get("solution_steps") or []
        if not steps:
            self.add("STRUCT", "high", subject, path, n, "no solution steps")
        elif len(steps) == 1 and q.get("difficulty") in ("միջին", "բարձր"):
            self.add("STRUCT", "medium", subject, path, n,
                     f"single-step solution for {q.get('difficulty')} item")
        flags = structure_flags(q)
        if "no_answer_label" in flags and q.get("type") == "free_response":
            self.add("STRUCT", "medium", subject, path, n,
                     "solution has no explicit «Պատասխան» (answer) separation")

    # -- driver ------------------------------------------------------------

    def audit_question(self, subject, path, q):
        self.check_language(subject, path, q)
        self.check_type_format(subject, path, q)
        self.check_solution_reaches_answer(subject, path, q)
        self.check_minmax(subject, path, q)
        self.check_grading_tolerance(subject, path, q)
        self.check_structure(subject, path, q)

    def audit_file(self, path: Path):
        data = json.loads(path.read_text(encoding="utf-8"))
        subject = data.get("subject") or path.parent.name
        seen = set()
        for q in data.get("questions", []):
            if q.get("number") in seen:
                self.add("DUP", "high", subject, path.name, q.get("number", -1),
                         "duplicate question number in file")
            seen.add(q.get("number"))
            self.audit_question(subject, path.name, q)
        declared = data.get("question_count")
        if declared is not None and declared != len(data.get("questions", [])):
            self.add("META", "high", subject, path.name, 0,
                     f"question_count={declared} but {len(data.get('questions', []))} questions")

    def audit_dir(self, root: Path):
        for f in sorted(root.rglob("*.json")):
            self.audit_file(f)
        return self.findings
