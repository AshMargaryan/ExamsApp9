# -*- coding: utf-8 -*-
"""
Shared builder + parameterized template library for scaling the Chemistry
mock-exam set past exam #1. Mirrors the pattern used for math/physics
(generate_physics.py) and biology (bio_common.py):

- mc()/fr()/ms()/grp() builders identical in shape to exam #1's.
- `uniq()` gives every numeric template a fresh, never-repeated parameter
  tuple across the whole 50-exam run.
- Purely conceptual facts (isomer counts, electron configs, standard
  potentials, named reactions) are drawn from small HAND-VERIFIED lookup
  tables rather than invented per call, so correctness never depends on
  re-deriving chemistry inside a loop.
- Combo-letter ("ա, գ, ե") questions use an item-bank + subset-draw pattern:
  each bank item carries a verified True/False flag, the exam draws N
  distinct items, and the correct combo is computed FROM the flags -- so
  the answer is correct by construction for any subset drawn.
"""
import random, re

random.seed(20260804)
ARM = "ԱԲԳԴԵԶԷԸԹԺ"
E, M, H = "հեշտ", "միջին", "բարձր"

def num(x):
    if isinstance(x, float) and abs(x - round(x)) < 1e-9:
        x = int(round(x))
    if isinstance(x, float):
        return ("%.4g" % x).replace(".", ",")
    return str(x)

def numt(x):
    return num(x).replace(",", "{,}")

# ---- global uniqueness across the whole 50-exam run ----
# Numeric templates have huge parameter spaces and stay genuinely unique.
# Small verified lookup tables (isomer counts, named reactions, standard
# potentials, ...) can't offer 49 distinct entries -- when the space is
# exhausted this falls back to a (possibly repeated) draw instead of
# crashing; the cross-exam exact-question-text check at the end of the
# build honestly reports whatever actually ends up duplicated.
USED = {}
EXHAUSTED = {}
def uniq(key, drawfn, tries=300):
    seen = USED.setdefault(key, set())
    for _ in range(tries):
        t = drawfn()
        if t not in seen:
            seen.add(t)
            return t
    EXHAUSTED[key] = EXHAUSTED.get(key, 0) + 1
    return drawfn()

# ---- cross-exam exact-question-text registry (honesty check, not silent) ----
QTEXT_SEEN = {}
def _register_text(number, text):
    QTEXT_SEEN.setdefault(text, []).append(number)

# ---- per-exam accumulator ----
CUR = None
_pos_counter = 0
def _correct_pos(nopt=4):
    global _pos_counter
    p = _pos_counter % nopt
    _pos_counter += 1
    return p

def mc(number, topic, diff, question, correct, wrongs, hint, steps, fig=None):
    wrongs = [w for w in wrongs if w != correct]
    seen = set(); dedup = []
    for w in wrongs:
        if w not in seen:
            seen.add(w); dedup.append(w)
    wrongs = dedup[:3]
    assert len(wrongs) == 3, f"Q{number}: need 3 distinct wrong options, got {wrongs}"
    pos = _correct_pos(4)
    opts = wrongs[:]
    opts.insert(pos, correct)
    q = {"number": number, "topic": topic, "group": None, "type": "single_choice",
         "question": question, "difficulty": diff, "hint": hint, "solution_steps": steps}
    if fig:
        q["figure_svg"] = fig
    q["options"] = opts
    q["correct_option"] = ARM[pos]
    CUR.append(q)
    _register_text(number, question)

def fr(number, topic, diff, question, answer, hint, steps, group=None, fig=None):
    q = {"number": number, "topic": topic, "group": group, "type": "free_response",
         "question": question, "difficulty": diff, "hint": hint,
         "solution_steps": steps, "answer": str(answer)}
    if fig:
        q["figure_svg"] = fig
    CUR.append(q)
    _register_text(number, question)

def ms(number, topic, diff, question, statements, true_idx, hint, steps):
    labelled = [f"{ARM[i]}) {s}" for i, s in enumerate(statements)]
    idxs = sorted(true_idx)
    if len(idxs) > 1:
        corr = ", ".join(ARM[i] for i in idxs[:-1]) + " և " + ARM[idxs[-1]]
    else:
        corr = ARM[idxs[0]]
    CUR.append({"number": number, "topic": topic, "group": None, "type": "multi_statement",
                "question": question, "difficulty": diff, "hint": hint, "solution_steps": steps,
                "statements": labelled, "correct_option": corr})
    _register_text(number, question)

def grp(intro, subs, key):
    for (nn, topic, diff, q, ans, hint, steps, fig) in subs:
        fr(nn, topic, diff, f"{intro}\n\n{q}", ans, hint, steps, group=key, fig=fig)

# =========================================================== SVG FIGURES
def svg(inner, w=320, h=200):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" '
            f'width="{w}" height="{h}" font-family="sans-serif" font-size="13">{inner}</svg>')

