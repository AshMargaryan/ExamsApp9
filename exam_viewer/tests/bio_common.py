# -*- coding: utf-8 -*-
"""
Shared infrastructure for biology exams 2-50: the same mc/fr/ms/match
builders as exam 1, PLUS:
  - a cross-exam duplicate registry (exact-text dedup for conceptual
    questions/statements/matching-items, so exam N never repeats exam
    1..N-1's wording),
  - parameterized, seeded, correct-by-construction generators for the
    numeric slots (genetics probability, Chargaff's rule, energy pyramid,
    blood-type probability, heart physiology, ATP/glucose energy) so those
    stay verified-by-computation regardless of exam index, mirroring how
    generate_physics.py parameterizes physics numbers.
"""
import json
import math
import os
import random
import re
import xml.dom.minidom
from itertools import product

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.abspath(os.path.join(HERE, "..", "..", "backend", "apps",
                                   "mock_exams", "data", "exams", "biology"))
REGISTRY_PATH = os.path.join(HERE, "bio_used_facts.json")

ARM_LETTERS = "ԱԲԳԴԵԶԷԸԹԺԻԼԽԾԿՀՁՂՃՄ"
VALID_DIFF = {"հեշտ", "միջին", "բարձր"}


# ---------------------------------------------------------------------------
# Builders (identical semantics to generate_biology.py's mc/fr/ms/match)
# ---------------------------------------------------------------------------

def mc(number, topic, diff, question, options, correct, hint, steps, group=None, fig=None):
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


def join_labels(labels):
    if len(labels) == 1:
        return labels[0]
    if len(labels) == 2:
        return f"{labels[0]} և {labels[1]}"
    return ", ".join(labels[:-1]) + f" և {labels[-1]}"


def ms(number, topic, diff, question, statements, true_idx, hint, steps, group=None, fig=None):
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


def positions(n):
    return [""] * n


# ---------------------------------------------------------------------------
# Validation (same rules as generate_biology.py, generalized to any exam)
# ---------------------------------------------------------------------------

_MATH_SPLIT_RE = re.compile(r"(\$[^$]*\$)")


def _plain_text_parts(s):
    """Yield the non-$...$ chunks of s — where LaTeX escapes like '{,}'
    must never appear (they'd render as literal braces, not a comma)."""
    if not s:
        return
    for part in _MATH_SPLIT_RE.split(s):
        if not (part.startswith("$") and part.endswith("$")):
            yield part


def _check_leaked_latex(field_name, text, n, errs):
    for plain in _plain_text_parts(text):
        if "{,}" in plain or "{.}" in plain:
            errs.append(f"Q{n}: LaTeX decimal escape leaked into plain text ({field_name}): {plain[:40]!r}")


def validate(exam):
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
            _check_leaked_latex(field, q.get(field) or "", n, errs)
        for s in q.get("solution_steps", []):
            for seg in seg_re.findall(s):
                katex_segs.append((n, seg))
            _check_leaked_latex("solution_steps", s, n, errs)
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
            elif re.fullmatch(r"-?\d+\.\d+", q["answer"]):
                errs.append(f"Q{n}: free_response answer uses '.' decimal "
                             f"({q['answer']!r}) — students type Armenian ',' , use _arm_decimal_plain()")
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
        if q.get("figure_svg"):
            try:
                xml.dom.minidom.parseString(q["figure_svg"])
            except Exception as e:
                errs.append(f"Q{n}: bad SVG: {e}")
    return errs, katex_segs


CYR_RE = re.compile(r"[Ѐ-ӿ]")


def scan_cyrillic(exam):
    hits = []
    blob = json.dumps(exam, ensure_ascii=False)
    for m in CYR_RE.finditer(blob):
        hits.append(m.group())
    return hits


def emit(exam, idx):
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, f"armenian_entrance_biology_{idx:02d}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(exam, f, ensure_ascii=False, indent=2)
    return path


def make_exam(idx, questions):
    return {
        "exam_id": f"AEE-BIO-{idx:03d}",
        "title": f"Միասնական քննություն — Կենսաբանություն (թեստ {idx})",
        "question_count": len(questions),
        "subject": "biology",
        "questions": questions,
    }


# ---------------------------------------------------------------------------
# Cross-exam duplicate registry — exact-text dedup across ALL exams built so
# far (persisted to disk so it survives across separate script runs/batches).
# ---------------------------------------------------------------------------

