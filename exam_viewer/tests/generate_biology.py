# -*- coding: utf-8 -*-
"""
Biology mock-exam generator (Armenian Unified Entrance Examination style).

Exam #1 is hand-authored and fully verified. This script assembles the 70
questions into the exact JSON schema used by math/physics, validates them
(schema, distinct distractors, multi_statement label parsing, KaTeX on any
$...$ segment, well-formed figure_svg), and writes:

    backend/apps/mock_exams/data/exams/biology/armenian_entrance_biology_01.json

Mapping of official biology question types onto the 3 schema types
(no viewer code changes):
  * single_choice  -> single_choice  (Q1-40)
  * matching       -> free_response  (compact digit answer + full 2-column table in text)
  * ordering       -> free_response  (step list in text + sequence answer)
  * multi-select   -> multi_statement (per-statement Ճիշտ/Սխալ)
  * true/false      -> multi_statement
  * numeric        -> free_response
"""
import json
import os
import re
import xml.dom.minidom

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.abspath(os.path.join(HERE, "..", "..", "backend", "apps",
                                   "mock_exams", "data", "exams", "biology"))

ARM_LETTERS = "ԱԲԳԴԵԶԷԸԹԺԻԼԽԾԿՀՁՂՃՄ"          # option / statement labels
VALID_DIFF = {"հեշտ", "միջին", "բարձր"}

# ---------------------------------------------------------------------------
# Builders — enforce the schema field order exactly.
# ---------------------------------------------------------------------------

def mc(number, topic, diff, question, options, correct, hint, steps, group=None, fig=None):
    """single_choice. `options` = list of 4 distinct strings; `correct` = the
    exact correct string (must be one of options)."""
    assert diff in VALID_DIFF, (number, diff)
    assert len(options) == 4, (number, "need 4 options", len(options))
    assert len(set(options)) == 4, (number, "duplicate options", options)
    assert correct in options, (number, "correct not among options", correct)
    letter = ARM_LETTERS[options.index(correct)]
    q = {
        "number": number, "topic": topic, "group": group, "type": "single_choice",
        "question": question, "difficulty": diff, "hint": hint,
        "solution_steps": steps, "options": options, "correct_option": letter,
    }
    if fig:
        q["figure_svg"] = fig
    return q


def fr(number, topic, diff, question, answer, hint, steps, group=None, fig=None):
    """free_response. `answer` = exact string the grader compares against."""
    assert diff in VALID_DIFF, (number, diff)
    assert isinstance(answer, str) and answer != "", (number, "empty answer")
    q = {
        "number": number, "topic": topic, "group": group, "type": "free_response",
        "question": question, "difficulty": diff, "hint": hint,
        "solution_steps": steps, "answer": answer,
    }
    if fig:
        q["figure_svg"] = fig
    return q


def ms(number, topic, diff, question, statements, true_idx, hint, steps, group=None, fig=None):
    """multi_statement. `statements` = list of plain strings (no label);
    `true_idx` = set/list of 0-based indices that are TRUE."""
    assert diff in VALID_DIFF, (number, diff)
    assert len(statements) >= 2, (number, "need >=2 statements")
    labels = [ARM_LETTERS[i] for i in range(len(statements))]
    labelled = [f"{labels[i]}) {s}" for i, s in enumerate(statements)]
    true_labels = [labels[i] for i in sorted(true_idx)]
    assert true_labels, (number, "no true statement")
    q = {
        "number": number, "topic": topic, "group": group, "type": "multi_statement",
        "question": question, "difficulty": diff, "hint": hint,
        "solution_steps": steps, "statements": labelled,
        "correct_option": join_labels(true_labels),
    }
    if fig:
        q["figure_svg"] = fig
    return q


def match(number, topic, diff, question, left, right, hint, steps, group=None):
    """matching. `left` = list of (label, text, target_number); `right` = list of
    strings (order i -> displayed number i+1). target_number is 1-based into right."""
    assert diff in VALID_DIFF, (number, diff)
    assert left and right, (number, "matching needs left and right")
    labels = [l[0] for l in left]
    assert len(set(labels)) == len(labels), (number, "duplicate left labels")
    for (lab, txt, tgt) in left:
        assert isinstance(tgt, int) and 1 <= tgt <= len(right), (number, lab, "bad target", tgt)
    return {
        "number": number, "topic": topic, "group": group, "type": "matching",
        "question": question, "difficulty": diff, "hint": hint, "solution_steps": steps,
        "left": [{"label": lab, "text": txt, "target": tgt} for (lab, txt, tgt) in left],
        "right": [{"text": r} for r in right],
    }