def fig_energy_diagram(exo=True, reactant_label="Ա+Բ", product_label="Գ"):
    if exo:
        path = 'M110,110 Q130,110 150,45 Q170,110 205,145'
        r_lab_y, p_lab_y = 100, 140
        r_line = '<line x1="65" y1="110" x2="110" y2="110" stroke="#2c3e50" stroke-width="2.4"/>'
        p_line = '<line x1="205" y1="145" x2="245" y2="145" stroke="#2c3e50" stroke-width="2.4"/>'
        r_dash = '<line x1="65" y1="170" x2="65" y2="110" stroke="#999" stroke-dasharray="3"/>'
        p_dash = '<line x1="205" y1="170" x2="205" y2="145" stroke="#999" stroke-dasharray="3"/>'
    else:
        path = 'M110,145 Q130,145 150,45 Q170,145 205,110'
        r_lab_y, p_lab_y = 135, 100
        r_line = '<line x1="65" y1="145" x2="110" y2="145" stroke="#2c3e50" stroke-width="2.4"/>'
        p_line = '<line x1="205" y1="110" x2="245" y2="110" stroke="#2c3e50" stroke-width="2.4"/>'
        r_dash = '<line x1="65" y1="170" x2="65" y2="145" stroke="#999" stroke-dasharray="3"/>'
        p_dash = '<line x1="205" y1="170" x2="205" y2="110" stroke="#999" stroke-dasharray="3"/>'
    s = (
        '<defs><marker id="ax1" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">'
        '<path d="M0,0 L6,3 L0,6 Z" fill="#333"/></marker></defs>'
        '<line x1="50" y1="170" x2="270" y2="170" stroke="#333" stroke-width="1.6" marker-end="url(#ax1)"/>'
        '<line x1="50" y1="170" x2="50" y2="20" stroke="#333" stroke-width="1.6" marker-end="url(#ax1)"/>'
        '<text x="255" y="188">Ռեակցիայի ընթացք</text>'
        '<text x="20" y="26" font-style="italic">E</text>'
        f'{r_line}'
        f'<path d="{path}" fill="none" stroke="#c0392b" stroke-width="2.4"/>'
        f'{p_line}{r_dash}{p_dash}'
        f'<text x="70" y="{r_lab_y}" font-style="italic">{reactant_label}</text>'
        f'<text x="212" y="{p_lab_y}" font-style="italic">{product_label}</text>'
        '<text x="140" y="38" font-size="11">ակտիվացման</text>'
        '<text x="140" y="50" font-size="11">էներգիա</text>'
    )
    return svg(s, 320, 200)

def fig_lab_tubes(label_a="Mg", label_b="Zn"):
    def tube(cx, label):
        x0 = cx - 22
        return (
            f'<path d="M {x0} 40 L {x0} 140 Q {x0} 158 {cx} 158 Q {x0+22} 158 {x0+22} 140 L {x0+22} 40" '
            f'fill="#eaf2f8" stroke="#333" stroke-width="1.8"/>'
            f'<path d="M {x0} 95 L {x0} 140 Q {x0} 158 {cx} 158 Q {x0+22} 158 {x0+22} 140 L {x0+22} 95 Z" '
            f'fill="#aed6f1"/>'
            f'<rect x="{cx-3}" y="55" width="6" height="90" fill="#7f8c8d" stroke="#4d5656" stroke-width="1"/>'
            f'<circle cx="{cx-8}" cy="80" r="3" fill="#fff" stroke="#5dade2"/>'
            f'<circle cx="{cx+7}" cy="65" r="2.4" fill="#fff" stroke="#5dade2"/>'
            f'<circle cx="{cx-5}" cy="55" r="2" fill="#fff" stroke="#5dade2"/>'
            f'<text x="{cx}" y="178" text-anchor="middle" font-style="italic">{label}</text>'
        )
    return svg(tube(90, label_a) + tube(220, label_b), 320, 195)

# =========================================================== combo-letter helper
def combo_mc(number, topic, diff, stem, bank, flag_key, n_items, hint_fn, steps_fn, sizekey):
    """Draw n_items distinct (text, flag) entries from `bank`; correct combo is
    computed from the flags actually drawn -> correct by construction."""
    idxs = uniq(sizekey, lambda: tuple(sorted(random.sample(range(len(bank)), n_items))))
    items = [bank[i] for i in idxs]
    letters = ARM.lower() if False else "աբգդեզէը"[:n_items]
    true_letters = [letters[i] for i, (_, flag) in enumerate(items) if flag]
    correct = ", ".join(true_letters) if true_letters else "ոչ մեկը"
    stem_items = "\n".join(f"{letters[i]}) {items[i][0]}" for i in range(n_items))
    question = f"{stem}\n\n{stem_items}"
    true_set = set(true_letters)
    all_letters = list(letters)
    wrongs = []
    tries = 0
    while len(wrongs) < 3 and tries < 200:
        tries += 1
        k = len(true_set) if true_set else 1
        k = max(1, min(k, len(all_letters)))
        cand = set(random.sample(all_letters, k))
        if cand != true_set:
            txt = ", ".join(sorted(cand, key=all_letters.index))
            if txt not in wrongs and txt != correct:
                wrongs.append(txt)
    while len(wrongs) < 3:
        cand = set(random.sample(all_letters, min(len(all_letters), len(true_set) + 1 if len(true_set) < len(all_letters) else len(true_set) - 1 or 1)))
        txt = ", ".join(sorted(cand, key=all_letters.index))
        if txt not in wrongs and txt != correct:
            wrongs.append(txt)
    mc(number, topic, diff, question, correct, wrongs[:3], hint_fn(items), steps_fn(items, true_letters), None)

