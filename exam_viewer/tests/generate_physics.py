# -*- coding: utf-8 -*-
"""
Parameterized generator for 50 original Physics mock exams (AEE-PHYS-001..050),
70 questions each, matching the official Unified Entrance Exam structure:
  1-40  single-choice MCQ
  41-44 standalone free-response ("multiply the answer by 10^x" style)
  45-68 nine grouped scenarios (sizes 2,2,2,2,2,3,3,4,4)
  69-70 multi-statement (true/false)

Every numeric answer is COMPUTED from drawn parameters (never hand-typed), so
answers are correct by construction. `uniq()` guarantees no two questions across
all 50 exams share the same parameter tuple -> no exact duplicate questions.
"""
import json, math, os, random, re

random.seed(20260802)
OUT = os.path.join(os.path.dirname(__file__), "out")
os.makedirs(OUT, exist_ok=True)

ARM = "ԱԲԳԴԵԶԷԸԹԺ"
E, M, H = "հեշտ", "միջին", "բարձր"

# ---- LaTeX helpers (raw strings, single backslash) ----
def frac(a, b): return r"\frac{%s}{%s}" % (a, b)
CDOT = r"\cdot "

def num(x):
    """Armenian-style number: integer if whole, else decimal comma."""
    if isinstance(x, float) and abs(x - round(x)) < 1e-9:
        x = int(round(x))
    if isinstance(x, float):
        s = ("%.4g" % x)
        return s.replace(".", "{,}") if False else s.replace(".", ",")
    return str(x)

def numt(x):
    """number for use inside $...$ math (decimal comma tightened)."""
    s = num(x)
    return s.replace(",", "{,}")

# ---- global uniqueness across all exams ----
USED = {}
def uniq(key, drawfn, tries=6000):
    seen = USED.setdefault(key, set())
    for _ in range(tries):
        t = drawfn()
        if t not in seen:
            seen.add(t)
            return t
    raise RuntimeError("exhausted params for " + key)

# ---- per-exam question accumulator ----
_CUR = None
_pos_counter = 0
def _correct_pos(nopt=4):
    """rotate correct-answer position so it isn't always 'Ա'."""
    global _pos_counter
    p = _pos_counter % nopt
    _pos_counter += 1
    return p

def _perturb(correct, taken, need):
    """Generate `need` distinct plausible wrong options by nudging the first
    number in `correct`. Used only when a template's distractors collide."""
    m = re.search(r"-?\d+(?:[.,]\d+)?", correct)
    out = []
    if not m:
        i = 1
        while len(out) < need:
            cand = correct + "\u200b" * i          # zero-width, keeps it distinct
            if cand not in taken and cand not in out:
                out.append(cand)
            i += 1
        return out
    numstr = m.group(0); dec = ("," in numstr) or ("." in numstr)
    base = float(numstr.replace(",", "."))
    k = 1
    while len(out) < need and k <= 60:
        for delta in (k, -k, 2 * k):
            val = base + delta
            if base > 0 and val <= 0:
                continue
            if dec:
                vs = ("%g" % val).replace(".", ",")
            else:
                vs = str(int(val)) if float(val).is_integer() else ("%g" % val).replace(".", ",")
            cand = correct[:m.start()] + vs + correct[m.end():]
            if cand != correct and cand not in taken and cand not in out:
                out.append(cand)
                if len(out) >= need:
                    break
        k += 1
    while len(out) < need:                      # last-resort safety
        out.append(correct + "\u200b" * (len(out) + 1))
    return out

def mc(number, topic, diff, question, correct, wrongs, hint, steps, fig=None):
    """single_choice; correct & wrongs are display strings. Places correct rotating."""
    ws = []
    for w in wrongs:
        if w != correct and w not in ws:
            ws.append(w)
    ws = ws[:3]
    if len(ws) < 3:
        ws += _perturb(correct, [correct] + ws, 3 - len(ws))
    ws = ws[:3]
    pos = _correct_pos(4)
    opts = ws[:]
    opts.insert(pos, correct)
    q = {"number": number, "topic": topic, "group": None, "type": "single_choice",
         "question": question, "difficulty": diff, "hint": hint, "solution_steps": steps}
    if fig: q["figure_svg"] = fig
    q["options"] = opts
    q["correct_option"] = ARM[pos]
    _CUR.append(q)

def fr(number, topic, diff, question, answer, hint, steps, group=None, fig=None):
    q = {"number": number, "topic": topic, "group": group, "type": "free_response",
         "question": question, "difficulty": diff, "hint": hint,
         "solution_steps": steps, "answer": str(answer)}
    if fig: q["figure_svg"] = fig
    _CUR.append(q)

def ms(number, topic, diff, question, statements, true_idx, hint, steps):
    labelled = [f"{ARM[i]}) {s}" for i, s in enumerate(statements)]
    idxs = sorted(true_idx)
    if len(idxs) > 1:
        corr = ", ".join(ARM[i] for i in idxs[:-1]) + " և " + ARM[idxs[-1]]
    elif idxs:
        corr = ARM[idxs[0]]
    else:
        corr = "—"
    _CUR.append({"number": number, "topic": topic, "group": None, "type": "multi_statement",
                 "question": question, "difficulty": diff, "hint": hint, "solution_steps": steps,
                 "statements": labelled, "correct_option": corr})

# =========================================================== SVG FIGURES
def svg(inner, w=300, h=190):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" '
            f'width="{w}" height="{h}" font-family="sans-serif" font-size="13">{inner}</svg>')

def fig_friction(mu, nmax):
    ox, oy = 58, 158; sx = 185.0 / nmax; sy = 112.0 / (mu * nmax)
    xe = ox + nmax * sx; ye = oy - (mu * nmax) * sy
    s = (f'<defs><marker id="a" markerWidth="9" markerHeight="9" refX="6" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="#333"/></marker></defs>'
         f'<line x1="{ox}" y1="{oy}" x2="{xe+24:.0f}" y2="{oy}" stroke="#333" stroke-width="1.6" marker-end="url(#a)"/>'
         f'<line x1="{ox}" y1="{oy}" x2="{ox}" y2="18" stroke="#333" stroke-width="1.6" marker-end="url(#a)"/>'
         f'<line x1="{xe:.1f}" y1="{oy}" x2="{xe:.1f}" y2="{ye:.1f}" stroke="#aaa" stroke-dasharray="4"/>'
         f'<line x1="{ox}" y1="{ye:.1f}" x2="{xe:.1f}" y2="{ye:.1f}" stroke="#aaa" stroke-dasharray="4"/>'
         f'<line x1="{ox}" y1="{oy}" x2="{xe:.1f}" y2="{ye:.1f}" stroke="#c0392b" stroke-width="2.6"/>'
         f'<text x="{xe+30:.0f}" y="{oy+5}" font-style="italic">N, Ն</text>'
         f'<text x="{ox-46}" y="22" font-style="italic">F, Ն</text>'
         f'<text x="{ox-16}" y="{oy+17}">0</text>'
         f'<text x="{xe:.0f}" y="{oy+18}" text-anchor="middle">{num(nmax)}</text>'
         f'<text x="{ox-10}" y="{ye+5:.0f}" text-anchor="end">{num(mu*nmax)}</text>')
    return svg(s, 320, 180)

def fig_forces120():
    cx, cy, L = 150, 100, 60
    s = ('<defs><marker id="fh" markerWidth="9" markerHeight="9" refX="7" refY="3.2" orient="auto"><path d="M0,0 L7,3.2 L0,6.4 Z" fill="#2c3e50"/></marker></defs>'
         f'<circle cx="{cx}" cy="{cy}" r="3" fill="#222"/>')
    for i, a in enumerate([90, 210, 330]):
        r = math.radians(a); ex = cx + L*math.cos(r); ey = cy - L*math.sin(r)
        lx = cx + (L+16)*math.cos(r); ly = cy - (L+16)*math.sin(r)
        s += f'<line x1="{cx}" y1="{cy}" x2="{ex:.1f}" y2="{ey:.1f}" stroke="#2c3e50" stroke-width="2.4" marker-end="url(#fh)"/>'
        s += f'<text x="{lx-8:.1f}" y="{ly+4:.1f}" font-style="italic">F{chr(0x2081+i)}</text>'
    return svg(s, 300, 200)

def fig_incline(alpha):
    x0, y0, base = 45, 162, 200; r = math.radians(alpha)
    x1 = x0 + base; y1 = y0 - base*math.tan(r)
    bx = x0 + base*0.52; by = y0 - (bx-x0)*math.tan(r)
    cx = bx - math.sin(r)*15; cy = by - math.cos(r)*15
    s = (f'<polygon points="{x0},{y0} {x1},{y0} {x1:.0f},{y1:.0f}" fill="#eef2f4" stroke="#333" stroke-width="1.6"/>'
         f'<g transform="translate({cx:.1f},{cy:.1f}) rotate({-alpha})"><rect x="-19" y="-14" width="38" height="28" rx="2" fill="#5dade2" stroke="#1b4f72" stroke-width="1.5"/></g>'
         f'<text x="{cx:.1f}" y="{cy+5:.1f}" text-anchor="middle" fill="#fff" font-style="italic" font-weight="bold">m</text>'
         f'<path d="M {x0+44} {y0} A 44 44 0 0 0 {x0+44*math.cos(r):.1f} {y0-44*math.sin(r):.1f}" fill="none" stroke="#333" stroke-width="1.3"/>'
         f'<text x="{x0+52}" y="{y0-9}" font-style="italic">α</text>')
    return svg(s, 300, 180)

