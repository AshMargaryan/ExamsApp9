# -*- coding: utf-8 -*-
"""One-off repair: earlier generator code used the LaTeX '{,}' decimal-comma
escape (meant only for inside $...$) inside PLAIN question text too, so it
rendered literally as e.g. '38{,}9' instead of '38,9'. Also fixes any
free_response 'answer' fields that ended up with a period-decimal ('345.6')
instead of the Armenian comma a student would actually type ('345,6').
Fixes text OUTSIDE $...$ only — math segments correctly keep '{,}'.
"""
import json
import re
import sys

MATH_SPLIT = re.compile(r"(\$[^$]*\$)")


def fix_plain_text(s):
    if not s:
        return s
    parts = MATH_SPLIT.split(s)
    for i, part in enumerate(parts):
        if not (part.startswith("$") and part.endswith("$")):
            parts[i] = part.replace("{,}", ",")
    return "".join(parts)


def fix_answer(s):
    if not s:
        return s
    # plain decimal-period number, e.g. "345.6" -> "345,6"
    if re.fullmatch(r"-?\d+\.\d+", s):
        return s.replace(".", ",")
    return s


def main(path):
    exam = json.load(open(path, encoding="utf-8"))
    changed = 0
    for q in exam["questions"]:
        for field in ("question", "hint"):
            old = q.get(field)
            new = fix_plain_text(old) if old else old
            if new != old:
                q[field] = new
                changed += 1
        if "solution_steps" in q:
            new_steps = [fix_plain_text(s) for s in q["solution_steps"]]
            if new_steps != q["solution_steps"]:
                q["solution_steps"] = new_steps
                changed += 1
        if q.get("type") == "free_response" and "answer" in q:
            old = q["answer"]
            new = fix_answer(old)
            if new != old:
                print(f"  Q{q['number']}: answer {old!r} -> {new!r}")
                q["answer"] = new
                changed += 1
        if q.get("type") == "single_choice":
            new_opts = [fix_plain_text(o) for o in q.get("options", [])]
            if new_opts != q.get("options", []):
                q["options"] = new_opts
                changed += 1

    json.dump(exam, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"{path}: {changed} field(s) fixed")


if __name__ == "__main__":
    for p in sys.argv[1:]:
        main(p)