# =========================================================== VERIFIED ITEM BANKS
BANK_CHEM_PHYS = [
    ("երկաթի ժանգոտումը խոնավ օդում", True),
    ("սառույցի հալումը", False),
    ("խաղողի հյութի խմորումը", True),
    ("յոդի սուբլիմացումը (պինդից անմիջապես գազի անցումը)", False),
    ("կաթի թթվելը", True),
    ("ջրի եռալը և գոլորշիացումը", False),
    ("մոմի այրումը", True),
    ("թղթի պատռվելը մասերի", False),
    ("մետաղալարի ձգումը և ձևափոխումը", False),
    ("նավթի թորումը ֆրակցիաների", False),
    ("բնական գազի այրումը օջախում", True),
    ("շաքարավազի լուծվելը տաք ջրում", False),
    ("կաուչուկի այրումը", True),
    ("ապակու փշրվելը հարվածից", False),
    ("ամոնիակի անջատումը ամոնիումի աղից ալկալու ազդեցությամբ", True),
    ("յուղի մածուցիկացումը սառեցնելիս", False),
]

BANK_SUSPENSION = [
    ("գլյուկոզ", False), ("կավճի փոշի", True), ("օսլա (սառը ջրում)", True),
    ("նատրիումի քլորիդ", False), ("ավազ", True), ("շաքարավազ", False),
    ("մանրացրած կավ", True), ("կրաքար (փշրված)", True), ("կալիումի նիտրատ", False),
    ("մագնեզիումի հիդրօքսիդի փոշի", True), ("պղնձարջասպ ($CuSO_4$)", False),
    ("բարիումի սուլֆատի փոշի", True),
]

BANK_MOLECULAR = [
    ("$H_2O$", True), ("ադամանդ (ատոմային կառուցվածքով C)", False), ("$CO_2$", True),
    ("$NaCl$ (իոնային)", False), ("յոդ՝ $I_2$", True), ("$SiO_2$ (ատոմային)", False),
    ("$NH_3$", True), ("$Na_2SO_4$ (իոնային)", False), ("$CH_4$", True),
    ("գրաֆիտ (ատոմային)", False), ("$C_2H_5OH$", True), ("$KCl$ (իոնային)", False),
]

BANK_CORROSION = [
    ("մագնեզիում", True), ("մանգան", True), ("ցինկ", True), ("ալյումին", True),
    ("պղինձ", False), ("արծաթ", False), ("ոսկի", False), ("կապար", False),
    ("նիկել", False), ("կադմիում", False),
]

BANK_SILVERMIRROR = [
    ("գլյուկոզ", True), ("սախարոզ", False), ("մրջնաթթու", True), ("գլիցերին", False),
    ("ացետալդեհիդ", True), ("ֆրուկտոզ", True), ("մեթանոլ", False), ("ֆորմալդեհիդ", True),
    ("էթանոլ", False), ("բենզալդեհիդ", True), ("ացետոն", False),
]

BANK_HBOND = [
    ("$H_2O$", True), ("$CH_4$", False), ("$C_2H_5OH$", True), ("$HF$", True),
    ("$CO_2$", False), ("$NH_3$", True), ("$CH_3OH$", True), ("$C_6H_6$ (բենզոլ)", False),
    ("$CH_3OCH_3$ (դիմեթիլային եթեր)", False), ("$CH_3COOH$", True), ("$H_2S$", False),
    ("$N_2H_4$ (հիդրազին)", True),
]

BANK_ALKENE_HYDRATION = [
    ("էթանոլ (էթիլենից)", True), ("դիէթիլային եթեր", False), ("իզոպրոպանոլ (պրոպիլենից)", True),
    ("քացախաթթու", False), ("տերտ-բութանոլ (իզոբութիլենից)", True), ("էթիլացետատ", False),
    ("երկրորդային բութանոլ (բութեն-1-ից)", True), ("մեթանոլ", False),
    ("ցիկլոհեքսանոլ (ցիկլոհեքսենից)", True), ("ացետոն", False),
]

# sigma-bond table: (formula_latex, sigma_count)
BANK_SIGMA = [
    (r"CH_3COOH", 7), (r"C_2H_4", 5), (r"C_2H_2", 3), (r"CH_4", 4), (r"C_2H_6", 7),
    (r"NH_3", 3), (r"H_2O", 2), (r"CO_2", 2), (r"N_2", 1), (r"HCHO", 3), (r"C_3H_8", 10),
    (r"C_2H_5OH", 8), (r"CH_3Cl", 4), (r"C_6H_6", 12), (r"CH_3NH_2", 6), (r"CH_2Cl_2", 4), (r"HCOOH", 4),
]