def fig_circuit():
    s = (
        # main loop wires (left wire split for the battery gap at y=95..113)
        '<line x1="60" y1="45" x2="230" y2="45" stroke="#333" stroke-width="2"/>'
        '<line x1="230" y1="45" x2="230" y2="92" stroke="#333" stroke-width="2"/>'
        '<line x1="230" y1="128" x2="230" y2="165" stroke="#333" stroke-width="2"/>'
        '<line x1="60" y1="165" x2="230" y2="165" stroke="#333" stroke-width="2"/>'
        '<line x1="60" y1="45" x2="60" y2="96" stroke="#333" stroke-width="2"/>'
        '<line x1="60" y1="112" x2="60" y2="165" stroke="#333" stroke-width="2"/>'
        # battery symbol
        '<line x1="49" y1="96" x2="71" y2="96" stroke="#333" stroke-width="3.5"/>'
        '<line x1="54" y1="112" x2="66" y2="112" stroke="#333" stroke-width="2"/>'
        '<text x="16" y="109" font-style="italic">ε, r</text>'
        # ammeter (series, top)
        '<circle cx="145" cy="45" r="14" fill="#fff" stroke="#333" stroke-width="1.7"/><text x="139" y="50">A</text>'
        # resistor R (right side, straddling the wire)
        '<rect x="220" y="92" width="20" height="36" fill="#fff" stroke="#333" stroke-width="1.7"/>'
        '<text x="216" y="115" text-anchor="end" font-style="italic">R</text>'
        # voltmeter V in parallel across R (branch to the right)
        '<line x1="230" y1="92" x2="278" y2="92" stroke="#333" stroke-width="1.5"/>'
        '<line x1="278" y1="92" x2="278" y2="98" stroke="#333" stroke-width="1.5"/>'
        '<line x1="230" y1="128" x2="278" y2="128" stroke="#333" stroke-width="1.5"/>'
        '<line x1="278" y1="128" x2="278" y2="122" stroke="#333" stroke-width="1.5"/>'
        '<circle cx="278" cy="110" r="13" fill="#fff" stroke="#333" stroke-width="1.7"/><text x="272" y="115">V</text>'
    )
    return svg(s, 310, 190)

def fig_pv(v1, v2, p):
    ox, oy = 55, 165; sx = 130.0/max(v2, 3); sy = 90.0/max(p, 3)
    x1 = ox+v1*sx; x2 = ox+v2*sx; y = oy-p*sy
    s = (f'<defs><marker id="ax" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#333"/></marker></defs>'
         f'<line x1="{ox}" y1="{oy}" x2="255" y2="{oy}" stroke="#333" stroke-width="1.5" marker-end="url(#ax)"/>'
         f'<line x1="{ox}" y1="{oy}" x2="{ox}" y2="25" stroke="#333" stroke-width="1.5" marker-end="url(#ax)"/>'
         f'<text x="245" y="{oy+18}" font-style="italic">V</text><text x="{ox-42}" y="32" font-style="italic">P</text>'
         f'<line x1="{x1:.1f}" y1="{y:.1f}" x2="{x2:.1f}" y2="{y:.1f}" stroke="#c0392b" stroke-width="2.5"/>'
         f'<circle cx="{x1:.1f}" cy="{y:.1f}" r="3.5" fill="#c0392b"/><circle cx="{x2:.1f}" cy="{y:.1f}" r="3.5" fill="#c0392b"/>'
         f'<text x="{x1-4:.0f}" y="{y-8:.0f}">1</text><text x="{x2-4:.0f}" y="{y-8:.0f}">2</text>'
         f'<line x1="{x1:.1f}" y1="{oy}" x2="{x1:.1f}" y2="{y:.1f}" stroke="#999" stroke-dasharray="3"/>'
         f'<line x1="{x2:.1f}" y1="{oy}" x2="{x2:.1f}" y2="{y:.1f}" stroke="#999" stroke-dasharray="3"/>'
         f'<text x="{x1-4:.0f}" y="{oy+16}">{num(v1)}</text><text x="{x2-4:.0f}" y="{oy+16}">{num(v2)}</text>')
    return svg(s)

def fig_pulley():
    s = ('<rect x="30" y="120" width="150" height="12" fill="#bdc3c7" stroke="#333"/>'
         '<line x1="60" y1="132" x2="60" y2="175" stroke="#333"/><line x1="150" y1="132" x2="150" y2="175" stroke="#333"/>'
         '<rect x="70" y="96" width="40" height="24" fill="#5dade2" stroke="#1b4f72"/><text x="82" y="112" fill="#fff" font-style="italic">m1</text>'
         '<circle cx="190" cy="120" r="10" fill="none" stroke="#333" stroke-width="2"/>'
         '<line x1="110" y1="108" x2="182" y2="112" stroke="#333"/><line x1="200" y1="120" x2="200" y2="165" stroke="#333"/>'
         '<rect x="185" y="165" width="30" height="24" fill="#e67e22" stroke="#a04000"/><text x="192" y="181" fill="#fff" font-style="italic">m2</text>')
    return svg(s, 300, 200)

def fig_magnetic():
    s = '<rect x="90" y="30" width="150" height="140" fill="#eaf2f8" stroke="#2980b9"/>'
    for gx in range(105, 235, 22):
        for gy in range(45, 165, 22):
            s += f'<circle cx="{gx}" cy="{gy}" r="2" fill="#2980b9"/>'
    s += ('<defs><marker id="vh" markerWidth="9" markerHeight="9" refX="7" refY="3.2" orient="auto"><path d="M0,0 L7,3.2 L0,6.4 Z" fill="#c0392b"/></marker></defs>'
          '<line x1="30" y1="100" x2="88" y2="100" stroke="#c0392b" stroke-width="2.4" marker-end="url(#vh)"/>'
          '<text x="45" y="93" fill="#c0392b" font-style="italic">v</text><text x="150" y="185" fill="#2980b9" font-style="italic">B</text><text x="150" y="24" font-style="italic">d</text>'
          '<line x1="90" y1="18" x2="240" y2="18" stroke="#333" stroke-dasharray="3"/>')
    return svg(s, 300, 200)


# =========================================================== helpers
def U(v, u): return f"{num(v)} {u}"
def R(a, b): return random.randint(a, b)
PYTH = sorted({(a, b, int(round((a*a+b*b)**0.5)))
               for a in range(3, 100) for b in range(a+1, 100)
               if int(round((a*a+b*b)**0.5))**2 == a*a+b*b})   # ~70 triples
ELEMENTS = [("He",2,4),("Li",3,7),("Be",4,9),("B",5,11),("C",6,12),("C",6,14),("N",7,14),
    ("O",8,16),("O",8,18),("F",9,19),("Ne",10,20),("Na",11,23),("Mg",12,24),("Al",13,27),
    ("Si",14,28),("P",15,31),("S",16,32),("Cl",17,35),("Cl",17,37),("Ar",18,40),("K",19,39),
    ("Ca",20,40),("Sc",21,45),("Ti",22,48),("V",23,51),("Cr",24,52),("Mn",25,55),("Fe",26,56),
    ("Co",27,59),("Ni",28,58),("Cu",29,63),("Cu",29,65),("Zn",30,64),("Ga",31,69),("Ge",32,72),
    ("As",33,75),("Se",34,79),("Br",35,80),("Kr",36,84),("Rb",37,85),("Sr",38,88),("Y",39,89),
    ("Zr",40,91),("Nb",41,93),("Mo",42,96),("Ru",44,101),("Rh",45,103),("Pd",46,106),("Ag",47,108),("Cd",48,112),("In",49,115),("Sn",50,119),("Sb",51,122),("Te",52,128),("I",53,127),("Xe",54,131),("Cs",55,133),("Ba",56,137),("W",74,184),("Pt",78,195),("Au",79,197),("Pb",82,207)]
SUBST = [("սառույցի",3.4),("կապարի",0.25),("անագի",0.59),("արծաթի",0.87),("ալյումինի",3.9),
         ("պղնձի",2.1),("երկաթի",2.7),("ցինկի",1.1),("ոսկու",0.66)]

# ---------------- MECHANICS ----------------
def t_force_ma(n):
    m,a = uniq("force_ma", lambda:(R(2,15),R(2,9))); F=m*a
    mc(n,"Դինամիկա",E,f"${m}$ կգ զանգվածով մարմինը շարժվում է ${a}$ մ/վ² արագացումով։ Որքա՞ն է համազոր ուժը։",
       U(F,"Ն"),[U(m+a,"Ն"),U(F+m,"Ն"),U(F+a,"Ն")],"$F=ma$։",[f"$F={m}\\cdot {a}={F}$ Ն"])
def t_vel_vat(n):
    v0,a,t = uniq("vel_vat", lambda:(R(1,12),R(2,9),R(2,7))); v=v0+a*t
    mc(n,"Կինեմատիկա",M,f"Մարմինը ${v0}$ մ/վ սկզբնական արագությամբ շարժվում է ${a}$ մ/վ² հաստատուն արագացումով։ Որքա՞ն կլինի արագությունը ${t}$ վ հետո։",
       U(v,"մ/վ"),[U(a*t,"մ/վ"),U(v0*t,"մ/վ"),U(v+a,"մ/վ")],"$v=v_0+at$։",[f"$v={v0}+{a}\\cdot {t}={v}$ մ/վ"])