SHORT_TERM_CHAR_LIMIT = 20  # e.g. "Օրգանիզմ", "Սիրտ", "Ինսուլին" — ordinary
# biology vocabulary that MUST recur across 50 exams as matching/ordering
# labels; only flag longer, more distinctive phrasing as a real duplicate.


def _fingerprints(exam):
    """Extract every learner-facing text unit worth deduping. Full question
    stems and full statement sentences are always checked (those repeating
    verbatim would be a real violation of the no-duplicate-questions rule).
    Short matching/ordering item labels are exempted below a length
    threshold, since single biology terms (organ names, vitamins, hormones)
    unavoidably and legitimately recur across 50 exams."""
    fps = []
    for q in exam["questions"]:
        if q["type"] == "single_choice":
            fps.append(("single_choice_q", q["question"].strip()))
        elif q["type"] == "free_response":
            fps.append(("free_response_q", q["question"].strip()))
        elif q["type"] == "multi_statement":
            for st in q["statements"]:
                text = re.sub(r"^[Ա-Ֆ]\)\s*", "", st).strip()
                if len(text) >= SHORT_TERM_CHAR_LIMIT:
                    fps.append(("statement", text))
        elif q["type"] == "matching":
            for x in q["left"]:
                text = x["text"].strip()
                if len(text) >= SHORT_TERM_CHAR_LIMIT:
                    fps.append(("match_left", text))
    return fps


def load_registry():
    if os.path.exists(REGISTRY_PATH):
        with open(REGISTRY_PATH, encoding="utf-8") as f:
            data = json.load(f)
        return set(tuple(x) for x in data)
    return set()


def save_registry(reg):
    with open(REGISTRY_PATH, "w", encoding="utf-8") as f:
        json.dump(sorted(list(t) for t in reg), f, ensure_ascii=False, indent=1)


NUMERIC_UNIQ_PATH = os.path.join(HERE, "bio_used_numeric_params.json")


def _to_hashable(x):
    """Recursively convert JSON-decoded lists back to tuples, so nested
    structures (e.g. gen_blood_type's key with a nested sorted-pair tuple)
    round-trip through JSON and remain hashable for set membership."""
    if isinstance(x, list):
        return tuple(_to_hashable(i) for i in x)
    return x


def load_numeric_uniq():
    if os.path.exists(NUMERIC_UNIQ_PATH):
        with open(NUMERIC_UNIQ_PATH, encoding="utf-8") as f:
            data = json.load(f)
        return set(_to_hashable(x) for x in data)
    return set()


def save_numeric_uniq(uniq_set):
    with open(NUMERIC_UNIQ_PATH, "w", encoding="utf-8") as f:
        json.dump(sorted([list(t) for t in uniq_set], key=str), f, ensure_ascii=False, indent=1)


def check_and_register(exam, registry):
    """Returns list of duplicate fingerprints found (against the registry
    BEFORE this exam is added), then adds this exam's fingerprints in."""
    fps = _fingerprints(exam)
    dupes = [fp for fp in fps if fp in registry]
    for fp in fps:
        registry.add(fp)
    return dupes


# ---------------------------------------------------------------------------
# Parameterized numeric generators — each returns fully-computed, verified
# values. `rng` is a random.Random seeded per-exam for reproducibility.
# `uniq_set` rejects exact parameter-tuple repeats across exams.
# ---------------------------------------------------------------------------

def uniq(key_tuple, uniq_set, tries=200):
    """Not a generator itself — caller loops until this returns True."""
    if key_tuple in uniq_set:
        return False
    uniq_set.add(key_tuple)
    return True


TRAIT_SCENARIOS = [
    ("սիսեռի սերմի գույնի", "դեղին", "կանաչ"),
    ("սիսեռի սերմի ձևի", "հարթ", "կնճռոտ"),
    ("սիսեռի ցողունի բարձրության", "բարձր", "ցածր"),
    ("ուտիճի աչքի գույնի", "կարմիր", "սպիտակ"),
    ("նապաստակի մորթու գույնի", "սև", "սպիտակ"),
    ("շան մորթու գույնի", "մուգ", "բաց"),
    ("ծաղկի (անտիրինումի) գույնի", "մանուշակագույն", "սպիտակ"),
    ("եգիպտացորենի հատիկի գույնի", "մանուշակագույն", "դեղին"),
    ("Drosophila-ի թևի ձևի", "նորմալ", "կարճ (վեստիգիալ)"),
    ("մարդու ականջի բլթակի", "ազատ կախված", "կպած"),
    ("մարդու լեզուն գլորելու ունակության", "առկա", "բացակա"),
    ("մարդու մատների միջև թաղանթի", "բացակա (նորմալ)", "առկա (սինդակտիլիա)"),
]