# molar masses (g/mol), verified standard values
MOLAR_MASS = {
    "H2": 2, "He": 4, "CH4": 16, "NH3": 17, "H2O": 18, "Ne": 20, "C2H4": 28, "N2": 28,
    "CO": 28, "O2": 32, "H2S": 34, "Ar": 40, "CO2": 44, "C3H8": 44, "N2O": 44, "NO2": 46,
    "SO2": 64, "Cl2": 71, "C2H6": 30, "HCl": 36.5,
}
GAS_LATEX = {
    "H2": "H_2", "He": "He", "CH4": "CH_4", "NH3": "NH_3", "H2O": "H_2O", "Ne": "Ne",
    "C2H4": "C_2H_4", "N2": "N_2", "CO": "CO", "O2": "O_2", "H2S": "H_2S", "Ar": "Ar",
    "CO2": "CO_2", "C3H8": "C_3H_8", "N2O": "N_2O", "NO2": "NO_2", "SO2": "SO_2", "Cl2": "Cl_2",
    "C2H6": "C_2H_6", "HCl": "HCl",
}

# electron-configuration table: (ion_latex, config_latex, element_note)
BANK_ECONFIG = [
    (r"Ca^{2+}", r"1s^22s^22p^63s^23p^6"),
    (r"Mg^{2+}", r"1s^22s^22p^6"),
    (r"Na^{+}", r"1s^22s^22p^6"),
    (r"K^{+}", r"1s^22s^22p^63s^23p^6"),
    (r"Al^{3+}", r"1s^22s^22p^6"),
    (r"F^{-}", r"1s^22s^22p^6"),
    (r"O^{2-}", r"1s^22s^22p^6"),
    (r"Cl^{-}", r"1s^22s^22p^63s^23p^6"),
    (r"Li^{+}", r"1s^2"),
    (r"Be^{2+}", r"1s^2"),
    (r"S^{2-}", r"1s^22s^22p^63s^23p^6"),
    (r"Zn^{2+}", r"1s^22s^22p^63s^23p^63d^{10}"),
    (r"Fe^{2+}", r"1s^22s^22p^63s^23p^63d^6"),
    (r"Fe^{3+}", r"1s^22s^22p^63s^23p^63d^5"),
]

# period rows for atomic-radius trend (leftmost = largest radius)
PERIOD_ROWS = [
    ["Li", "Be", "B", "C", "N", "O", "F"],
    ["Na", "Mg", "Al", "Si", "P", "S", "Cl"],
]

# reaction-classification triples: (reaction_latex, types_tuple) all verified
RXN_TRIPLES = [
    (r"2H_2+O_2=2H_2O", r"Zn+2HCl=ZnCl_2+H_2", r"C_2H_4+H_2=C_2H_6"),
    (r"2Na+Cl_2=2NaCl", r"CuO+H_2=Cu+H_2O", r"C_3H_6+H_2=C_3H_8"),
    (r"N_2+3H_2=2NH_3", r"Fe+CuSO_4=FeSO_4+Cu", r"C_2H_2+2H_2=C_2H_6"),
    (r"2Mg+O_2=2MgO", r"Mg+2HCl=MgCl_2+H_2", r"CH_2{=}CH_2+Br_2=CH_2BrCH_2Br"),
    (r"S+O_2=SO_2", r"Zn+H_2SO_4=ZnSO_4+H_2", r"C_2H_4+Cl_2=C_2H_4Cl_2"),
    (r"2Ca+O_2=2CaO", r"Fe+H_2SO_4=FeSO_4+H_2", r"C_2H_2+H_2=C_2H_4"),
    (r"4Al+3O_2=2Al_2O_3", r"Mg+CuSO_4=MgSO_4+Cu", r"C_3H_4+2H_2=C_3H_8"),
    (r"2K+Cl_2=2KCl", r"Zn+Pb(NO_3)_2=Zn(NO_3)_2+Pb", r"C_2H_4+HCl=C_2H_5Cl"),
    (r"2Na+S=Na_2S", r"Al+3AgNO_3=Al(NO_3)_3+3Ag", r"C_3H_6+Br_2=C_3H_6Br_2"),
]

