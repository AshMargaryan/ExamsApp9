# -*- coding: utf-8 -*-
"""Assemble biology exams from bio_bank.py pools + bio_common numeric
generators. Consumes bank items (removing them so nothing is reused across
exams), builds N exams' worth of 70-question JSON, validates, and emits.

Usage: python3 bio_assemble.py <start_n> <end_n_inclusive>
"""
import importlib
import random
import sys

import bio_common as bc


BANK_MODULES = ["bio_bank", "bio_bank2", "bio_bank3", "bio_bank4", "bio_bank5",
                "bio_bank6", "bio_bank7", "bio_bank8", "bio_bank9", "bio_bank10"]


def load_bank():
    sc, match, ordr, ms = [], [], [], []
    for name in BANK_MODULES:
        try:
            mod = importlib.import_module(name)
        except ModuleNotFoundError:
            continue
        importlib.reload(mod)
        sc += list(getattr(mod, "SC", []))
        match += list(getattr(mod, "MATCH", []))
        ordr += list(getattr(mod, "ORD", []))
        ms += list(getattr(mod, "MS", []))
    return sc, match, ordr, ms


def sc_to_mc(item, number, group=None):
    topic, diff, question, options, correct_idx, hint, steps = item
    return bc.mc(number, topic, diff, question, options, options[correct_idx], hint, steps, group=group)


def match_to_match(item, number, group=None):
    topic, diff, question, left, right, hint, steps = item
    return bc.match(number, topic, diff, question, left, right, hint, steps, group=group)


def ord_to_match(item, number, group=None):
    topic, diff, question, left, hint, steps = item
    n = len(left)
    return bc.match(number, topic, diff, question, left, bc.positions(n), hint, steps, group=group)


def ms_to_ms(item, number, group=None):
    topic, diff, question, statements, true_idx, hint, steps = item
    return bc.ms(number, topic, diff, question, statements, true_idx, hint, steps, group=group)


TARGET_DIFFICULTY = {"հեշտ": 10, "միջին": 46, "բարձր": 14}  # out of 70, ~ exam 1's ratio


def rebalance_difficulty(questions, rng):
    """The bank content skews harder than exam 1's ratio. Downgrade excess
    'բարձր' (and, if it ever happens, excess 'հեշտ') toward 'միջին' so every
    assembled exam's difficulty spread stays realistic, without touching any
    question content/correctness — only the difficulty label."""
    by_diff = {"հեշտ": [], "միջին": [], "բարձր": []}
    for q in questions:
        by_diff[q["difficulty"]].append(q)

    # too many hard -> downgrade random excess to medium
    excess_hard = len(by_diff["բարձր"]) - TARGET_DIFFICULTY["բարձր"]
    if excess_hard > 0:
        pool = list(by_diff["բարձր"])
        rng.shuffle(pool)
        for q in pool[:excess_hard]:
            q["difficulty"] = "միջին"

    # too many easy -> upgrade random excess to medium
    excess_easy = len(by_diff["հեշտ"]) - TARGET_DIFFICULTY["հեշտ"]
    if excess_easy > 0:
        pool = list(by_diff["հեշտ"])
        rng.shuffle(pool)
        for q in pool[:excess_easy]:
            q["difficulty"] = "միջին"