def join_labels(labels):
    """['Ա','Գ','Ե'] -> 'Ա, Գ և Ե'  |  ['Ա','Բ'] -> 'Ա և Բ'  |  ['Ա'] -> 'Ա'"""
    if len(labels) == 1:
        return labels[0]
    if len(labels) == 2:
        return f"{labels[0]} և {labels[1]}"
    return ", ".join(labels[:-1]) + f" և {labels[-1]}"


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------

def validate(exam, katex_check=True):
    errs = []
    nums = [q["number"] for q in exam["questions"]]
    if nums != list(range(1, len(nums) + 1)):
        errs.append(f"numbers not 1..N sequential: {nums}")
    if exam["question_count"] != len(exam["questions"]):
        errs.append("question_count mismatch")

    seg_re = re.compile(r"\$([^$]*)\$")
    katex_segs = []
    for q in exam["questions"]:
        n = q["number"]
        for field in ("question", "hint"):
            for seg in seg_re.findall(q.get(field) or ""):
                katex_segs.append((n, seg))
        for s in q.get("solution_steps", []):
            for seg in seg_re.findall(s):
                katex_segs.append((n, seg))
        if q["type"] == "single_choice":
            for opt in q["options"]:
                for seg in seg_re.findall(opt):
                    katex_segs.append((n, seg))
            if q["correct_option"] not in ARM_LETTERS:
                errs.append(f"Q{n}: bad correct_option")
        elif q["type"] == "multi_statement":
            for st in q["statements"]:
                if not re.match(r"^[Ա-Ֆ]\)\s*", st):
                    errs.append(f"Q{n}: statement missing label: {st[:20]}")
                for seg in seg_re.findall(st):
                    katex_segs.append((n, seg))
            found = set(re.findall(r"[Ա-Ֆ]", q["correct_option"]))
            if not found:
                errs.append(f"Q{n}: multi_statement has no true labels")
        elif q["type"] == "free_response":
            if not q.get("answer"):
                errs.append(f"Q{n}: empty free_response answer")
        elif q["type"] == "matching":
            left = q.get("left") or []
            right = q.get("right") or []
            if not left or not right:
                errs.append(f"Q{n}: matching needs left and right")
            labels = [x.get("label") for x in left]
            if len(set(labels)) != len(labels):
                errs.append(f"Q{n}: duplicate matching labels")
            for x in left:
                tgt = x.get("target")
                if not (isinstance(tgt, int) and 1 <= tgt <= len(right)):
                    errs.append(f"Q{n}: bad target {tgt} for {x.get('label')}")
                for seg in seg_re.findall(x.get("text") or ""):
                    katex_segs.append((n, seg))
            for x in right:
                for seg in seg_re.findall(x.get("text") or ""):
                    katex_segs.append((n, seg))
        # figure_svg well-formed
        if q.get("figure_svg"):
            try:
                xml.dom.minidom.parseString(q["figure_svg"])
            except Exception as e:
                errs.append(f"Q{n}: bad SVG: {e}")
    return errs, katex_segs


def write_katex_segs(katex_segs, path):
    with open(path, "w", encoding="utf-8") as f:
        json.dump([{"n": n, "seg": s} for n, s in katex_segs], f, ensure_ascii=False)


# ---------------------------------------------------------------------------
# Exam assembly (questions imported from build_bio_01)
# ---------------------------------------------------------------------------

def emit(exam, idx):
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, f"armenian_entrance_biology_{idx:02d}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(exam, f, ensure_ascii=False, indent=2)
    return path


if __name__ == "__main__":
    from bio_exam_01 import build
    questions = build(mc, fr, ms, match)
    exam = {
        "exam_id": "AEE-BIO-001",
        "title": "Միասնական քննություն — Կենսաբանություն (թեստ 1)",
        "question_count": len(questions),
        "subject": "biology",
        "questions": questions,
    }
    errs, katex_segs = validate(exam)
    write_katex_segs(katex_segs, os.path.join(HERE, "_katex_segs.json"))
    if errs:
        print("VALIDATION ERRORS:")
        for e in errs:
            print("  -", e)
        raise SystemExit(1)
    path = emit(exam, 1)
    print(f"OK: {len(exam['questions'])} questions -> {path}")
    print(f"KaTeX segments to check: {len(katex_segs)}")