# Pressure-in-closed-vessel pool: (reaction_latex, "same"|"more"|"less" -- net
# change in GAS-PHASE mole count left->right). Draw picks 1 "same" as correct
# + 3 non-"same" as wrongs, giving a combinatorial pool instead of fixed
# tuples. Every entry independently verified by counting gas moles each side.
PRESSURE_POOL = [
    (r"H_2(\text{գ})+Cl_2(\text{գ})=2HCl(\text{գ})", "same"),
    (r"N_2(\text{գ})+O_2(\text{գ})=2NO(\text{գ})", "same"),
    (r"H_2(\text{գ})+Br_2(\text{գ})=2HBr(\text{գ})", "same"),
    (r"CO(\text{գ})+H_2O(\text{գ})\rightleftharpoons CO_2(\text{գ})+H_2(\text{գ})", "same"),
    (r"F_2(\text{գ})+H_2(\text{գ})\rightleftharpoons 2HF(\text{գ})", "same"),
    (r"I_2(\text{գ})+H_2(\text{գ})\rightleftharpoons 2HI(\text{գ})", "same"),
    (r"Br_2(\text{գ})+Cl_2(\text{գ})\rightleftharpoons 2BrCl(\text{գ})", "same"),
    (r"2H_2O_2(\text{հեղ})=2H_2O(\text{հեղ})+O_2(\text{գ})", "more"),
    (r"CaCO_3(\text{պ})=CaO(\text{պ})+CO_2(\text{գ})", "more"),
    (r"2Na(\text{պ})+2H_2O(\text{հեղ})=2NaOH(\text{լ})+H_2(\text{գ})", "more"),
    (r"2KClO_3(\text{պ})=2KCl(\text{պ})+3O_2(\text{գ})", "more"),
    (r"2NaHCO_3(\text{պ})=Na_2CO_3(\text{պ})+H_2O(\text{գ})+CO_2(\text{գ})", "more"),
    (r"NH_4Cl(\text{պ})\rightleftharpoons NH_3(\text{գ})+HCl(\text{գ})", "more"),
    (r"2HgO(\text{պ})=2Hg(\text{հեղ})+O_2(\text{գ})", "more"),
    (r"2SO_2(\text{գ})+O_2(\text{գ})=2SO_3(\text{գ})", "less"),
    (r"N_2(\text{գ})+3H_2(\text{գ})=2NH_3(\text{գ})", "less"),
    (r"2NO(\text{գ})+O_2(\text{գ})=2NO_2(\text{գ})", "less"),
    (r"2NO_2(\text{գ})\rightleftharpoons N_2O_4(\text{գ})", "less"),
    (r"2CO(\text{գ})+O_2(\text{գ})=2CO_2(\text{գ})", "less"),
]

# Equilibrium pool: (reaction_latex, both_shift_left: bool). Draw picks 1
# True as correct + 3 False as wrongs. Verified via mole-count (pressure)
# and exo/endothermic direction (temperature) for the LEFT shift condition.
EQUIL_POOL = [
    (r"2SO_2(\text{գ})+O_2(\text{գ})\rightleftharpoons 2SO_3(\text{գ})+Q", True),
    (r"N_2(\text{գ})+3H_2(\text{գ})\rightleftharpoons 2NH_3(\text{գ})+Q", True),
    (r"2NO(\text{գ})+O_2(\text{գ})\rightleftharpoons 2NO_2(\text{գ})+Q", True),
    (r"2H_2S(\text{գ})+3O_2(\text{գ})\rightleftharpoons 2SO_2(\text{գ})+2H_2O(\text{գ})+Q", True),
    (r"N_2(\text{գ})+O_2(\text{գ})\rightleftharpoons 2NO(\text{գ})-Q", False),
    (r"2NH_3(\text{գ})\rightleftharpoons N_2(\text{գ})+3H_2(\text{գ})-Q", False),
    (r"H_2(\text{գ})+I_2(\text{գ})\rightleftharpoons 2HI(\text{գ})+Q", False),
    (r"CaCO_3(\text{պ})\rightleftharpoons CaO(\text{պ})+CO_2(\text{գ})-Q", False),
    (r"2SO_3(\text{գ})\rightleftharpoons 2SO_2(\text{գ})+O_2(\text{գ})-Q", False),
    (r"H_2(\text{գ})+Cl_2(\text{գ})\rightleftharpoons 2HCl(\text{գ})+Q", False),
    (r"2CO(\text{գ})\rightleftharpoons C(\text{պ})+CO_2(\text{գ})-Q", False),
    (r"2HI(\text{գ})\rightleftharpoons H_2(\text{գ})+I_2(\text{գ})-Q", False),
]

# redox-pair identification: (correct_desc, wrongs[3])
# redox pool: (process_description, is_redox: bool), all independently
# verified via oxidation-state change (or lack thereof). Draw picks 2
# redox items as the correct pair, and builds 3 wrong pairs each containing
# at least one non-redox item.
REDOX_POOL = [
    ("պիրիտի թրծումը", True), ("երկաթի ժանգոտումը", True), ("ածխի այրումը", True),
    ("ցինկի աղաթթվի հետ փոխազդեցությունը", True), ("մագնեզիումի այրումը", True),
    ("պղնձի(II) օքսիդի վերականգնումը ջրածնով", True), ("ալյումինի փոխազդեցությունը յոդի հետ", True),
    ("նատրիումի փոխազդեցությունը ջրի հետ", True),
    ("էսթերացումը", False), ("պոլիմերացումը", False), ("կրաքարի թրծումը", False),
    ("չեզոքացման ռեակցիան", False), ("հիդրոլիզը", False), ("նստվածքագոյացումը", False),
    ("բարիումի սուլֆատի նստվածքագոյացումը", False), ("էսթերի հիդրոլիզը", False),
    ("կրիստալոհիդրատի ջրազրկումը", False), ("քացախաթթվի դիսոցումը", False),
    ("աղաթթվի չեզոքացումը", False), ("ամոնիումի քլորիդի ստացումը", False),
    ("օսլայի հիդրոլիզը", False),
]