def build_one_exam(n, sc_pool, match_pool, ord_pool, ms_pool, registry, numeric_uniq, rng):
    """Attempt to build exam `n` entirely on LOCAL COPIES of every mutable
    input (pools, registry, numeric_uniq) — nothing touches the caller's
    real state. Returns (exam_or_None, errs, commit_fn). Call commit_fn()
    only if exam is not None and you intend to keep it; it then (and only
    then) applies the pool-removals / registry-additions / numeric-param
    reservations to the real shared state. This makes a failed or rejected
    build a true no-op — no wasted bank items, no falsely-reserved facts."""
    local_sc = list(sc_pool)
    local_match = list(match_pool)
    local_ord = list(ord_pool)
    local_ms = list(ms_pool)
    local_registry_additions = set()
    local_numeric_uniq = set(numeric_uniq)  # generators add to this directly

    removed = {"sc": [], "match": [], "ord": [], "ms": []}
    Q = []
    num = 1

    def take(pool, pool_key, need, converter):
        nonlocal num
        rng.shuffle(pool)
        taken = 0
        i = 0
        while taken < need and i < len(pool):
            item = pool[i]
            q = converter(item, num)
            probe_exam = {"questions": [q]}
            dupes = bc._fingerprints(probe_exam)
            collide = any(fp in registry or fp in local_registry_additions for fp in dupes)
            if collide:
                i += 1
                continue
            pool.pop(i)
            removed[pool_key].append(item)
            Q.append(q)
            local_registry_additions.update(dupes)
            num += 1
            taken += 1
        return taken

    n_sc = take(local_sc, "sc", 36, sc_to_mc)
    if n_sc < 36:
        return None, [f"exam {n}: only {n_sc}/36 single_choice available in bank"], None

    qa, qb = bc.gen_genetics_two_child(rng, local_numeric_uniq, num, num + 1, f"g{num}")
    Q.append(qa); Q.append(qb); num += 2
    qc, qd = bc.gen_macronutrient_energy(rng, local_numeric_uniq, num, num + 1, f"g{num}")
    Q.append(qc); Q.append(qd); num += 2

    n_match = take(local_match, "match", 5, match_to_match)
    if n_match < 5:
        return None, [f"exam {n}: only {n_match}/5 matching sets available in bank"], None

    n_ord = take(local_ord, "ord", 7, ord_to_match)
    if n_ord < 7:
        return None, [f"exam {n}: only {n_ord}/7 ordering sets available in bank"], None

    n_ms1 = take(local_ms, "ms", 6, ms_to_ms)
    if n_ms1 < 6:
        return None, [f"exam {n}: only {n_ms1}/6 (of 8) multi_statement sets available in bank"], None

    Q.append(bc.gen_energy_pyramid(rng, local_numeric_uniq, num)); num += 1
    qc1, qc2, qc3 = bc.gen_chargaff(rng, local_numeric_uniq, num, num + 1, num + 2, f"g{num}")
    Q.append(qc1); Q.append(qc2); Q.append(qc3); num += 3
    qbl1, qbl2 = bc.gen_blood_type(rng, local_numeric_uniq, num, num + 1, f"g{num}")
    Q.append(qbl1); Q.append(qbl2); num += 2
    qh1, qh2, qh3 = bc.gen_heart_physiology(rng, local_numeric_uniq, num, num + 1, num + 2, f"g{num}")
    Q.append(qh1); Q.append(qh2); Q.append(qh3); num += 3
    Q.append(bc.gen_atp_energy(rng, local_numeric_uniq, num)); num += 1

    n_ms2 = take(local_ms, "ms", 2, ms_to_ms)
    if n_ms2 < 2:
        return None, [f"exam {n}: only {n_ms2}/2 (final) multi_statement sets available in bank"], None

    rebalance_difficulty(Q, rng)

    for i, q in enumerate(Q, start=1):
        q["number"] = i

    exam = bc.make_exam(n, Q)
    errs, katex_segs = bc.validate(exam)
    cyr = bc.scan_cyrillic(exam)
    if cyr:
        errs.append(f"cyrillic chars found: {cyr[:5]}")
    if errs:
        return None, errs, None

    def commit():
        for item in removed["sc"]:
            sc_pool.remove(item)
        for item in removed["match"]:
            match_pool.remove(item)
        for item in removed["ord"]:
            ord_pool.remove(item)
        for item in removed["ms"]:
            ms_pool.remove(item)
        registry.update(local_registry_additions)
        numeric_uniq.update(local_numeric_uniq)

    return exam, [], commit