def _pick_4_fractions(rng, must_include, pool):
    """Return exactly 4 distinct Fractions: all of `must_include`, padded from
    `pool` (excluding ones already present). Always terminates — no
    open-ended while-loop — because `pool` is large and fixed up front."""
    chosen = list(dict.fromkeys(must_include))  # de-dup, preserve order
    remaining_pool = [f for f in pool if f not in chosen]
    rng.shuffle(remaining_pool)
    for f in remaining_pool:
        if len(chosen) >= 4:
            break
        chosen.append(f)
    if len(chosen) < 4:
        raise RuntimeError("fraction pool too small to fill 4 distinct options")
    chosen = chosen[:4]
    rng.shuffle(chosen)
    return chosen


def gen_genetics_two_child(rng, uniq_set, q_num_a, q_num_b, group):
    """Aa x aa test-cross, 2-4 children, binomial probability. Mirrors the
    Q37-38 pattern from exam 1 but with varied trait + child count + ask."""
    from fractions import Fraction

    for _ in range(300):
        scenario, dom_word, rec_word = rng.choice(TRAIT_SCENARIOS)
        n_children = rng.choice([2, 3, 4])
        k_dom = rng.randint(1, n_children - 1)
        key = (scenario, n_children, k_dom, "twoChild")
        if uniq(key, uniq_set):
            break
    else:
        raise RuntimeError("could not find unique genetics scenario")

    frac_exact = Fraction(math.comb(n_children, k_dom), 2 ** n_children)
    frac_all = Fraction(1, 2 ** n_children)

    def fmt(fr_):
        return f"${fr_.numerator}/{fr_.denominator}$"

    # Fixed, generous pool of plausible probability-fraction distractors —
    # large enough that picking 4 distinct values always succeeds.
    POOL = sorted(set(
        [Fraction(1, d) for d in (2, 4, 8, 16)]
        + [Fraction(3, d) for d in (4, 8, 16)]
        + [Fraction(5, d) for d in (8, 16)]
        + [Fraction(7, d) for d in (8, 16)]
        + [Fraction(9, 16), Fraction(11, 16), Fraction(13, 16), Fraction(15, 16)]
    ))

    stem = (
        f"Ընտանիքում հայրը գերիշխող հատկանիշով հետերոզիգոտ է {scenario} գծով "
        f"($Aa$՝ {dom_word}), իսկ մայրը՝ ընկճվող հոմոզիգոտ ($aa$՝ {rec_word})։ "
        f"Ընտանիքում ծնվել են {n_children} երեխա (ոչ միաձվային)։ "
    )

    opts_a = _pick_4_fractions(rng, [frac_exact, frac_all, Fraction(1, 2)], POOL)
    qa = mc(q_num_a, "Գենետիկա (խմբային)", "միջին",
        stem + f"Ի՞նչ հավանականությամբ ուղիղ {k_dom}-ը կլինեն {dom_word}, մնացածը՝ {rec_word}։",
        [fmt(x) for x in opts_a], fmt(frac_exact),
        f"$Aa\\times aa\\rightarrow 1/2$ {dom_word}, $1/2$ {rec_word}. կիրառե՛ք $C_{{{n_children}}}^{{{k_dom}}}$-ը։",
        [f"$Aa\\times aa$՝ յուրաքանչյուր երեխա $1/2$ {dom_word} ($Aa$), $1/2$ {rec_word} ($aa$)։",
         f"$P=C_{{{n_children}}}^{{{k_dom}}}\\left(\\tfrac12\\right)^{{{n_children}}}={fmt(frac_exact)}$"],
        group=group)

    opts_b = _pick_4_fractions(rng, [frac_all, frac_exact, Fraction(1, 2)], POOL)
    qb = mc(q_num_b, "Գենետիկա (խմբային)", "միջին",
        stem + f"Ի՞նչ հավանականությամբ բոլորը կլինեն {dom_word}։",
        [fmt(x) for x in opts_b], fmt(frac_all),
        f"Յուրաքանչյուր երեխա $1/2$ հավանականությամբ {dom_word} է. {n_children}-ը՝ անկախ դեպքեր։",
        [f"$P=\\left(\\tfrac12\\right)^{{{n_children}}}={fmt(frac_all)}$"],
        group=group)
    return qa, qb