# valence formula-check: (element, valence, correct_formula, wrongs[3])
VALENCE_SETS = [
    ("Al", 3, "Cl", 1, r"AlCl_3", [r"Al_2Cl_3", r"AlCl_2", r"Al_3Cl"]),
    ("Ca", 2, "Cl", 1, r"CaCl_2", [r"CaCl", r"Ca_2Cl", r"Ca_2Cl_3"]),
    ("Fe", 3, "O", 2, r"Fe_2O_3", [r"FeO_3", r"Fe_3O_2", r"FeO"]),
    ("S", 6, "O", 2, r"SO_3", [r"SO_2", r"S_2O_3", r"S_3O_2"]),
    ("P", 5, "O", 2, r"P_2O_5", [r"PO_5", r"P_5O_2", r"P_2O_3"]),
    ("Mg", 2, "O", 2, r"MgO", [r"MgO_2", r"Mg_2O", r"Mg_2O_2"]),
    ("Na", 1, "O", 2, r"Na_2O", [r"NaO", r"NaO_2", r"Na_2O_2"]),
    ("Si", 4, "O", 2, r"SiO_2", [r"Si_2O", r"SiO_4", r"Si_2O_4"]),
    ("N", 3, "H", 1, r"NH_3", [r"N_3H", r"NH", r"N_3H_3"]),
    ("K", 1, "Br", 1, r"KBr", [r"K_2Br", r"KBr_2", r"K_2Br_2"]),
]

# solution-properties combo statements (verified true/false; bank must be well
# larger than n_items so combo_mc's "choose 5 of N" draw has real headroom)
SOLPROP_BANK = [
    ("ունեն հաստատուն քանակական բաղադրություն", False),
    ("կարող են գտնվել պինդ, հեղուկ և գազային վիճակներում", True),
    ("անփոփոխ պայմաններում ժամանակի ընթացքում կայուն են", True),
    ("միշտ անգույն են", False),
    ("համասեռ համակարգեր են", True),
    ("բաղադրիչների հարաբերությունը կարող է փոփոխվել լայն սահմաններում", True),
    ("միշտ հեղուկ ագրեգատային վիճակում են", False),
    ("կարող են բաժանվել բաղադրիչների զտման եղանակով", False),
    ("լուծված նյութի մասնիկները հավասարաչափ բաշխված են ողջ ծավալում", True),
    ("լուծելիությունը կախված չէ ջերմաստիճանից", False),
]

CATALYST_BANK = [
    ("տեղաշարժում են հավասարակշռությունը", False),
    ("փոքրացնում են ակտիվացման էներգիան", True),
    ("սպառվում են ռեակցիայի ընթացքում", False),
    ("հավասարապես արագացնում են ուղիղ և հակառակ ռեակցիաները", True),
    ("մեծացնում են հավասարակշռության հաստատունը", False),
    ("չեն մասնակցում ռեակցիայի մեխանիզմին", False),
    ("կարող են ընտրողաբար արագացնել միայն որոշակի ռեակցիաներ (ընտրողականություն)", True),
    ("ազդում են ռեակցիայի ջերմային էֆեկտի վրա", False),
    ("ֆերմենտները կենսաբանական կատալիզատորներ են", True),
]

# electrolysis "both water ox+red" salts: (correct, wrongs[3])
# Electrolysis pool: (salt_latex, both_water_ox_and_red: bool). True only
# for alkali/alkaline-earth cation + oxoanion (water does all the work);
# False when either ion is preferentially discharged over water. Verified
# against standard discharge-priority rules used in the school curriculum.
ELECTROLYSIS_POOL = [
    (r"Na_2SO_4", True), (r"K_2SO_4", True), (r"MgSO_4", True), (r"Li_2SO_4", True),
    (r"NaNO_3", True), (r"KNO_3", True), (r"Na_3PO_4", True),
    (r"KBr", False), (r"ZnCl_2", False), (r"CuSO_4", False), (r"AgNO_3", False),
    (r"NiSO_4", False), (r"SnCl_2", False), (r"NaBr", False), (r"CaCl_2", False),
    (r"FeSO_4", False), (r"CuCl_2", False),
]

