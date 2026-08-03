# -*- coding: utf-8 -*-
"""Build, validate, dedup-check, and emit one biology exam by index.
Usage: python3 build_bio_exam.py <N> [--seed S] [--no-save]
"""
import argparse
import importlib
import random
import sys

import bio_common as bc


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("n", type=int)
    ap.add_argument("--seed", type=int, default=None)
    ap.add_argument("--no-save", action="store_true", help="don't persist registry/uniq updates")
    args = ap.parse_args()

    mod = importlib.import_module(f"bio_exam_{args.n:02d}")
    seed = args.seed if args.seed is not None else args.n * 1000 + 7
    numeric_rng = random.Random(seed)
    numeric_uniq = bc.load_numeric_uniq()

    questions = mod.build(bc.mc, bc.fr, bc.ms, bc.match, numeric_rng, numeric_uniq)
    exam = bc.make_exam(args.n, questions)

    errs, katex_segs = bc.validate(exam)
    cyr = bc.scan_cyrillic(exam)

    registry = bc.load_registry()
    dupes = bc.check_and_register(exam, registry)

    print(f"=== Exam {args.n:02d} ({exam['exam_id']}) ===")
    print(f"questions: {len(exam['questions'])}")
    print(f"validation errors: {len(errs)}")
    for e in errs:
        print("  -", e)
    print(f"cyrillic chars: {len(cyr)}")
    print(f"katex segments: {len(katex_segs)}")
    print(f"cross-exam duplicate facts: {len(dupes)}")
    for d in dupes[:20]:
        print("  DUP:", d)

    import collections
    types = collections.Counter(q["type"] for q in exam["questions"])
    diffs = collections.Counter(q["difficulty"] for q in exam["questions"])
    print("types:", dict(types))
    print("difficulty:", dict(diffs))

    ok = not errs and not cyr and not dupes
    if ok:
        path = bc.emit(exam, args.n)
        print("EMITTED:", path)
        if not args.no_save:
            bc.save_registry(registry)
            bc.save_numeric_uniq(numeric_uniq)
            print("registry + numeric-uniq saved.")
    else:
        print("NOT EMITTED — fix errors above first.")
        sys.exit(1)

    # dump katex segs for external validate_katex.js check
    import json
    with open("_katex_segs.json", "w", encoding="utf-8") as f:
        json.dump([{"n": n, "seg": s} for n, s in katex_segs], f, ensure_ascii=False)


if __name__ == "__main__":
    main()