def t_accel(n):
    v0,a,t = uniq("accel", lambda:(R(0,10),R(2,9),R(2,7))); v=v0+a*t
    mc(n,"Կինեմատիկա",M,f"Մարմնի արագությունը ${t}$ վ-ում ${v0}$ մ/վ-ից դարձավ ${v}$ մ/վ։ Որքա՞ն է արագացումը։",
       U(a,"մ/վ²"),[U(a+1,"մ/վ²"),U(v//t,"մ/վ²"),U(a+2,"մ/վ²")],"$a=\\dfrac{v-v_0}{t}$։",[f"$a=\\dfrac{{{v}-{v0}}}{{{t}}}={a}$ մ/վ²"])
def t_freefall_h(n):
    v0,t = uniq("ff_h", lambda:(R(0,18),R(2,9))); h=v0*t+5*t*t
    lead = "դադարից" if v0==0 else f"${v0}$ մ/վ ուղղաձիգ ներքև արագությամբ"
    mc(n,"Ազատ անկում",M,f"Մարմինը ընկնում է {lead}։ Ի՞նչ ճանապարհ կանցնի ${t}$ վ-ում։ $g=10$ մ/վ²։",
       U(h,"մ"),[U(v0*t+10*t,"մ"),U(5*t*t,"մ") if v0 else U(h+5,"մ"),U(h+t,"մ")],
       "$h=v_0t+\\dfrac{gt^2}{2}$։",[f"$h={v0}\\cdot {t}+\\dfrac{{10\\cdot {t}^2}}{{2}}={h}$ մ"])
def t_freefall_v(n):
    v0,t = uniq("ff_v", lambda:(R(0,18),R(2,9))); v=v0+10*t
    lead = "դադարից" if v0==0 else f"${v0}$ մ/վ ուղղաձիգ ներքև արագությամբ"
    mc(n,"Ազատ անկում",E,f"Մարմինը ընկնում է {lead}։ Որքա՞ն կլինի արագությունը ${t}$ վ հետո։ $g=10$ մ/վ²։",
       U(v,"մ/վ"),[U(v0+5*t,"մ/վ"),U(v+10,"մ/վ"),U(10*t,"մ/վ") if v0 else U(v+5,"մ/վ")],
       "$v=v_0+gt$։",[f"$v={v0}+10\\cdot {t}={v}$ մ/վ"])
def t_ke(n):
    def _d():
        while True:
            m=R(1,10); v=R(2,14)
            if (m*v*v)%2==0: return (m,v)
    m,v = uniq("ke", _d); Ek=m*v*v//2
    mc(n,"Կինետիկ էներգիա",M,f"Որքա՞ն է ${m}$ կգ զանգվածով, ${v}$ մ/վ արագությամբ մարմնի կինետիկ էներգիան։",
       U(Ek,"Ջ"),[U(m*v,"Ջ"),U(m*v*v,"Ջ"),U(Ek+m,"Ջ")],"$E_k=\\dfrac{mv^2}{2}$։",[f"$E_k=\\dfrac{{{m}\\cdot {v}^2}}{{2}}={Ek}$ Ջ"])
def t_pe(n):
    m,h = uniq("pe", lambda:(R(2,15),R(2,12))); Ep=m*10*h
    mc(n,"Պոտենցիալ էներգիա",E,f"Որքա՞ն է ${m}$ կգ մարմնի պոտենցիալ էներգիան ${h}$ մ բարձրության վրա։ $g=10$ մ/վ²։",
       U(Ep,"Ջ"),[U(m*h,"Ջ"),U(m*10,"Ջ"),U(Ep+10,"Ջ")],"$E_p=mgh$։",[f"$E_p={m}\\cdot 10\\cdot {h}={Ep}$ Ջ"])
def t_power_fv(n):
    F,v = uniq("power_fv", lambda:(R(10,120),R(2,9))); P=F*v
    mc(n,"Հզորություն",M,f"Մարմնի վրա ազդում է ${F}$ Ն ուժ, և այն շարժվում է ուժի ուղղությամբ ${v}$ մ/վ արագությամբ։ Որքա՞ն է հզորությունը։",
       U(P,"Վտ"),[U(F+v,"Վտ"),U(P+F,"Վտ"),U(F,"Վտ")],"$P=Fv$։",[f"$P={F}\\cdot {v}={P}$ Վտ"])
def t_power_wt(n):
    P,t = uniq("power_wt", lambda:(R(20,150),R(2,12))); W=P*t
    mc(n,"Հզորություն",M,f"Մեքենան ${t}$ վ-ում կատարում է ${W}$ Ջ աշխատանք։ Որքա՞ն է նրա հզորությունը։",
       U(P,"Վտ"),[U(W*t,"Վտ"),U(P+t,"Վտ"),U(W,"Վտ")],"$P=\\dfrac{W}{t}$։",[f"$P=\\dfrac{{{W}}}{{{t}}}={P}$ Վտ"])
def t_hooke(n):
    k,xmm = uniq("hooke", lambda:(R(2,30)*10,R(2,9))); x=xmm/100; F=k*x
    mc(n,"Առաձգականություն",M,f"${k}$ Ն/մ կոշտության զսպանակը ձգվել է ${numt(x)}$ մ-ով։ Որքա՞ն է առաձգականության ուժը։",
       U(F,"Ն"),[U(k,"Ն"),U(round(F*10,1),"Ն"),U(round(F/2,2),"Ն")],"$F=kx$։",[f"$F={k}\\cdot {numt(x)}={num(F)}$ Ն"])
def t_momentum(n):
    m,v = uniq("momentum", lambda:(R(2,18),R(2,15))); p=m*v
    mc(n,"Իմպուլս",E,f"Որքա՞ն է ${m}$ կգ զանգվածով, ${v}$ մ/վ արագությամբ մարմնի իմպուլսը։",
       U(p,"կգ·մ/վ"),[U(m+v,"կգ·մ/վ"),U(p+m,"կգ·մ/վ"),U(p-v,"կգ·մ/վ")],"$p=mv$։",[f"$p={m}\\cdot {v}={p}$ կգ·մ/վ"])
def t_centripetal(n):
    def _d():
        while True:
            v=R(2,30); Rr=R(2,12)
            if (v*v)%Rr==0: return (v,Rr)
    v,Rr = uniq("centr", _d); a=v*v//Rr
    mc(n,"Պտտական շարժում",M,f"Մարմինը ${v}$ մ/վ արագությամբ պտտվում է ${Rr}$ մ շառավղով շրջանագծով։ Որքա՞ն է կենտրոնաձիգ արագացումը։",
       U(a,"մ/վ²"),[U(v*Rr,"մ/վ²"),U(2*v,"մ/վ²"),U(a+v,"մ/վ²")],"$a=\\dfrac{v^2}{R}$։",[f"$a=\\dfrac{{{v}^2}}{{{Rr}}}={a}$ մ/վ²"])
def t_friction_force(n):
    mu10,m = uniq("frc_f", lambda:(R(2,8),R(2,12))); mu=mu10/10; F=mu*m*10
    mc(n,"Շփման ուժ",M,f"${m}$ կգ մարմինը հանգիստ ընկած է հորիզոնական մակերևույթին։ Շփման գործակիցը ${numt(mu)}$ է, $g=10$ մ/վ²։ Որքա՞ն է սահքի շփման առավելագույն ուժը։",
       U(F,"Ն"),[U(mu*m,"Ն"),U(m*10,"Ն"),U(round(F+m,1),"Ն")],"$F_{\\text{շփ}}=\\mu mg$։",[f"$F={numt(mu)}\\cdot {m}\\cdot 10={num(F)}$ Ն"])
def t_friction_graph(n):
    mu10,nmax = uniq("frc_g", lambda:(R(2,8),random.choice(range(30,95,5))))
    mu=mu10/10; Fmax=mu*nmax
    mc(n,"Շփման ուժ",M,"Նկարում պատկերված է շփման $F_{\\text{շփ}}$ ուժի կախումը հենման $N$ ուժից։ Ինչի՞ է հավասար շփման գործակիցը։",
       num(mu),[num(round(mu+0.1,1)),num(round(mu-0.1,1)),num(round(mu/2,2))],
       "$\\mu=\\dfrac{F_{\\text{շփ}}}{N}$՝ գրաֆիկի թեքությունը։",
       [f"$N={nmax}$ Ն, $F_{{\\text{{շփ}}}}={num(Fmax)}$ Ն",f"$\\mu=\\dfrac{{{num(Fmax)}}}{{{nmax}}}={num(mu)}$"],fig=fig_friction(mu,nmax))
def t_two_perp(n):
    x,y,c = uniq("two_perp", lambda: random.choice(PYTH))
    mc(n,"Ուժերի համազոր",M,f"Մարմնի վրա ազդում են իրար փոխուղղահայաց ${x}$ Ն և ${y}$ Ն ուժեր։ Որքա՞ն է դրանց համազորը։",
       U(c,"Ն"),[U(x+y,"Ն"),U(c+1,"Ն"),U(abs(x-y),"Ն")],"$F=\\sqrt{F_1^2+F_2^2}$։",[f"$F=\\sqrt{{{x}^2+{y}^2}}=\\sqrt{{{x*x+y*y}}}={c}$ Ն"])
def t_projectile_ratio(n):
    v1,k = uniq("proj_ratio", lambda:(random.choice([5,10,15,20,25,30,40,50]),R(2,7)))
    v2=k*v1
    mc(n,"Կինեմատիկա",M,f"Երկու մարմիններ նետված են հորիզոնի նկատմամբ միևնույն անկյան տակ՝ ${v1}$ մ/վ և ${v2}$ մ/վ արագություններով։ Ինչի՞ է հավասար նրանց թռիչքի հեռահասությունների $S_2/S_1$ հարաբերությունը։",
       str(k*k),[str(k),str(k*k*k),str(2*k)],"$S\\propto v_0^2$։",[f"$\\dfrac{{S_2}}{{S_1}}=\\left(\\dfrac{{{v2}}}{{{v1}}}\\right)^2={k}^2={k*k}$"])
def t_incline_comp(n):
    alpha,m = uniq("inc_comp", lambda:(random.choice([30,45,60]),R(2,20)))
    sin={30:"0{,}5",45:r"\dfrac{\sqrt2}{2}",60:r"\dfrac{\sqrt3}{2}"}[alpha]
    if alpha==30: c=U(m*5,"Ն"); wr=[U(m*10,"Ն"),f"${m*5}\\sqrt3$ Ն",f"${m*5}\\sqrt2$ Ն"]
    elif alpha==45: c=f"${m*5}\\sqrt2$ Ն"; wr=[U(m*10,"Ն"),U(m*5,"Ն"),f"${m*5}\\sqrt3$ Ն"]
    else: c=f"${m*5}\\sqrt3$ Ն"; wr=[U(m*10,"Ն"),U(m*5,"Ն"),f"${m*5}\\sqrt2$ Ն"]
    mc(n,"Թեք հարթություն",M,f"${m}$ կգ մարմինը ${alpha}^\\circ$ թեքությամբ հարթության վրա է (տես նկարը)։ Որքա՞ն է ծանրության ուժի՝ հարթության երկայնքով բաղադրիչը։ $g=10$ մ/վ²։",
       c,wr,"$mg\\sin\\alpha$։",[f"$mg\\sin{alpha}^\\circ={m}\\cdot 10\\cdot {sin}$"],fig=fig_incline(alpha))
def t_density(n):
    V,rho = uniq("density", lambda:(R(2,12),R(2,25))); m=rho*V
    mc(n,"Խտություն",E,f"Մարմնի զանգվածը ${m}$ կգ է, ծավալը՝ ${V}$ մ³։ Որքա՞ն է խտությունը։",
       U(rho,"կգ/մ³"),[U(m*V,"կգ/մ³"),U(rho+1,"կգ/մ³"),U(m+V,"կգ/մ³")],"$\\rho=\\dfrac{m}{V}$։",[f"$\\rho=\\dfrac{{{m}}}{{{V}}}={rho}$ կգ/մ³"])
def t_pressure(n):
    A,P = uniq("pressure", lambda:(R(2,12),R(5,80))); F=P*A
    mc(n,"Ճնշում",M,f"${F}$ Ն ուժը ուղղահայաց ազդում է ${A}$ մ² մակերևույթի վրա։ Որքա՞ն է ճնշումը։",
       U(P,"Պա"),[U(F*A,"Պա"),U(P+A,"Պա"),U(F,"Պա")],"$P=\\dfrac{F}{A}$։",[f"$P=\\dfrac{{{F}}}{{{A}}}={P}$ Պա"])
def t_impulse(n):
    F,t = uniq("impulse", lambda:(R(5,60),R(2,12))); J=F*t
    mc(n,"Իմպուլս",M,f"Մարմնի վրա ${t}$ վ-ի ընթացքում ազդում է ${F}$ Ն հաստատուն ուժ։ Որքա՞ն է ուժի իմպուլսը։",
       U(J,"Ն·վ"),[U(F+t,"Ն·վ"),U(J+F,"Ն·վ"),U(F,"Ն·վ")],"$J=F\\Delta t$։",[f"$J={F}\\cdot {t}={J}$ Ն·վ"])
def t_spring_energy(n):
    k,xmm = uniq("springE", lambda:(R(2,12)*100,R(2,9))); x=xmm/10; Ep=k*x*x/2
    mc(n,"Առաձգականություն",M,f"${k}$ Ն/մ կոշտության զսպանակը ձգված է ${numt(x)}$ մ-ով։ Որքա՞ն է դեֆորմացիայի պոտենցիալ էներգիան։",
       U(round(Ep,2),"Ջ"),[U(round(k*x,2),"Ջ"),U(round(Ep*2,2),"Ջ"),U(round(k*x*x,2),"Ջ")],"$E_p=\\dfrac{kx^2}{2}$։",[f"$E_p=\\dfrac{{{k}\\cdot {numt(x)}^2}}{{2}}={num(round(Ep,2))}$ Ջ"])
def t_avg_speed(n):
    def _d():
        while True:
            t1=R(2,6); t2=R(2,6); vv=R(10,40); s1=R(20,150); s2=vv*(t1+t2)-s1
            if s2>0: return (s1,t1,s2,t2)
    s1,t1,s2,t2 = uniq("avgsp", _d); v=(s1+s2)//(t1+t2)
    mc(n,"Կինեմատիկա",M,f"Մարմինը ${s1}$ մ ճանապարհն անցավ ${t1}$ վ-ում, ապա ${s2}$ մ-ը՝ ${t2}$ վ-ում։ Որքա՞ն է միջին արագությունը։",
       U(v,"մ/վ"),[U(v+1,"մ/վ"),U((s1+s2)//2,"մ/վ"),U(v+2,"մ/վ")],"$v_{\\text{միջ}}=\\dfrac{s_1+s_2}{t_1+t_2}$։",[f"$v=\\dfrac{{{s1}+{s2}}}{{{t1}+{t2}}}={v}$ մ/վ"])
MECH = [t_force_ma,t_vel_vat,t_accel,t_freefall_h,t_freefall_v,t_ke,t_pe,t_power_fv,t_power_wt,
        t_hooke,t_momentum,t_centripetal,t_friction_force,t_friction_graph,t_two_perp,
        t_projectile_ratio,t_incline_comp,t_density,t_pressure,t_impulse,t_spring_energy,t_avg_speed]

# ---------------- THERMO ----------------
def t_heat(n):
    m,dT = uniq("heat", lambda:(R(1,6),R(5,45))); Q=4200*m*dT
    mc(n,"Ջերմաքանակ",M,f"Որքա՞ն ջերմաքանակ է պետք ${m}$ կգ ջրի ջերմաստիճանը ${dT}^\\circ$C-ով բարձրացնելու համար։ $c=4200$ Ջ/(կգ·Կ)։",
       U(Q,"Ջ"),[U(4200*m,"Ջ"),U(4200*dT,"Ջ"),U(Q+4200,"Ջ")],"$Q=cm\\Delta T$։",[f"$Q=4200\\cdot {m}\\cdot {dT}={Q}$ Ջ"])
def t_carnot(n):
    def _d():
        while True:
            T1=random.choice(range(300,1000,50)); T2=random.choice(range(150,800,50))
            if T2<T1: return (T1,T2)
    T1,T2 = uniq("carnot", _d); e=1-T2/T1; ep=round(e*100,2)
    mc(n,"Ջերմադինամիկա",H,f"Կառնոյի իդեալական ջերմային մեքենայի տաքացուցիչի ջերմաստիճանը ${T1}$ Կ է, սառնարանինը՝ ${T2}$ Կ։ Որքա՞ն է ՕԳԳ-ն։",
       f"{num(ep)}%",[f"{num(round(T2/T1*100,2))}%",f"{num(round(ep+10,2))}%","100%"],"$\\eta=1-\\dfrac{T_2}{T_1}$։",
       [f"$\\eta=1-\\dfrac{{{T2}}}{{{T1}}}={num(ep)}\\%$"])
def t_latent(n):
    idx,m10 = uniq("latent", lambda:(R(0,len(SUBST)-1),R(2,20))); name,L=SUBST[idx]; m=m10/10; Q=L*1e5*m
    mc(n,"Ֆազային անցումներ",M,f"Որքա՞ն ջերմաքանակ է պետք հալման ջերմաստիճանում գտնվող ${numt(m)}$ կգ {name} հալման համար։ Հալման տեսակարար ջերմությունը ${numt(L)}\\cdot10^{{5}}$ Ջ/կգ է։",
       f"${numt(round(Q/1e5,3))}\\cdot10^{{5}}$ Ջ",[f"${numt(L)}\\cdot10^{{5}}$ Ջ",f"${numt(round(Q/1e5*2,3))}\\cdot10^{{5}}$ Ջ",f"${numt(round(Q/1e5/2,3))}\\cdot10^{{5}}$ Ջ"],
       "$Q=\\lambda m$։",[f"$Q={numt(L)}\\cdot10^{{5}}\\cdot {numt(m)}={numt(round(Q/1e5,3))}\\cdot10^{{5}}$ Ջ"])
def t_gas_isotherm(n):
    def _d():
        while True:
            P1=R(2,9); V1=R(2,8); V2=R(2,8)
            if V2!=V1 and (P1*V1)%V2==0: return (P1,V1,V2)
    P1,V1,V2 = uniq("isoth", _d); P2=P1*V1//V2
    mc(n,"Իզոթերմ պրոցես",M,f"Իզոթերմ պրոցեսում գազի ճնշումը ${P1}$ ՄՊա էր ${V1}$ լ ծավալի դեպքում։ Որքա՞ն կդառնա ճնշումը, երբ ծավալը դառնա ${V2}$ լ։",
       U(P2,"ՄՊա"),[U(P1,"ՄՊա"),U(P2+1,"ՄՊա"),U(abs(P2-1) or P2+2,"ՄՊա")],"$P_1V_1=P_2V_2$։",[f"$P_2=\\dfrac{{{P1}\\cdot {V1}}}{{{V2}}}={P2}$ ՄՊա"])
def t_gaylussac(n):
    def _d():
        while True:
            T1=random.choice(range(200,600,50)); T2=random.choice(range(200,800,50)); P1=R(1,6)
            if T2!=T1 and (P1*T2)%T1==0: return (T1,T2,P1)
    T1,T2,P1 = uniq("gayl", _d); P2=P1*T2//T1
    mc(n,"Իզոխոր պրոցես",M,f"Հաստատուն ծավալում գազի ճնշումը ${P1}$ ՄՊա էր ${T1}$ Կ ջերմաստիճանում։ Որքա՞ն կդառնա ճնշումը ${T2}$ Կ-ում։",
       U(P2,"ՄՊա"),[U(P1,"ՄՊա"),U(P2+1,"ՄՊա"),U(P1+1,"ՄՊա")],"$\\dfrac{P_1}{T_1}=\\dfrac{P_2}{T_2}$։",[f"$P_2=\\dfrac{{{P1}\\cdot {T2}}}{{{T1}}}={P2}$ ՄՊա"])
THERMO = [t_heat,t_carnot,t_latent,t_gas_isotherm,t_gaylussac]

# ---------------- ELECTROMAGNETISM ----------------
def t_ohm_I(n):
    Rr,I = uniq("ohmI", lambda:(R(2,15),R(2,12))); U_=Rr*I
    mc(n,"Հաստատուն հոսանք",E,f"Որքա՞ն է հոսանքի ուժը հաղորդչում, եթե լարումը ${U_}$ Վ է, դիմադրությունը՝ ${Rr}$ Օմ։",
       U(I,"Ա"),[U(U_*Rr,"Ա"),U(I+1,"Ա"),U(U_,"Ա")],"$I=\\dfrac{U}{R}$։",[f"$I=\\dfrac{{{U_}}}{{{Rr}}}={I}$ Ա"])
def t_power_UI(n):
    U_,I = uniq("powUI", lambda:(R(4,240),R(2,9))); P=U_*I
    mc(n,"Հոսանքի հզորություն",M,f"Որքա՞ն է ${U_}$ Վ լարման տակ ${I}$ Ա հոսանք սպառող սարքի հզորությունը։",
       U(P,"Վտ"),[U(U_+I,"Վտ"),U(P+U_,"Վտ"),U(U_,"Վտ")],"$P=UI$։",[f"$P={U_}\\cdot {I}={P}$ Վտ"])
def t_parallel_R(n):
    def _d():
        while True:
            r1=R(2,60); r2=R(2,60)
            if (r1*r2)%(r1+r2)==0: return (r1,r2)
    r1,r2 = uniq("parR", _d); Rp=r1*r2//(r1+r2)
    mc(n,"Դիմադրություններ",M,f"${r1}$ Օմ և ${r2}$ Օմ դիմադրությունները միացված են զուգահեռ։ Որքա՞ն է ընդհանուր դիմադրությունը։",
       U(Rp,"Օմ"),[U(r1+r2,"Օմ"),U(Rp+1,"Օմ"),U(abs(r1-r2) or Rp+2,"Օմ")],"$\\dfrac{1}{R}=\\dfrac{1}{R_1}+\\dfrac{1}{R_2}$։",[f"$R=\\dfrac{{{r1}\\cdot {r2}}}{{{r1+r2}}}={Rp}$ Օմ"])
def t_series_R(n):
    r1,r2 = uniq("serR", lambda:(R(2,30),R(2,30))); Rs=r1+r2
    mc(n,"Դիմադրություններ",E,f"${r1}$ Օմ և ${r2}$ Օմ դիմադրությունները միացված են հաջորդաբար։ Որքա՞ն է ընդհանուր դիմադրությունը։",
       U(Rs,"Օմ"),[U(abs(r1-r2) or Rs+2,"Օմ"),U(r1*r2,"Օմ"),U(Rs+1,"Օմ")],"$R=R_1+R_2$։",[f"$R={r1}+{r2}={Rs}$ Օմ"])
def t_efield(n):
    q,r10 = uniq("efield", lambda:(R(1,9),R(1,6))); r=r10/10; Ee=9e9*q*1e-9/(r*r)
    mc(n,"Էլեկտրաստատիկա",M,f"Որքա՞ն է $q={q}\\cdot10^{{-9}}$ Կլ լիցքից ${numt(r)}$ մ հեռավորության վրա դաշտի լարվածությունը։ $k=9\\cdot10^{{9}}$ Ն·մ²/Կլ²։",
       U(round(Ee),"Ն/Կլ"),[U(round(Ee*2),"Ն/Կլ"),U(round(Ee/2),"Ն/Կլ"),U(round(Ee+q),"Ն/Կլ")],"$E=\\dfrac{kq}{r^2}$։",
       [f"$E=\\dfrac{{9\\cdot10^{{9}}\\cdot {q}\\cdot10^{{-9}}}}{{{numt(round(r*r,2))}}}={round(Ee)}$ Ն/Կլ"])
def t_capacitor(n):
    U_,C = uniq("cap", lambda:(R(2,12),R(1,20))); Q=C*U_
    mc(n,"Կոնդենսատոր",M,f"Կոնդենսատորի $Q={Q}\\cdot10^{{-6}}$ Կլ լիցքի դեպքում լարումը ${U_}$ Վ է։ Որքա՞ն է ունակությունը։",
       f"${C}\\cdot10^{{-6}}$ Ֆ",[f"${Q*U_}\\cdot10^{{-6}}$ Ֆ",f"${C+1}\\cdot10^{{-6}}$ Ֆ",f"${Q}\\cdot10^{{-6}}$ Ֆ"],"$C=\\dfrac{Q}{U}$։",[f"$C=\\dfrac{{{Q}\\cdot10^{{-6}}}}{{{U_}}}={C}\\cdot10^{{-6}}$ Ֆ"])
def t_current_work(n):
    U_,I,t = uniq("curw", lambda:(R(2,24),R(2,7),R(10,120))); A=U_*I*t
    mc(n,"Հոսանքի աշխատանք",M,f"Որքա՞ն աշխատանք է կատարում հոսանքը ${U_}$ Վ լարման տակ ${I}$ Ա հոսանք անցկացնող հաղորդչում ${t}$ վ-ում։",
       U(A,"Ջ"),[U(U_*I,"Ջ"),U(A+U_,"Ջ"),U(U_*t,"Ջ")],"$A=UIt$։",[f"$A={U_}\\cdot {I}\\cdot {t}={A}$ Ջ"])
def t_charge_It(n):
    I,t = uniq("chargeIt", lambda:(R(2,12),R(2,24))); q=I*t
    mc(n,"Էլեկտրական լիցք",E,f"Հաղորդչով ${t}$ վ-ի ընթացքում անցնում է ${I}$ Ա հաստատուն հոսանք։ Որքա՞ն է անցած լիցքը։",
       U(q,"Կլ"),[U(I+t,"Կլ"),U(q+I,"Կլ"),U(t,"Կլ")],"$q=It$։",[f"$q={I}\\cdot {t}={q}$ Կլ"])
def t_ohm_U(n):
    I,Rr = uniq("ohmU", lambda:(R(2,9),R(2,24))); U_=I*Rr
    mc(n,"Հաստատուն հոսանք",E,f"Որքա՞ն է լարումը ${Rr}$ Օմ դիմադրության վրա, եթե նրանով անցնում է ${I}$ Ա հոսանք։",
       U(U_,"Վ"),[U(I+Rr,"Վ"),U(U_+I,"Վ"),U(Rr,"Վ")],"$U=IR$։",[f"$U={I}\\cdot {Rr}={U_}$ Վ"])
def t_power_i2r(n):
    I,Rr = uniq("pi2r", lambda:(R(2,7),R(2,18))); P=I*I*Rr
    mc(n,"Հոսանքի հզորություն",M,f"Որքա՞ն հզորություն է անջատվում ${Rr}$ Օմ դիմադրության վրա, երբ նրանով անցնում է ${I}$ Ա հոսանք։",
       U(P,"Վտ"),[U(I*Rr,"Վտ"),U(P+Rr,"Վտ"),U(2*I*Rr,"Վտ")],"$P=I^2R$։",[f"$P={I}^2\\cdot {Rr}={P}$ Վտ"])
EM = [t_ohm_I,t_power_UI,t_parallel_R,t_series_R,t_efield,t_capacitor,t_current_work,t_charge_It,t_ohm_U,t_power_i2r]

# ---------------- OPTICS / QUANTUM / NUCLEAR ----------------
def t_wavelength_medium(n):
    def draw():
        nn = random.choice([1.2, 1.25, 1.5, 1.6, 2.0, 2.4, 2.5])
        lam = random.choice(range(400, 901, 10))
        return (lam, nn)
    lam, nn = uniq("wlm", draw)
    lam_m = lam / nn
    tries = 0
    while abs(lam_m - round(lam_m)) > 1e-9 and tries < 500:
        lam, nn = uniq("wlm", draw); lam_m = lam / nn; tries += 1
    lam_m = round(lam_m)
    mc(n,"Ալիքային օպտիկա",M,f"${lam}$ նմ ալիքի երկարությամբ լույսը վակուումից անցնում է ${numt(nn)}$ բեկման ցուցիչով միջավայր։ Որքա՞ն է ալիքի երկարությունը միջավայրում։",
       U(int(lam_m),"նմ"),[U(lam,"նմ"),U(int(lam_m)+10,"նմ"),U(int(round(lam*nn)),"նմ")],"$\\lambda'=\\dfrac{\\lambda}{n}$։",[f"$\\lambda'=\\dfrac{{{lam}}}{{{numt(nn)}}}={int(lam_m)}$ նմ"])
def t_photon_energy(n):
    lam = uniq("phE", lambda:(random.choice(range(200,901,10)),))[0]; E=6.6e-34*3e8/(lam*1e-9)
    Ee=round(E/1e-19,2)
    mc(n,"Քվանտային ֆիզիկա",M,f"Որքա՞ն է $\\lambda={lam}$ նմ ալիքի երկարությամբ ֆոտոնի էներգիան։ $h=6{{,}}6\\cdot10^{{-34}}$ Ջ·վ, $c=3\\cdot10^{{8}}$ մ/վ։",
       f"${numt(Ee)}\\cdot10^{{-19}}$ Ջ",[f"${numt(round(Ee*2,2))}\\cdot10^{{-19}}$ Ջ",f"${numt(round(Ee/2,2))}\\cdot10^{{-19}}$ Ջ",f"${numt(Ee)}\\cdot10^{{-27}}$ Ջ"],
       "$E=\\dfrac{hc}{\\lambda}$։",[f"$E=\\dfrac{{6{{,}}6\\cdot10^{{-34}}\\cdot 3\\cdot10^{{8}}}}{{{lam}\\cdot10^{{-9}}}}={numt(Ee)}\\cdot10^{{-19}}$ Ջ"])
def t_photon_momentum(n):
    lam = uniq("phMom", lambda:(random.choice(range(200,901,10)),))[0]; p=6.6e-34/(lam*1e-9); pp=round(p/1e-27,2)
    mc(n,"Քվանտային ֆիզիկա",M,f"Որքա՞ն է $\\lambda={lam}$ նմ ալիքի երկարությամբ ֆոտոնի իմպուլսը։ $h=6{{,}}6\\cdot10^{{-34}}$ Ջ·վ։",
       f"${numt(pp)}\\cdot10^{{-27}}$ կգ·մ/վ",[f"${numt(round(pp*2,2))}\\cdot10^{{-27}}$ կգ·մ/վ",f"${numt(round(pp/2,2))}\\cdot10^{{-27}}$ կգ·մ/վ",f"${numt(pp)}\\cdot10^{{-34}}$ կգ·մ/վ"],
       "$p=\\dfrac{h}{\\lambda}$։",[f"$p=\\dfrac{{6{{,}}6\\cdot10^{{-34}}}}{{{lam}\\cdot10^{{-9}}}}={numt(pp)}\\cdot10^{{-27}}$ կգ·մ/վ"])
def t_nucleus(n):
    sym,Z,A = uniq("nucleus", lambda: random.choice(ELEMENTS)); Nn=A-Z
    mc(n,"Ատոմի միջուկ",E,f"Ի՞նչ մասնիկներից է կազմված $^{{{A}}}_{{{Z}}}\\mathrm{{{sym}}}$ միջուկը։",
       f"${Z}$ պրոտոնից և ${Nn}$ նեյտրոնից",[f"${Z}$ պրոտոնից և ${A}$ նեյտրոնից",f"${Nn}$ պրոտոնից և ${Z}$ նեյտրոնից",f"${Z}$ էլեկտրոնից և ${Nn}$ պրոտոնից"],
       "$Z$՝ պրոտոն, $A-Z$՝ նեյտրոն։",[f"$Z={Z}$, $N={A}-{Z}={Nn}$"])
def t_halflife(n):
    c,k = uniq("halflife", lambda:(random.choice([1,2,3,5,7,10,25,50,100]),R(2,8))); N0=c*(2**k)
    mc(n,"Ռադիոակտիվություն",M,f"Ռադիոակտիվ նմուշում սկզբում կար ${N0}$ միջուկ։ Քանի՞սը կմնա չքայքայված ${k}$ կիսաքայքայման պարբերությունից հետո։",
       str(c),[str(2*c),str(c*k),str(N0//k if N0%k==0 else c+1)],"$N=\\dfrac{N_0}{2^{t/T}}$։",[f"$N=\\dfrac{{{N0}}}{{2^{{{k}}}}}=\\dfrac{{{N0}}}{{{2**k}}}={c}$"])
OQN = [t_wavelength_medium,t_photon_energy,t_photon_momentum,t_nucleus,t_halflife]

# ---------------- STANDALONE FREE-RESPONSE (41-44) ----------------
def fr_braking(n):
    vk,mu = uniq("brk", lambda:(random.choice([18,36,54,72,90,108,126,144,162,180,198,216]),random.choice([2,25,3,4,5,6,75,8])/10))
    v=vk/3.6; s=v*v/(2*mu*10); sd=num(round(s,2))
    fr(n,"Դինամիկա",H,f"${vk}$ կմ/ժ արագությամբ շարժվող ավտոմեքենան կտրուկ արգելակում է։ Անիվների և ճանապարհի միջև շփման գործակիցը ${numt(mu)}$ է, $g=10$ մ/վ²։ Ի՞նչ ճանապարհ կանցնի մեքենան մինչև կանգնելը (մ, կլորացրած հարյուրերորդականով)։",
       sd,"$s=\\dfrac{v^2}{2\\mu g}$ ($v$-ն մ/վ-ով)։",[f"$v={vk}$ կմ/ժ $={numt(round(v,2))}$ մ/վ",f"$s=\\dfrac{{{numt(round(v,2))}^2}}{{2\\cdot {numt(mu)}\\cdot 10}}={sd}$ մ"])
def fr_gastemp(n):
    T,nc = uniq("gastemp", lambda:(random.choice([200,250,300,350,400,450,500,550,600,700,800]),random.choice([2,3,4,5,6,8,10])))
    P=nc*1.38e-23*T*1e26; Pm=P/1e6
    fr(n,"Իդեալական գազ",M,f"Իդեալական գազի ճնշումը ${numt(round(Pm,3))}$ ՄՊա է, մոլեկուլների կոնցենտրացիան՝ ${nc}\\cdot10^{{26}}$ մ⁻³։ Բոլցմանի հաստատունը $1{{,}}38\\cdot10^{{-23}}$ Ջ/Կ։ Որքա՞ն է գազի ջերմաստիճանը (Կ)։",
       T,"$p=nkT\\Rightarrow T=\\dfrac{p}{nk}$։",[f"$T=\\dfrac{{{numt(round(Pm,3))}\\cdot10^{{6}}}}{{{nc}\\cdot10^{{26}}\\cdot 1{{,}}38\\cdot10^{{-23}}}}={T}$ Կ"])
def fr_magcurrent(n):
    I,B,L = uniq("magcur", lambda:(random.choice([5,8,10,12,6,15,4,20]),random.choice([2,4,5,8])/10,random.choice([5,10,20])/10))
    F=I*B*L
    fr(n,"Մագնիսական դաշտ",M,f"${numt(L)}$ մ երկարությամբ ուղիղ հաղորդիչը գտնվում է ${numt(B)}$ Տլ ինդուկցիայով դաշտում՝ գծերին ուղղահայաց։ Նրա վրա ազդող ուժը ${numt(round(F,3))}$ Ն է։ Որքա՞ն է հոսանքի ուժը (Ա)։",
       I,"$F=BIL\\Rightarrow I=\\dfrac{F}{BL}$։",[f"$I=\\dfrac{{{numt(round(F,3))}}}{{{numt(B)}\\cdot {numt(L)}}}={I}$ Ա"])
def fr_photoeffect(n):
    def _d():
        for _ in range(2000):
            lam=random.choice([220,240,264,275,300,330,352,375,396,412,440,462,495,528,550,586,600,628,660,700,733,792,825,880]); Uu=random.choice([1,2,3,4])
            if 6.6e-34*3e8/(lam*1e-9)-1.6e-19*Uu>0.2e-19: return (lam,Uu)
    lam,Uu = uniq("phe", _d)
    Ej=6.6e-34*3e8/(lam*1e-9); Aj=Ej-1.6e-19*Uu
    Ae=round(Aj/1e-19,2); Ee=round(Ej/1e-19,2)
    fr(n,"Ֆոտոէֆեկտ",H,f"Մետաղի կաթոդը լուսավորում են ${lam}$ նմ ալիքի երկարությամբ ճառագայթմամբ։ Ելքի աշխատանքը ${numt(Ae)}\\cdot10^{{-19}}$ Ջ է։ Որքա՞ն է կասեցնող լարումը (Վ)։ $h=6{{,}}6\\cdot10^{{-34}}$ Ջ·վ, $c=3\\cdot10^{{8}}$ մ/վ, $e=1{{,}}6\\cdot10^{{-19}}$ Կլ։",
       Uu,"$\\dfrac{hc}{\\lambda}=A+eU_{\\text{կաս}}$։",
       [f"$\\dfrac{{hc}}{{\\lambda}}={numt(Ee)}\\cdot10^{{-19}}$ Ջ",f"$eU={numt(round(Ee-Ae,2))}\\cdot10^{{-19}}$ Ջ",f"$U_{{\\text{{կաս}}}}={Uu}$ Վ"])
FR_TEMPLATES = [fr_braking, fr_gastemp, fr_magcurrent, fr_photoeffect]

# ---------------- GROUPED (45-68) ----------------
def _grp(intro, subs, key):
    for (nn, topic, diff, q, ans, hint, steps, fig) in subs:
        fr(nn, topic, diff, f"{intro}\n\n{q}", ans, hint, steps, group=key, fig=fig)

def g1_forces(a):
    def draw():
        while True:
            x,y,c = random.choice(PYTH)
            divs=[d for d in range(2,c) if c%d==0]
            if divs: return (x,y,c,random.choice(divs))
    x,y,c,m = uniq("g1", draw); acc=c//m
    intro=f"(45-46) ${m}$ կգ զանգվածով մարմնի վրա ազդում են իրար փոխուղղահայաց $F_1={x}$ Ն և $F_2={y}$ Ն ուժեր։"
    _grp(intro,[
     (a,"Դինամիկա",M,"Որքա՞ն է մարմնի արագացումը (մ/վ²)։",acc,"$F=\\sqrt{F_1^2+F_2^2}$, $a=\\dfrac{F}{m}$։",[f"$F=\\sqrt{{{x}^2+{y}^2}}={c}$ Ն",f"$a=\\dfrac{{{c}}}{{{m}}}={acc}$ մ/վ²"],None),
     (a+1,"Դինամիկա",M,"Ի՞նչ մեծությամբ լրացուցիչ ուժ պետք է ազդի, որպեսզի արագացումը դառնա զրո (Ն)։",c,"Լրացուցիչ ուժը հավասարակշռում է համազորը։",[f"Համազորը՝ ${c}$ Ն",f"Լրացուցիչ ուժը՝ ${c}$ Ն"],None),
    ],"g1")
def g2_shm(a):
    A,w = uniq("g2", lambda:(random.choice([2,4,5,8,10,15,20])/100,random.choice([50,80,100,120,150,200,250,300])))
    vmax=A*w; amax=A*w*w; mg=random.choice([10,20,50,5])
    intro=f"(47-48) ${mg}$ գ զանգվածով գնդիկի տատանումները նկարագրվում են $x={numt(A)}\\sin({w}t)$ հավասարմամբ (ՄՀ միավորներով)։"
    _grp(intro,[
     (a,"Տատանումներ",M,"Որքա՞ն է գնդիկի առավելագույն արագությունը (մ/վ)։",num(vmax),"$v_{max}=A\\omega$։",[f"$v_{{max}}={numt(A)}\\cdot {w}={num(vmax)}$ մ/վ"],None),
     (a+1,"Տատանումներ",H,"Որքա՞ն է գնդիկի առավելագույն արագացումը (մ/վ²)։",num(amax),"$a_{max}=A\\omega^2$։",[f"$a_{{max}}={numt(A)}\\cdot {w}^2={num(amax)}$ մ/վ²"],None),
    ],"g2")
def g3_bullet(a):
    def draw():
        for _ in range(800):
            mg=random.choice([2,3,4,5]); v1=random.choice([120,150,200,250,300,350,400]); v2=random.choice([50,80,100,120,150,200])
            if v2<v1:
                dE=0.5*(mg/1000)*(v1*v1-v2*v2)
                if abs(dE-round(dE))<1e-9 and any((int(round(dE))*ff)%100==0 for ff in [40,50,60,75,80]):
                    return (mg,v1,v2)
    mg,v1,v2 = uniq("g3", draw)
    dE=int(round(0.5*(mg/1000)*(v1*v1-v2*v2)))
    frr=random.choice([ff for ff in [40,50,60,75,80] if (dE*ff)%100==0])/100
    Q=int(round(frr*dE)); pct=int(frr*100)
    intro=f"(49-50) ${mg}$ գ զանգվածով մանրագնդակը ${v1}$ մ/վ արագությամբ ծակում-անցնում է տախտակը՝ դուրս գալով ${v2}$ մ/վ արագությամբ։"
    _grp(intro,[
     (a,"Մեխանիկական էներգիա",M,"Որքա՞ն մեխանիկական էներգիա է կորցնում մանրագնդակը (Ջ)։",dE,"$\\Delta E=\\dfrac{m(v_1^2-v_2^2)}{2}$։",[f"$\\Delta E=\\dfrac{{{numt(mg/1000)}({v1}^2-{v2}^2)}}{{2}}={dE}$ Ջ"],None),
     (a+1,"Ներքին էներգիա",M,f"Կորցրած էներգիայի ${pct}\\%$-ը ծախսվում է ներքին էներգիայի աճի համար։ Որքա՞ն է այդ ջերմաքանակը (Ջ)։",Q,f"$Q={numt(frr)}\\cdot\\Delta E$։",[f"$Q={numt(frr)}\\cdot {dE}={Q}$ Ջ"],None),
    ],"g3")
def g4_circuit(a):
    seen=USED.setdefault("g4",set())
    for _ in range(300):
        eps=random.choice([6,9,10,12,15,18,20,24,30,36]); r=random.choice([1,2,3,4]); Rr=random.choice([2,3,4,5,6,8,9,10])
        if eps%(Rr+r)==0 and (eps,r,Rr) not in seen:
            seen.add((eps,r,Rr)); break
    I=eps//(Rr+r); Uv=I*Rr
    intro=f"(51-52) Նկարում պատկերված շղթայում հոսանքի աղբյուրի ԷլՇՈւ-ն $\\varepsilon={eps}$ Վ է, ներքին դիմադրությունը՝ $r={r}$ Օմ, արտաքին դիմադրությունը՝ $R={Rr}$ Օմ։ Ամպերաչափն ու վոլտաչափն իդեալական են։"
    _grp(intro,[
     (a,"Հաստատուն հոսանք",M,"Որքա՞ն է ամպերաչափի ցուցմունքը (Ա)։",I,"$I=\\dfrac{\\varepsilon}{R+r}$։",[f"$I=\\dfrac{{{eps}}}{{{Rr}+{r}}}={I}$ Ա"],fig_magnetic() if False else fig_circuit()),
     (a+1,"Հաստատուն հոսանք",M,"Որքա՞ն է վոլտաչափի ցուցմունքը (Վ)։",Uv,"$U=IR$։",[f"$U={I}\\cdot {Rr}={Uv}$ Վ"],None),
    ],"g4")
def g5_optics(a):
    def draw():
        while True:
            n=random.choice([1.2,1.25,1.5,1.6,2.0,2.5,3.0]); lam=random.choice(range(300,901,10))
            if abs(lam/n-round(lam/n))<1e-9: return (n,lam)
    n,lam = uniq("g5", draw); v=3e8/n; lam_m=lam/n
    intro=f"(53-54) Լույսը ${lam}$ նմ ալիքի երկարությամբ վակուումից անցնում է թափանցիկ միջավայր, որի բեկման ցուցիչը ${numt(n)}$ է։ Վակուումում լույսի արագությունը $3\\cdot10^{{8}}$ մ/վ է։"
    _grp(intro,[
     (a,"Օպտիկա",M,"Որքա՞ն է լույսի արագությունը միջավայրում։ Պատասխանը արտահայտեք $10^{8}$ մ/վ-ով։",num(round(v/1e8,3)),"$v=\\dfrac{c}{n}$։",[f"$v=\\dfrac{{3\\cdot10^{{8}}}}{{{numt(n)}}}={num(round(v/1e8,3))}\\cdot10^{{8}}$ մ/վ"],None),
     (a+1,"Օպտիկա",M,"Որքա՞ն է լույսի ալիքի երկարությունը միջավայրում (նմ)։",int(round(lam_m)),"$\\lambda'=\\dfrac{\\lambda}{n}$։",[f"$\\lambda'=\\dfrac{{{lam}}}{{{numt(n)}}}={int(round(lam_m))}$ նմ"],None),
    ],"g5")
def g6_gaspv(a):
    P,V2 = uniq("g6", lambda:(random.choice([1,2,3,4,5,6,7,8]),random.choice([2,3,4,5,6,7,8]))); V1=1
    A=P*(V2-V1)*100; dU=P*(V2-V1)*100*3//2; Q=A+dU
    intro=f"(55-57) Միատոմ իդեալական գազը իզոբար ընդարձակվում է $P={P}\\cdot10^{{5}}$ Պա հաստատուն ճնշման տակ՝ ծավալը ${V1}\\cdot10^{{-3}}$ մ³-ից ($1$ վիճակ) դառնում է ${V2}\\cdot10^{{-3}}$ մ³ ($2$ վիճակ) (տես գրաֆիկը)։"
    _grp(intro,[
     (a,"Ջերմադինամիկա",M,"Որքա՞ն աշխատանք է կատարում գազը (Ջ)։",A,"Իզոբար՝ $A=P\\Delta V$։",[f"$A={P}\\cdot10^{{5}}\\cdot({V2}-{V1})\\cdot10^{{-3}}={A}$ Ջ"],fig_pv(V1,V2,P)),
     (a+1,"Ջերմադինամիկա",M,"Որքա՞ն է $T_2/T_1$ ջերմաստիճանների հարաբերությունը։",str(V2),"Իզոբար՝ $V\\propto T$։",[f"$\\dfrac{{T_2}}{{T_1}}=\\dfrac{{V_2}}{{V_1}}={V2}$"],None),
     (a+2,"Ջերմադինամիկա",H,"Որքա՞ն ջերմաքանակ է հաղորդվել գազին (Ջ)։",Q,"$Q=\\Delta U+A$, միատոմ՝ $\\Delta U=\\dfrac{3}{2}P\\Delta V$։",[f"$\\Delta U=\\dfrac{{3}}{{2}}\\cdot {A}={dU}$ Ջ",f"$Q={dU}+{A}={Q}$ Ջ"],None),
    ],"g6")
LENS_TRIPLES=[]
for _Fc in [10,12,15,20,25,30]:
    for _dc in [11,12,14,15,16,18,20,24,25,30,36,40,45,50,60]:
        if _dc>_Fc and (_Fc*_dc)%(_dc-_Fc)==0:
            _fc=_Fc*_dc//(_dc-_Fc); _G=_fc/_dc
            if abs(_G*100-round(_G*100))<1e-9 and _fc<=200:
                LENS_TRIPLES.append((_Fc/100,_dc/100,_fc/100,round(_G,2)))
def g7_lens(a):
    def draw():
        F,d,f,G = random.choice(LENS_TRIPLES); h = random.choice([2,4,6])
        return (F,d,f,G,h)
    F,d,f,G,h = uniq("g7", draw)
    Himg=G*h; tries=0
    while abs(Himg-round(Himg))>1e-9 and tries<300:
        F,d,f,G,h = uniq("g7", draw); Himg=G*h; tries+=1
    Himg=int(round(Himg)); fdisp=num(f)
    intro=f"(58-60) Բարակ ժողովող ոսպնյակի կիզակետային հեռավորությունը $F={numt(F)}$ մ է։ Առարկան, որի բարձրությունը ${h}$ սմ է, գտնվում է ոսպնյակից $d={numt(d)}$ մ հեռավորության վրա։"
    _grp(intro,[
     (a,"Օպտիկա",M,"Որքա՞ն է պատկերի հեռավորությունը ոսպնյակից (մ)։",fdisp,"$\\dfrac{1}{F}=\\dfrac{1}{d}+\\dfrac{1}{f}$։",[f"$\\dfrac{{1}}{{f}}=\\dfrac{{1}}{{{numt(F)}}}-\\dfrac{{1}}{{{numt(d)}}}$",f"$f={numt(f)}$ մ"],None),
     (a+1,"Օպտիկա",M,"Որքա՞ն է գծային խոշորացումը։",num(G),"$\\Gamma=\\dfrac{f}{d}$։",[f"$\\Gamma=\\dfrac{{{numt(f)}}}{{{numt(d)}}}={num(G)}$"],None),
     (a+2,"Օպտիկա",M,"Որքա՞ն է պատկերի բարձրությունը (սմ)։",Himg,"$H=\\Gamma h$։",[f"$H={num(G)}\\cdot {h}={Himg}$ սմ"],None),
    ],"g7")
def g8_pulley(a):
    def draw():
        while True:
            m1=random.randint(2,23); m2=random.randint(1,21)
            if (10*m2)%(m1+m2)==0: return (m1,m2)
    m1,m2 = uniq("g8", draw); t=random.choice([2,3,4])
    acc=10*m2//(m1+m2); T=m1*acc; v=acc*t; s=acc*t*t//2
    intro=f"(61-64) Հարթ սեղանի վրա գտնվող $m_1={m1}$ կգ մարմինը թելով, անշփ ճախարակի վրայով, կապված է կախված $m_2={m2}$ կգ մարմնի հետ (տես նկարը)։ Սեղանի և $m_1$-ի միջև շփումը բացակայում է, $g=10$ մ/վ²։ Համակարգը շարժվում է դադարից։"
    _grp(intro,[
     (a,"Դինամիկա",M,"Որքա՞ն է համակարգի արագացումը (մ/վ²)։",acc,"$a=\\dfrac{m_2 g}{m_1+m_2}$։",[f"$a=\\dfrac{{{m2}\\cdot 10}}{{{m1}+{m2}}}={acc}$ մ/վ²"],fig_pulley()),
     (a+1,"Դինամիկա",M,"Որքա՞ն է թելի լարվածությունը (Ն)։",T,"$T=m_1 a$։",[f"$T={m1}\\cdot {acc}={T}$ Ն"],None),
     (a+2,"Կինեմատիկա",M,f"Որքա՞ն կլինի արագությունը ${t}$ վ հետո (մ/վ)։",v,"$v=at$։",[f"$v={acc}\\cdot {t}={v}$ մ/վ"],None),
     (a+3,"Կինեմատիկա",M,f"Ի՞նչ ճանապարհ կանցնի համակարգը ${t}$ վ-ում (մ)։",s,"$s=\\dfrac{at^2}{2}$։",[f"$s=\\dfrac{{{acc}\\cdot {t}^2}}{{2}}={s}$ մ"],None),
    ],"g8")
def g9_magnetic(a):
    v6,B = uniq("g9", lambda:(random.choice([1,2,3,4,5,6,7,8]),random.choice([2,25,4,5,8,10,16])/10))
    v=v6*1e6; q=1.6e-19; m=1.6e-27; F=q*v*B; r=m*v/(q*B); T=2*3*m/(q*B); acc=v*v/r
    intro=f"(65-68) Պրոտոնը $v={v6}\\cdot10^{{6}}$ մ/վ արագությամբ մտնում է $B={numt(B)}$ Տլ ինդուկցիայով համասեռ մագնիսական դաշտ՝ գծերին ուղղահայաց (տես նկարը)։ Պրոտոնի լիցքը $q=1{{,}}6\\cdot10^{{-19}}$ Կլ է, զանգվածը՝ $m=1{{,}}6\\cdot10^{{-27}}$ կգ։"
    _grp(intro,[
     (a,"Մագնիսական դաշտ",M,"Որքա՞ն է պրոտոնի վրա ազդող ուժը։ Պատասխանը բազմապատկեք $10^{13}$-ով։",num(round(F*1e13,3)),"$F=qvB$։",[f"$F=1{{,}}6\\cdot10^{{-19}}\\cdot {v6}\\cdot10^{{6}}\\cdot {numt(B)}={num(round(F*1e13,3))}\\cdot10^{{-13}}$ Ն"],fig_magnetic()),
     (a+1,"Մագնիսական դաշտ",M,"Որքա՞ն է շրջանագծի շառավիղը (մ)։",num(round(r,4)),"$r=\\dfrac{mv}{qB}$։",[f"$r=\\dfrac{{1{{,}}6\\cdot10^{{-27}}\\cdot {v6}\\cdot10^{{6}}}}{{1{{,}}6\\cdot10^{{-19}}\\cdot {numt(B)}}}={num(round(r,4))}$ մ"],None),
     (a+2,"Մագնիսական դաշտ",H,"Որքա՞ն է պտտման պարբերությունը։ Ընդունել $\\pi=3$։ Պատասխանը բազմապատկեք $10^{7}$-ով։",num(round(T*1e7,3)),"$T=\\dfrac{2\\pi m}{qB}$։",[f"$T=\\dfrac{{2\\cdot 3\\cdot 1{{,}}6\\cdot10^{{-27}}}}{{1{{,}}6\\cdot10^{{-19}}\\cdot {numt(B)}}}={num(round(T*1e7,3))}\\cdot10^{{-7}}$ վ"],None),
     (a+3,"Մագնիսական դաշտ",H,"Որքա՞ն է կենտրոնաձիգ արագացումը։ Պատասխանը բազմապատկեք $10^{-13}$-ով։",num(round(acc*1e-13,3)),"$a=\\dfrac{v^2}{r}$։",[f"$a=\\dfrac{{({v6}\\cdot10^{{6}})^2}}{{{num(round(r,4))}}}={num(round(acc*1e-13,3))}\\cdot10^{{13}}$ մ/վ²"],None),
    ],"g9")
GROUPS=[g1_forces,g2_shm,g3_bullet,g4_circuit,g5_optics,g6_gaspv,g7_lens,g8_pulley,g9_magnetic]

# ---------------- MULTI-STATEMENT pool (69-70) ----------------
def ms_water(n):
    m = uniq("ms_water", lambda:(R(50,600),))[0]
    ms(n,"Ջերմադինամիկա",H,f"Բաժակի մեջ լցված $0^\\circ$C ջերմաստիճանի ${m}$ գ ջուրը փոխակերպվեց $0^\\circ$C ջերմաստիճանի սառույցի։ Հաստատե՛ք կամ ժխտե՛ք հետևյալ պնդումները։",
      ["Ջրի ներքին էներգիան փոքրացավ","Մոլեկուլների ջերմային շարժման միջին արագությունը փոքրացավ","Մոլեկուլների փոխազդեցության պոտենցիալ էներգիան փոքրացավ","Ջուրը շրջապատին ջերմաքանակ հաղորդեց","Մոլեկուլների կարգավորվածության աստիճանը մեծացավ","Գործընթացը ընթացավ ջերմաստիճանի փոփոխությամբ"],
      {0,2,3,4},"Բյուրեղացումը՝ հաստատուն ջերմաստիճանում, էներգիա անջատելով։",["$T=$const (Բ, Զ սխալ)","Անջատվում է ջերմություն, $U$ փոքրանում է (Ա, Դ)","Սառույցն ավելի կարգավորված (Գ, Ե)"])
def ms_photon(n):
    lam = uniq("ms_photon", lambda:(random.choice(range(200,901,10)),))[0]
    ms(n,"Քվանտային ֆիզիկա",M,f"Մետաղի մակերևույթը լուսավորվում է ${lam}$ նմ ալիքի երկարությամբ լույսով։ Հաստատե՛ք կամ ժխտե՛ք ֆոտոնի և ֆոտոէֆեկտի վերաբերյալ հետևյալ պնդումները։",
      ["Ֆոտոնը լույսի քվանտն է","Ֆոտոնի էներգիան որոշվում է $E=h\\nu$ բանաձևով","Ֆոտոէֆեկտ դիտվում է լույսի ցանկացած հաճախության դեպքում","Ֆոտոնի իմպուլսը՝ $p=E/c$"],
      {0,1,3},"Ֆոտոէֆեկտն ունի կարմիր սահման։",["$E=h\\nu$ (Ա, Բ)","Ֆոտոէֆեկտ՝ միայն $\\nu\\ge\\nu_{\\text{կարմիր}}$ (Գ սխալ)","$p=\\dfrac{h}{\\lambda}$ (Դ)"])
def ms_gasheat(n):
    T1,fac = uniq("ms_gas", lambda:(random.choice(range(200,600,20)),random.choice([2,3])))
    ms(n,"Ջերմադինամիկա",H,f"Հաստատուն ծավալով անոթում գազի ջերմաստիճանը ${T1}$ Կ-ից բարձրացնում են մինչև ${T1*fac}$ Կ։ Հաստատե՛ք կամ ժխտե՛ք հետևյալ պնդումները։",
      ["Գազի ներքին էներգիան մեծացավ","Գազը կատարեց դրական աշխատանք","Գազի ճնշումը մեծացավ","Մոլեկուլների միջին կինետիկ էներգիան մեծացավ","Գազին հաղորդված ջերմությունն ամբողջությամբ գնաց ներքին էներգիայի աճին","Գազի ծավալը մեծացավ"],
      {0,2,3,4},"Իզոխոր՝ $V=$const, $A=0$, $Q=\\Delta U$։",["$A=0$ (Բ, Զ սխալ)","$Q=\\Delta U$ (Ե ճիշտ)","$T\\uparrow\\Rightarrow P\\uparrow,\\ \\bar E_k\\uparrow$ (Գ, Դ)"])
def ms_freefall(n):
    h = uniq("ms_ff", lambda:(R(20,300),))[0]
    ms(n,"Մեխանիկա",M,f"Մարմինը ազատ ընկնում է ${h}$ մ բարձրությունից դադարից (օդի դիմադրությունն անտեսել)։ Հաստատե՛ք կամ ժխտե՛ք հետևյալ պնդումները։",
      ["Մարմնի արագացումը հաստատուն է","Մարմնի արագությունը ժամանակի հետ գծայնորեն մեծանում է","Անցած ճանապարհը ուղիղ համեմատական է ժամանակի քառակուսուն","Մարմնի կինետիկ էներգիան պահպանվում է","Մարմնի վրա ազդում է միայն ծանրության ուժը","Արագացումը կախված է մարմնի զանգվածից"],
      {0,1,2,4},"Ազատ անկում՝ $a=g=$const, $v=gt$, $h=\\dfrac{gt^2}{2}$։",["$a=g$ (Ա, Ե ճիշտ)","$v=gt,\\ h\\propto t^2$ (Բ, Գ)","$E_k$ աճում է (Դ սխալ), $a$ կախված չէ $m$-ից (Զ սխալ)"])
MS_POOL=[ms_water, ms_photon, ms_gasheat, ms_freefall]

# =========================================================== BUILD
def rotate(lst, off, k): return [lst[(off+i) % len(lst)] for i in range(k)]

def build_exam(idx):
    global _CUR, _pos_counter
    _CUR = []; _pos_counter = idx
    n = 1
    for t in rotate(MECH, idx*3, 20): t(n); n += 1
    for t in rotate(THERMO, idx, 5): t(n); n += 1
    for t in rotate(EM, idx*2, 10): t(n); n += 1
    for t in rotate(OQN, idx, 5): t(n); n += 1
    for t in FR_TEMPLATES: t(n); n += 1
    for g in GROUPS:
        g(n)
        n = _CUR[-1]["number"] + 1
    for t in rotate(MS_POOL, idx, 2): t(n); n += 1
    assert [q["number"] for q in _CUR] == list(range(1, 71)), (idx, [q["number"] for q in _CUR])
    return {"exam_id": f"AEE-PHYS-{idx:03d}", "title": f"Միասնական քննություն — Ֆիզիկա (թեստ {idx})",
            "question_count": 70, "subject": "physics", "questions": _CUR}

def sig(q):
    return (q["question"] + "|" + q.get("figure_svg","") + "|" +
            "".join(q.get("options",[])) + "|" + str(q.get("answer","")) +
            "|" + "".join(q.get("statements",[])))
seen_full = set(); seen_txt = set(); full_dupes = 0; txt_dupes = 0
for idx in range(1, 51):
    ex = build_exam(idx)
    for q in ex["questions"]:
        sg = sig(q)
        if sg in seen_full: full_dupes += 1
        seen_full.add(sg)
        if q["question"] in seen_txt: txt_dupes += 1
        seen_txt.add(q["question"])
    json.dump(ex, open(os.path.join(OUT, f"armenian_entrance_physics_{idx:02d}.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print(f"Generated 50 physics exams. Unique full-questions: {len(seen_full)} / 3500. "
      f"True duplicate questions: {full_dupes}. (Shared-prompt-only, e.g. graph questions: {txt_dupes - full_dupes})")