# salt identification (flame color + AgNO3 precipitate color): (salt, flame, ppt_color)
SALT_ID_BANK = [
    (r"KCl", "մանուշակագույն", "սպիտակ"),
    (r"NaCl", "դեղին", "սպիտակ"),
    (r"CaCl_2", "աղյուսագույն", "սպիտակ"),
    (r"KBr", "մանուշակագույն", "գունատ դեղին"),
    (r"NaI", "դեղին", "դեղին"),
    (r"LiCl", "մուգ կարմիր", "սպիտակ"),
    (r"BaCl_2", "դեղնականաչավուն", "սպիտակ"),
    (r"SrCl_2", "կարմիր", "սպիտակ"),
    (r"CuCl_2", "կապտականաչ", "սպիտակ"),
    (r"KJ", "մանուշակագույն", "դեղին"),
]

# metallurgy pool: (reaction_latex, is_electrolytic_extraction: bool)
METALLURGY_POOL = [
    (r"2Al_2O_3\xrightarrow{\text{էլեկտրոլիզ}} 4Al+3O_2", True),
    (r"2NaCl\xrightarrow{\text{էլեկտրոլիզ}} 2Na+Cl_2", True),
    (r"MgCl_2\xrightarrow{\text{էլեկտրոլիզ (հալույթ)}} Mg+Cl_2", True),
    (r"CaCl_2\xrightarrow{\text{էլեկտրոլիզ (հալույթ)}} Ca+Cl_2", True),
    (r"2KCl\xrightarrow{\text{էլեկտրոլիզ (հալույթ)}} 2K+Cl_2", True),
    (r"2LiCl\xrightarrow{\text{էլեկտրոլիզ (հալույթ)}} 2Li+Cl_2", True),
    (r"3Fe_3O_4+8Al=4Al_2O_3+9Fe", False), (r"CuSO_4+Fe=FeSO_4+Cu", False),
    (r"Fe_2O_3+3CO=2Fe+3CO_2", False), (r"3MnO_2+4Al=2Al_2O_3+3Mn", False),
    (r"ZnSO_4+Mg=MgSO_4+Zn", False), (r"WO_3+3H_2=W+3H_2O", False),
    (r"3CuO+2Al=Al_2O_3+3Cu", False), (r"PbO+C=Pb+CO", False),
    (r"SnO_2+2C=Sn+2CO_2", False), (r"Fe_2O_3+3H_2=2Fe+3H_2O", False),
    (r"2HgO=2Hg+O_2", False), (r"MnO_2+2C=Mn+2CO", False),
]

# isomer-count facts: (question_subject_latex, count, wrongs[3])
ISOMER_SETS = [
    (r"C_5H_{12}", "3", ["2", "4", "5"]),
    (r"C_6H_4Br_2 (\text{դիբրոմբենզոլ})", "3", ["2", "4", "6"]),
    (r"C_4H_{10}", "2", ["1", "3", "4"]),
    (r"C_4H_9Cl", "4", ["2", "3", "5"]),
    (r"C_3H_8", "1", ["2", "3", "4"]),
    (r"C_6H_{14}", "5", ["3", "4", "6"]),
    (r"C_3H_6Cl_2", "4", ["2", "3", "5"]),
    (r"C_5H_{11}Cl", "8", ["6", "7", "9"]),
]

# IUPAC naming facts: (structure_latex, correct_name, wrongs[3])
IUPAC_SETS = [
    (r"CH_3{-}CH(CH_3){-}CH_2{-}CH_3", "2-մեթիլբութան", ["2-մեթիլպրոպան", "3-մեթիլբութան", "2,2-դիմեթիլպրոպան"]),
    (r"CH_3{-}CH_2{-}CH(CH_3){-}CH_2{-}CH_3", "3-մեթիլպենտան", ["2-մեթիլպենտան", "2,2-դիմեթիլբութան", "3-մեթիլբութան"]),
    (r"CH_3{-}C(CH_3)_2{-}CH_3", "2,2-դիմեթիլպրոպան", ["2-մեթիլբութան", "n-պենտան", "3-մեթիլբութան"]),
    (r"CH_3{-}CH_2{-}CH_2{-}CH_2{-}CH_3", "n-պենտան", ["2-մեթիլբութան", "2,2-դիմեթիլպրոպան", "3-մեթիլպենտան"]),
    (r"CH_3{-}CH_2{-}CH_2{-}CH_3", "n-բութան", ["իզոբութան", "2-մեթիլպրոպան", "պրոպան"]),
    (r"CH_3{-}CH(CH_3){-}CH_3", "2-մեթիլպրոպան", ["n-բութան", "n-պենտան", "2-մեթիլբութան"]),
    (r"CH_3{-}CH_2{-}CH(CH_3){-}CH_2{-}CH_2{-}CH_3", "3-մեթիլհեքսան", ["4-մեթիլհեքսան", "2-մեթիլհեքսան", "3-մեթիլպենտան"]),
    (r"CH_3{-}CH_2{-}C(CH_3)_2{-}CH_3", "2,2-դիմեթիլբութան", ["2,3-դիմեթիլբութան", "2-մեթիլպենտան", "3,3-դիմեթիլբութան"]),
]

