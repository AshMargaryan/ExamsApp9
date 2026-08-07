# -*- coding: utf-8 -*-
"""Driver: python3 build_eng_exam.py NN [--no-save]
Imports eng_exam_NN.py (must define build(b, seed_offset=13)), validates,
checks duplicates against the registry, and only writes the JSON +
persists the registry if everything is clean. If duplicates remain (rare
random collisions between exams' template-generated content), automatically
retries with a different seed_offset — no manual re-seeding needed."""
import sys, importlib, inspect
from eng_common import Builder, load_registry

SEED_OFFSETS = [13, 29, 41, 57, 73, 89, 101, 113, 137, 149]

def try_build(mod, exam_id, registry, seed_offset):
    b = Builder(exam_id, mod.TITLE, registry)
    if "seed_offset" in inspect.signature(mod.build).parameters:
        mod.build(b, seed_offset=seed_offset)
    else:
        mod.build(b)
    dupes = b.validate()
    return b, dupes

def main():
    args = sys.argv[1:]
    no_save = "--no-save" in args
    args = [a for a in args if a != "--no-save"]
    n = int(args[0])
    mod = importlib.import_module(f"eng_exam_{n:02d}")

    registry = load_registry()
    exam_id = f"AEE-ENG-{n:03d}"

    last_dupes = None
    for attempt, seed_offset in enumerate(SEED_OFFSETS, 1):
        b, dupes = try_build(mod, exam_id, registry, seed_offset)
        if not dupes:
            out_path = b.emit(save_registry_too=not no_save)
            note = "" if attempt == 1 else f" [seed_offset={seed_offset}, attempt {attempt}]"
            print(f"OK: wrote {out_path} ({len(b.cur)} questions, 0 duplicates){note}"
                  + (" [registry NOT saved --no-save]" if no_save else " [registry updated]"))
            return
        last_dupes = dupes

    print(f"DUPLICATES FOUND after {len(SEED_OFFSETS)} seed attempts ({len(last_dupes)}):")
    for kind, val in last_dupes[:30]:
        print(f"  [{kind}] {val}")
    if len(last_dupes) > 30:
        print(f"  ...and {len(last_dupes)-30} more")
    sys.exit(1)

if __name__ == "__main__":
    main()