ENERGY_UNITS = ["կՋ", "կկալ"]


def gen_energy_pyramid(rng, uniq_set, q_num, group=None, kcal_to_kj=None):
    for _ in range(300):
        base = rng.choice([8000, 9000, 10000, 12000, 15000, 16000, 18000, 20000, 24000,
                            25000, 28000, 30000, 32000, 35000, 40000, 45000, 50000,
                            60000, 70000, 80000, 90000, 100000])
        levels = rng.choice([2, 3, 4])
        result_check = int(round(base * (0.1 ** levels)))
        if result_check < 1:
            continue
        key = ("energy_pyramid", base, levels)
        if uniq(key, uniq_set):
            break
    else:
        raise RuntimeError("no unique energy pyramid params")
    result = base * (0.1 ** levels)
    result = int(round(result))
    level_word = {2: "երկրորդ (II)", 3: "երրորդ (III)", 4: "չորրորդ (IV)"}[levels]
    q = fr(q_num, "Էկոլոգիա", "միջին",
        f"Էկոհամակարգում պրոդուցենտների մակարդակում կուտակված է {base} կՋ էներգիա։ Էներգիայի "
        f"10%-ի կանոնի համաձայն՝ քանի՞ կՋ էներգիա կհասնի {level_word} կարգի կոնսումենտներին։",
        str(result),
        "Յուրաքանչյուր հաջորդ մակարդակ փոխանցվում է նախորդի էներգիայի մոտ 10%-ը։",
        [f"{'Պրոդուցենտներ' if i==0 else f'{i} կարգի կոնսումենտներ'}՝ "
         f"{int(base*(0.1**i))} կՋ։" for i in range(levels+1)],
        group=group)
    return q