def build_reuse(n, sc_bank, match_bank, ord_bank, ms_bank, numeric_uniq, rng):
    """Reuse mode: each exam independently samples from the FULL bank (with a
    per-exam seed) — questions may recur ACROSS exams, but each exam is a
    complete, internally-unique, shuffled 70-question test. Numeric slots stay
    correct-by-construction and non-repeating via the persisted numeric_uniq."""
    Q = []
    num = 1

    def pick(bank, k):
        return rng.sample(bank, k)

    for item in pick(sc_bank, 36):
        Q.append(sc_to_mc(item, num)); num += 1

    qa, qb = bc.gen_genetics_two_child(rng, numeric_uniq, num, num + 1, f"g{num}"); Q += [qa, qb]; num += 2
    qc, qd = bc.gen_macronutrient_energy(rng, numeric_uniq, num, num + 1, f"g{num}"); Q += [qc, qd]; num += 2

    for item in pick(match_bank, 5):
        Q.append(match_to_match(item, num)); num += 1
    for item in pick(ord_bank, 7):
        Q.append(ord_to_match(item, num)); num += 1

    ms_pick = pick(ms_bank, 8)
    for item in ms_pick[:6]:
        Q.append(ms_to_ms(item, num)); num += 1

    Q.append(bc.gen_energy_pyramid(rng, numeric_uniq, num)); num += 1
    qc1, qc2, qc3 = bc.gen_chargaff(rng, numeric_uniq, num, num + 1, num + 2, f"g{num}"); Q += [qc1, qc2, qc3]; num += 3
    qbl1, qbl2 = bc.gen_blood_type(rng, numeric_uniq, num, num + 1, f"g{num}"); Q += [qbl1, qbl2]; num += 2
    qh1, qh2, qh3 = bc.gen_heart_physiology(rng, numeric_uniq, num, num + 1, num + 2, f"g{num}"); Q += [qh1, qh2, qh3]; num += 3
    Q.append(bc.gen_atp_energy(rng, numeric_uniq, num)); num += 1

    for item in ms_pick[6:]:
        Q.append(ms_to_ms(item, num)); num += 1

    rebalance_difficulty(Q, rng)
    for i, q in enumerate(Q, start=1):
        q["number"] = i

    exam = bc.make_exam(n, Q)
    errs, katex_segs = bc.validate(exam)
    cyr = bc.scan_cyrillic(exam)
    if cyr:
        errs.append(f"cyrillic: {cyr[:5]}")
    return exam, errs


def main_reuse(start_n, end_n):
    sc_bank, match_bank, ord_bank, ms_bank = load_bank()
    print(f"Bank: {len(sc_bank)} SC, {len(match_bank)} MATCH, {len(ord_bank)} ORD, {len(ms_bank)} MS (REUSE mode)")
    numeric_uniq = bc.load_numeric_uniq()
    built = []
    for n in range(start_n, end_n + 1):
        rng = random.Random(n * 7919 + 13)
        exam, errs = build_reuse(n, sc_bank, match_bank, ord_bank, ms_bank, numeric_uniq, rng)
        if errs:
            print(f"exam {n}: ERRORS {errs}")
            break
        bc.emit(exam, n)
        built.append(n)
    bc.save_numeric_uniq(numeric_uniq)
    print(f"Built (reuse): {built}")


def main():
    if "--reuse" in sys.argv:
        args = [a for a in sys.argv[1:] if a != "--reuse"]
        main_reuse(int(args[0]), int(args[1]))
        return
    start_n = int(sys.argv[1])
    end_n = int(sys.argv[2])

    sc_pool, match_pool, ord_pool, ms_pool = load_bank()
    print(f"Bank loaded: {len(sc_pool)} SC, {len(match_pool)} MATCH, {len(ord_pool)} ORD, {len(ms_pool)} MS")

    registry = bc.load_registry()
    numeric_uniq = bc.load_numeric_uniq()

    built = []
    for n in range(start_n, end_n + 1):
        rng = random.Random(n * 7919 + 13)
        exam, errs, commit = build_one_exam(n, sc_pool, match_pool, ord_pool, ms_pool, registry, numeric_uniq, rng)
        if exam is None:
            print(f"STOP at exam {n}: {errs}")
            break
        commit()
        if errs:
            print(f"exam {n}: VALIDATION ERRORS: {errs}")
            break
        path = bc.emit(exam, n)
        built.append(n)
        print(f"exam {n} ({exam['exam_id']}): OK, 70 questions -> {path}")

    bc.save_registry(registry)
    bc.save_numeric_uniq(numeric_uniq)
    print(f"\nBuilt exams: {built}")
    print(f"Pools remaining: {len(sc_pool)} SC, {len(match_pool)} MATCH, {len(ord_pool)} ORD, {len(ms_pool)} MS")


if __name__ == "__main__":
    main()