# ester naming: (acid_alcohol_latex, ester_name, wrongs[3])
ESTER_NAME_SETS = [
    (r"CH_3COOH+C_2H_5OH", "էթիլացետատ", ["մեթիլացետատ", "էթիլֆորմիատ", "պրոպիլացետատ"]),
    (r"HCOOH+CH_3OH", "մեթիլֆորմիատ", ["էթիլացետատ", "մեթիլացետատ", "էթիլֆորմիատ"]),
    (r"CH_3COOH+CH_3OH", "մեթիլացետատ", ["էթիլացետատ", "մեթիլֆորմիատ", "պրոպիլացետատ"]),
    (r"C_2H_5COOH+CH_3OH", "մեթիլպրոպիոնատ", ["էթիլպրոպիոնատ", "մեթիլացետատ", "մեթիլբութիրատ"]),
    (r"C_3H_7COOH+C_2H_5OH", "էթիլբութիրատ", ["մեթիլբութիրատ", "էթիլպրոպիոնատ", "էթիլացետատ"]),
    (r"HCOOH+C_2H_5OH", "էթիլֆորմիատ", ["մեթիլֆորմիատ", "էթիլացետատ", "էթիլպրոպիոնատ"]),
    (r"CH_3COOH+C_3H_7OH", "պրոպիլացետատ", ["էթիլացետատ", "մեթիլացետատ", "պրոպիլֆորմիատ"]),
]

# EMF ranking (verified standard reduction potentials, V)
SRP = {"Zn": -0.76, "Cu": 0.34, "Ag": 0.80, "Mg": -2.37, "Fe": -0.44, "Pb": -0.13, "Ni": -0.25}
EMF_LATEX = {
    "Zn": r"Zn^{2+}/Zn=-0{,}76", "Cu": r"Cu^{2+}/Cu=+0{,}34", "Ag": r"Ag^{+}/Ag=+0{,}80",
    "Mg": r"Mg^{2+}/Mg=-2{,}37", "Fe": r"Fe^{2+}/Fe=-0{,}44", "Pb": r"Pb^{2+}/Pb=-0{,}13",
    "Ni": r"Ni^{2+}/Ni=-0{,}25",
}

# carbohydrate hydrolysis facts: (poly, partial_di, full_mono)
CARB_SETS = [
    ("ցելյուլոզայի", "ցելոբիոզ", r"\beta"), ("օսլայի", "մալթոզ", r"\alpha"),
    ("գլիկոգենի", "մալթոզ", r"\alpha"),
]

# functional-group facts: (name, class, wrongs[3])
FUNCGROUP_SETS = [
    (r"CH_3CH_2CHO", "ալդեհիդներ", ["կետոններ", "կարբոնաթթուներ", "սպիրտներ"]),
    (r"CH_3COCH_3", "կետոններ", ["ալդեհիդներ", "կարբոնաթթուներ", "եթերներ"]),
    (r"CH_3CH_2COOH", "կարբոնաթթուներ", ["ալդեհիդներ", "կետոններ", "էսթերներ"]),
    (r"CH_3COOCH_3", "էսթերներ", ["ալդեհիդներ", "կարբոնաթթուներ", "կետոններ"]),
    (r"CH_3OH", "սպիրտներ", ["ալդեհիդներ", "կարբոնաթթուներ", "եթերներ"]),
    (r"CH_3OCH_3", "եթերներ", ["սպիրտներ", "ալդեհիդներ", "կետոններ"]),
    (r"C_6H_5NH_2", "ամիններ", ["սպիրտներ", "կարբոնաթթուներ", "ամիդներ"]),
    (r"CH_3CH_2CH_2CHO", "ալդեհիդներ", ["կետոններ", "կարբոնաթթուներ", "սպիրտներ"]),
]

# fewest-ion salt comparison: (cation_latex, salts list of (formula_latex, molar_mass))
FEWION_SETS = [
    ("Fe^{2+}", [(r"FeSO_4", 152), (r"FeCl_2", 127), (r"Fe(NO_3)_2", 180), (r"Fe(CH_3COO)_2", 174)]),
    ("Cu^{2+}", [(r"CuSO_4", 160), (r"CuCl_2", 135), (r"Cu(NO_3)_2", 188), (r"CuBr_2", 224)]),
    ("Zn^{2+}", [(r"ZnSO_4", 161), (r"ZnCl_2", 136), (r"Zn(NO_3)_2", 189), (r"Zn(CH_3COO)_2", 183)]),
    ("Mg^{2+}", [(r"MgSO_4", 120), (r"MgCl_2", 95), (r"Mg(NO_3)_2", 148), (r"Mg(CH_3COO)_2", 142)]),
    ("Ca^{2+}", [(r"CaSO_4", 136), (r"CaCl_2", 111), (r"Ca(NO_3)_2", 164), (r"Ca(CH_3COO)_2", 158)]),
]

# alcohol/hydrogen-bond & radioactivity element table (symbol, Z) for decay-chain generator
DECAY_ELEMENTS = {89: "Ac", 90: "Th", 91: "Pa", 92: "U", 87: "Fr", 88: "Ra", 93: "Np"}