def gen_chargaff(rng, uniq_set, q_num_a, q_num_b, q_num_c, group):
    for _ in range(300):
        total = rng.choice([1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900,
                             2000, 2100, 2200, 2400, 2500, 2600, 2800, 3000])
        a_count = rng.choice([x for x in range(100, total // 2, 25) if x < total / 2])
        key = ("chargaff", total, a_count)
        if uniq(key, uniq_set):
            break
    else:
        raise RuntimeError("no unique chargaff params")
    t_count = a_count
    gc_total = total - a_count - t_count
    g_count = gc_total // 2
    c_count = gc_total - g_count
    c_percent = round(100 * c_count / total)

    stem = (f"ԴՆԹ-ի մեկ մոլեկուլում կա {total} նուկլեոտիդ, որոնցից {a_count}-ը բաժին է ընկնում "
            f"ադենինին ($A$)։ ")

    qa = fr(q_num_a, "Մոլեկուլային կենսաբանություն (խմբային)", "միջին",
        stem + "Քանի՞ նուկլեոտիդ կա թիմինի ($T$) հետ։", str(t_count),
        "Չարգաֆի կանոն՝ $A=T$, $G=C$։",
        [f"Կոմպլեմենտար զույգ՝ $A\\text{{-}}T$, ուստի $T=A={a_count}$։"], group=group)

    qb = fr(q_num_b, "Մոլեկուլային կենսաբանություն (խմբային)", "միջին",
        stem + "Քանի՞ նուկլեոտիդ կա գուանինի ($G$) հետ։", str(g_count),
        "$A+T$-ից հետո մնացածը բաժանվում է $G$-ի և $C$-ի միջև հավասար։",
        [f"$A+T={a_count}+{t_count}={a_count+t_count}$։",
         f"$G+C={total}-{a_count+t_count}={gc_total}$, ուստի $G=C={g_count}$։"], group=group)

    qc = fr(q_num_c, "Մոլեկուլային կենսաբանություն (խմբային)", "բարձր",
        stem + "Քանի՞ տոկոս (%) է կազմում ցիտոզինը ($C$)՝ բոլոր նուկլեոտիդների նկատմամբ։",
        str(c_percent),
        "$C=G$, ապա $\\dfrac{C}{\\text{ընդհանուր}}\\cdot 100\\%$։",
        [f"$C={c_count}$։", f"$\\dfrac{{{c_count}}}{{{total}}}\\cdot 100\\%\\approx{c_percent}\\%$։"],
        group=group)
    return qa, qb, qc


# ABO genotypes -> (phenotype group, gametes produced). Punnett square is
# computed programmatically below, so ANY of the 21 unordered genotype pairs
# works (correct-by-construction — not a lookup table, so it never "runs
# out" the way a fixed list would across 50 exams).
ABO_GENOTYPES = {
    "$I^AI^A$": ("II", ["$I^A$", "$I^A$"]),
    "$I^Ai$": ("II", ["$I^A$", "$i$"]),
    "$I^BI^B$": ("III", ["$I^B$", "$I^B$"]),
    "$I^Bi$": ("III", ["$I^B$", "$i$"]),
    "$I^AI^B$": ("IV", ["$I^A$", "$I^B$"]),
    "$ii$": ("I", ["$i$", "$i$"]),
}


def _abo_phenotype(a1, a2):
    alleles = {a1, a2}
    if alleles == {"$I^A$", "$I^B$"}:
        return "IV"
    if "$I^A$" in alleles:
        return "II"
    if "$I^B$" in alleles:
        return "III"
    return "I"


ABO_GROUP_NAMES = {"I": "I", "II": "II", "III": "III", "IV": "IV"}


def gen_blood_type(rng, uniq_set, q_num_a, q_num_b, group):
    genotype_names = list(ABO_GENOTYPES.keys())
    for _ in range(300):
        g1, g2 = rng.choice(genotype_names), rng.choice(genotype_names)
        target = rng.choice(["I", "II", "III", "IV"])
        key = ("blood", tuple(sorted([g1, g2])), target)
        if uniq(key, uniq_set):
            break
    else:
        raise RuntimeError("no unique blood-type cross")

    mom_group, mom_gametes = ABO_GENOTYPES[g1]
    dad_group, dad_gametes = ABO_GENOTYPES[g2]
    mom_gen, dad_gen = g1, g2

    outcomes = {}
    for ga in mom_gametes:
        for gb in dad_gametes:
            ph = _abo_phenotype(ga, gb)
            outcomes[ph] = outcomes.get(ph, 0) + 1
    n = len(mom_gametes) * len(dad_gametes)
    dist = {k: round(100 * v / n) for k, v in outcomes.items()}
    for k in ("I", "II", "III", "IV"):
        dist.setdefault(k, 0)

    stem = (f"Մայրն ունի արյան {mom_group} խումբ (գենոտիպ {mom_gen}), իսկ հայրը՝ {dad_group} "
            f"խումբ (գենոտիպ {dad_gen})։ ")

    qa = fr(q_num_a, "Գենետիկա (խմբային)", "բարձր",
        stem + f"Քանի՞ տոկոս (%) հավանականությամբ կծնվի արյան {target} խումբով երեխա։",
        str(dist[target]),
        f"{mom_gen}$\\times${dad_gen}՝ հաշվե՛ք գամետների զուգակցումները։",
        [f"Հավանական գենոտիպերի բաշխումը՝ I={dist['I']}%, II={dist['II']}%, "
         f"III={dist['III']}%, IV={dist['IV']}%։"],
        group=group)

    diff_options = [k for k in ("I", "II", "III", "IV") if k not in (mom_group, dad_group)]
    diff_total = sum(dist[k] for k in diff_options)
    qb = fr(q_num_b, "Գենետիկա (խմբային)", "բարձր",
        stem + "Քանի՞ տոկոս (%) հավանականությամբ երեխայի արյան խումբը կլինի ծնողներից տարբեր։",
        str(diff_total),
        "Գումարե՛ք ծնողների խմբերից տարբեր բոլոր հնարավոր խմբերի տոկոսները։",
        [f"Ծնողներից տարբեր խմբեր՝ {', '.join(diff_options) if diff_options else 'չկան'}՝ "
         f"ընդամենը {diff_total}%։"],
        group=group)
    return qa, qb


def gen_heart_physiology(rng, uniq_set, q_num_a, q_num_b, q_num_c, group):
    for _ in range(300):
        hr = rng.choice([55, 58, 60, 62, 65, 68, 70, 72, 75, 78, 80, 82, 85, 88, 90, 95])
        sv = rng.choice([55, 58, 60, 62, 65, 68, 70, 72, 75, 78, 80, 82, 85])
        key = ("heart", hr, sv)
        if uniq(key, uniq_set):
            break
    else:
        raise RuntimeError("no unique heart params")
    per_min = hr * sv
    per_hour_l = round(per_min * 60 / 1000, 2)
    per_day_l = round(per_hour_l * 24, 1)

    stem = (f"Մարդու սիրտը հանգստի վիճակում մեկ րոպեում կծկվում է {hr} անգամ, յուրաքանչյուր "
            f"կծկման ժամանակ դուրս է մղում {sv} մլ արյուն։ ")

    qa = fr(q_num_a, "Ֆիզիոլոգիա (խմբային)", "միջին",
        stem + "Քանի՞ մլ է սրտի րոպեական ծավալը (մեկ րոպեում դուրս մղված արյան ծավալը)։",
        str(per_min),
        "Րոպեական ծավալ $=$ կծկումների թիվ $\\times$ մեկ կծկման ծավալ։",
        [f"${hr}\\cdot {sv}={per_min}$ մլ։"], group=group)

    per_hour_ml = per_min * 60
    per_hour_l_plain = _arm_decimal_plain(per_hour_l)
    per_hour_l_math = _arm_decimal(per_hour_l)
    qb = fr(q_num_b, "Ֆիզիոլոգիա (խմբային)", "միջին",
        stem + "Քանի՞ լիտր արյուն սիրտը կմղի 1 ժամում։",
        per_hour_l_plain,
        "1 ժամ $=60$ րոպե։",
        [f"${per_min}\\cdot 60={per_hour_ml}$ մլ $={per_hour_l_math}$ լ։"], group=group)

    per_day_l_plain = _arm_decimal_plain(per_day_l)
    per_day_l_math = _arm_decimal(per_day_l)
    qc = fr(q_num_c, "Ֆիզիոլոգիա (խմբային)", "բարձր",
        stem + "Քանի՞ լիտր արյուն սիրտը կմղի 1 օրում (24 ժամում)։",
        per_day_l_plain,
        "1 օր $=24$ ժամ։",
        [f"${per_hour_l_math}\\cdot 24={per_day_l_math}$ լ։"], group=group)
    return qa, qb, qc


MACRONUTRIENTS = [
    ("ածխաջրերի (գլյուկոզի)", 17.2),
    ("սպիտակուցների", 17.2),
    ("ճարպերի", 38.9),
]


def _arm_decimal(x):
    """For use INSIDE $...$ math segments only: 17.2 -> '17{,}2'
    (LaTeX-safe Armenian decimal comma); whole ints pass through."""
    if isinstance(x, int) or x == int(x):
        return str(int(x))
    return str(x).replace(".", "{,}")


def _arm_decimal_plain(x):
    """For use in PLAIN TEXT (outside $...$): 17.2 -> '17,2' — a real comma,
    not the LaTeX '{,}' escape (which would otherwise leak literal braces
    into the rendered question text)."""
    if isinstance(x, int) or x == int(x):
        return str(int(x))
    return str(x).replace(".", ",")


def _distinct_int_options(rng, correct, spread):
    """4 distinct positive-int option strings: `correct` plus 3 plausible
    wrong values within +/- spread, generated via a bounded fixed pool."""
    pool = set()
    for frac in (0.5, 1.5, 2.0, 0.75, 1.25, 0.9, 1.1):
        v = round(correct * frac)
        if v > 0 and v != correct:
            pool.add(v)
    for delta in (-3, -2, -1, 1, 2, 3, 5, -5, 10, -10):
        v = correct + delta * max(1, spread)
        if v > 0 and v != correct:
            pool.add(v)
    pool = list(pool)
    rng.shuffle(pool)
    opts = [correct] + pool[:3]
    i = 1
    while len(opts) < 4:  # pool exhausted (astronomically unlikely) — deterministic pad
        cand = correct + i * (spread + 1)
        if cand not in opts and cand > 0:
            opts.append(cand)
        i += 1
    rng.shuffle(opts)
    return [str(o) for o in opts]


def gen_macronutrient_energy(rng, uniq_set, q_num_a, q_num_b, group):
    """Mirrors exam 1's Q39-40: energy-per-gram ratio, forward (mass->energy)
    and reverse (energy->mass) sub-questions, with clean round numbers."""
    for _ in range(300):
        name, kj_per_g = rng.choice(MACRONUTRIENTS)
        mass1 = rng.choice([50, 100, 150, 200, 250, 300])
        mass2 = rng.choice([100, 200, 250, 400, 500])
        key = ("macro", name, mass1, mass2)
        if uniq(key, uniq_set):
            break
    else:
        raise RuntimeError("no unique macronutrient params")

    energy1 = round(mass1 * kj_per_g)   # kj_per_g has 1 decimal, mass is a
    energy2 = round(mass2 * kj_per_g)   # multiple of 50 -> always a whole kJ
    kj_plain = _arm_decimal_plain(kj_per_g)   # for plain question text
    kj_math = _arm_decimal(kj_per_g)          # for inside $...$

    stem = (f"{name.capitalize()} լրիվ օքսիդացման ժամանակ 1 գ նյութից անջատվում է "
            f"{kj_plain} կՋ էներգիա։ ")

    opts_a = _distinct_int_options(rng, energy1, max(round(mass1 * kj_per_g * 0.1), 5))
    qa = mc(q_num_a, "Նյութափոխանակություն (խմբային)", "միջին",
        stem + f"Քանի՞ կՋ էներգիա կանջատվի {mass1} գ նյութի լրիվ օքսիդացումից։",
        opts_a, str(energy1),
        f"$E=m\\cdot {kj_math}$",
        [f"$E={mass1}\\cdot {kj_math}={energy1}$ կՋ"],
        group=group)

    opts_b = _distinct_int_options(rng, mass2, max(round(mass2 * 0.1), 5))
    qb = mc(q_num_b, "Նյութափոխանակություն (խմբային)", "միջին",
        stem + f"Եթե օրգանիզմն ստանում է {energy2} կՋ էներգիա միայն այս նյութի հաշվին, "
               f"ապա քանի՞ գրամ նյութ է անհրաժեշտ։",
        opts_b, str(mass2),
        f"$m=E/{kj_math}$",
        [f"$m={energy2}/{kj_math}={mass2}$ գ"],
        group=group)
    return qa, qb


def gen_atp_energy(rng, uniq_set, q_num):
    for _ in range(300):
        n_mol = rng.choice(list(range(1, 21)))
        atp_per_glucose = rng.choice([36, 38])
        kj_per_atp = rng.choice([40, 30.5, 34])
        key = ("atp", n_mol, atp_per_glucose, kj_per_atp)
        if uniq(key, uniq_set):
            break
    else:
        raise RuntimeError("no unique atp params")
    total_atp = n_mol * atp_per_glucose
    total_kj = total_atp * kj_per_atp
    total_kj_str = str(int(total_kj)) if total_kj == int(total_kj) else str(total_kj)
    kj_per_atp_plain = _arm_decimal_plain(kj_per_atp)
    kj_per_atp_math = _arm_decimal(kj_per_atp)
    q = fr(q_num, "Էներգետիկ փոխանակություն", "բարձր",
        f"Մեկ մոլ գլյուկոզի լրիվ օքսիդացմամբ առաջանում է {atp_per_glucose} մոլ ԱԵՖ։ Յուրաքանչյուր "
        f"մոլ ԱԵՖ-ի սինթեզում կուտակվում է {kj_per_atp_plain} կՋ էներգիա։ Քանի՞ կՋ էներգիա կպահպանվի "
        f"ԱԵՖ-ում՝ {n_mol} մոլ գլյուկոզի լրիվ օքսիդացմամբ։",
        total_kj_str,
        f"$E=n\\cdot {atp_per_glucose}\\cdot {kj_per_atp_math}$ կՋ, որտեղ $n$-ը գլյուկոզի մոլի թիվն է։",
        [f"{n_mol} մոլ գլյուկոզ $\\rightarrow {n_mol}\\cdot {atp_per_glucose}={total_atp}$ մոլ ԱԵՖ։",
         f"${total_atp}\\cdot {kj_per_atp_math}={total_kj_str}$ կՋ։"])
    return q
