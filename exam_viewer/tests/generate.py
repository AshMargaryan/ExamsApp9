import json, random, math, os, itertools

random.seed(20260719)
OUT_DIR = "exams"
os.makedirs(OUT_DIR, exist_ok=True)

USED = {}  # (template_name) -> set of param tuples, global across all 50 exams

def fnum(x):
    """Format a number Armenian-style (decimal comma), strip .0 for ints."""
    if isinstance(x, float):
        if abs(x - round(x)) < 1e-9:
            return str(int(round(x)))
        s = f"{x:.2f}".rstrip('0').rstrip('.')
        return s.replace('.', ',')
    return str(x)

def frac(a, b):
    g = math.gcd(a, b)
    a, b = a // g, b // g
    if b < 0:
        a, b = -a, -b
    return a, b

def pythagorean_triples(max_m=25, max_scale=6):
    """Generate a large pool of (leg1, leg2, hyp) integer right-triangle triples."""
    triples = []
    for m in range(2, max_m):
        for n in range(1, m):
            if (m - n) % 2 == 1 and math.gcd(m, n) == 1:
                a = m * m - n * n
                b = 2 * m * n
                c = m * m + n * n
                for scale in range(1, max_scale + 1):
                    triples.append((a * scale, b * scale, c * scale))
    return triples

PYTHAG_POOL = pythagorean_triples()

def pythagorean_vectors(max_coord=25):
    """(x, y) pairs (x,y can be signed, nonzero) with integer magnitude sqrt(x^2+y^2)."""
    pool = []
    for x in range(-max_coord, max_coord + 1):
        for y in range(-max_coord, max_coord + 1):
            if x == 0 and y == 0:
                continue
            s = x * x + y * y
            r = math.isqrt(s)
            if r * r == s:
                pool.append((x, y))
    return pool

VEC_MAG_POOL = pythagorean_vectors()

def unique_params(template_name, gen_fn, max_tries=2000):
    """gen_fn() -> tuple of params (hashable). Returns a fresh, never-used tuple."""
    s = USED.setdefault(template_name, set())
    for _ in range(max_tries):
        p = gen_fn()
        if p not in s:
            s.add(p)
            return p
    raise RuntimeError(f"Could not find unique params for {template_name}")

def mcq_options(correct, wrongs, fmt=fnum):
    """Shuffle correct+wrongs (as raw numbers or strings), return (options[4], correct_letter)."""
    letters = ["Ա", "Բ", "Գ", "Դ"]
    vals = [correct] + wrongs
    # ensure textual uniqueness of options
    texts = []
    seen = set()
    for v in vals:
        t = fmt(v) if not isinstance(v, str) else v
        while t in seen:
            if isinstance(v, (int, float)):
                v = v + (1 if random.random() < 0.5 else -1)
                t = fmt(v)
            else:
                t = t + "'"
        seen.add(t)
        texts.append(t)
    idx = list(range(4))
    random.shuffle(idx)
    options = [texts[i] for i in idx]
    correct_letter = letters[idx.index(0)]
    return options, correct_letter

def mk(number, topic, qtype, question, difficulty, hint, steps, group=None,
       options=None, correct_option=None, answer=None, statements=None):
    d = {
        "number": number,
        "topic": topic,
        "group": group,
        "type": qtype,
        "question": question,
        "difficulty": difficulty,
        "hint": hint,
        "solution_steps": steps,
    }
    if qtype == "single_choice":
        d["options"] = options
        d["correct_option"] = correct_option
    elif qtype == "multi_statement":
        d["statements"] = statements
        d["correct_option"] = correct_option
    else:  # free_response
        d["answer"] = answer
    return d

# ---------------------------------------------------------------
# 1. NUMBER THEORY  (Q1-4, MCQ)
# ---------------------------------------------------------------
def nt_gcd_lcm(n):
    def draw():
        p = random.randint(2, 11)
        q = random.randint(2, 11)
        while math.gcd(p, q) != 1:
            q = random.randint(2, 11)
        g = random.randint(2, 9)
        return (p, q, g)
    p, q, g = unique_params("nt_gcd_lcm", draw)
    a, b = p * g, q * g
    lcm = p * q * g
    ask_lcm = random.random() < 0.5
    if ask_lcm:
        correct = lcm
        wrongs = [p * q, a * b // g // 2 if a * b // g // 2 != lcm else lcm + g, g, a + b]
        q_txt = f"Ինչքա՞ն է {a} և {b} թվերի փոքրագույն ընդհանուր բազմապատիկը (ԱՄԲ)։"
        h = "Օգտվեք բանաձևից՝ ԱՄԲ(a,b)·ԽԱԲ(a,b)=a·b, կամ վերլուծեք բազմապատկիչների։"
        steps = [f"{a}={p}·{g}, {b}={q}·{g}, որտեղ ({p};{q})=1", f"ԽԱԲ({a};{b})={g}", f"ԱՄԲ({a};{b})={p}·{q}·{g}={lcm}"]
    else:
        correct = g
        wrongs = [lcm, p + q, a - b if a - b != g else g + 1]
        q_txt = f"Ինչքա՞ն է {a} և {b} թվերի ամենամեծ ընդհանուր բաժանարարը (ԱՄԲ)։"
        h = "Վերլուծեք երկու թվերը արտադրիչների և առանձնացրեք ընդհանուր մասը։"
        steps = [f"{a}={p}·{g}, {b}={q}·{g}", f"({p};{q})=1, հետևաբար ընդհանուր բազմապատկիչը՝ {g}", f"ԱՄԲ({a};{b})={g}"]
    options, cl = mcq_options(correct, wrongs)
    return q_txt, h, steps, options, cl

def nt_remainder(n):
    def draw():
        N = random.randint(200, 999)
        d = random.randint(6, 23)
        return (N, d)
    N, d = unique_params("nt_remainder", draw)
    r = N % d
    q_txt = f"Ինչքա՞ն է {N} թիվը {d}-ի բաժանելիս ստացվող մնացորդը։"
    correct = r
    wrongs = list({(r + 1) % d, (r + d - 1) % d, (r + 2) % d} - {r})
    while len(wrongs) < 3:
        wrongs.append((r + random.randint(3, d - 1)) % d)
    wrongs = wrongs[:3]
    h = "Գտեք քանորդի ամբողջ մասը, ապա հաշվեք մնացորդը՝ N = d·q + r բանաձևով։"
    steps = [f"{N} = {d}·{N // d} + {r}", f"Հետևաբար մնացորդը հավասար է {r}-ի"]
    options, cl = mcq_options(correct, wrongs)
    return q_txt, h, steps, options, cl

def nt_divisors_count(n):
    def draw():
        a = random.randint(2, 8)
        b = random.randint(2, 6)
        c = random.randint(0, 4)
        return (a, b, c)
    a, b, c = unique_params("nt_divisors_count", draw)
    N = (2 ** a) * (3 ** b) * (5 ** c if c else 1)
    cnt = (a + 1) * (b + 1) * ((c + 1) if c else 1)
    q_txt = f"Ինչքա՞ն են {N} թվի բոլոր դրական բաժանարարների քանակը։"
    correct = cnt
    wrongs = [cnt + 2, cnt - 1 if cnt > 1 else cnt + 1, a * b + 1 if a*b+1 != cnt else cnt+4]
    factor_txt = f"2^{a}·3^{b}" + (f"·5^{c}" if c else "")
    h = "Վերլուծեք թիվը պարզ արտադրիչների և կիրառեք բաժանարարների քանակի բանաձևը (a+1)(b+1)..."
    steps = [f"{N} = {factor_txt}", f"Բաժանարարների քանակ = ({a}+1)·({b}+1)" + (f"·({c}+1)" if c else "") + f" = {cnt}"]
    options, cl = mcq_options(correct, wrongs)
    return q_txt, h, steps, options, cl

def nt_digit_divisibility(n):
    def draw():
        base = random.randint(100, 899)
        div = random.choice([3, 9, 11])
        return (base, div)
    base, div = unique_params("nt_digit_divisibility", draw)
    # find x (0-9) so that base*10 + x is divisible by div
    candidates = [x for x in range(10) if (base * 10 + x) % div == 0]
    if not candidates:
        candidates = [0]
    correct = candidates[0]
    wrongs = [x for x in range(10) if x not in candidates][:3]
    while len(wrongs) < 3:
        wrongs.append((correct + len(wrongs) + 1) % 10)
    N_str = f"{base}x̄"
    q_txt = f"Ինչքա՞ն պետք է լինի x թվանշանը, որպեսզի {base}x եռանիշից մեծ թիվը բաժանվի {div}-ի (x-ը վերջին թվանշանն է)։"
    h = f"Կիրառեք {div}-ի բաժանելիության հայտանիշը։"
    steps = [f"Փորձարկելով x=0,1,...,9 արժեքները՝ {base}x բաժանվում է {div}-ի միայն x={correct} դեպքում"]
    options, cl = mcq_options(correct, wrongs, fmt=str)
    return q_txt, h, steps, options, cl

NT_TEMPLATES = [nt_gcd_lcm, nt_remainder, nt_divisors_count, nt_digit_divisibility]

# ---------------------------------------------------------------
# 2. ALGEBRAIC SIMPLIFICATION (Q5-8, MCQ)
# ---------------------------------------------------------------
def alg_fraction_simplify(n):
    def draw():
        a = random.randint(2, 9)
        b = random.randint(2, 9)
        while b == a:
            b = random.randint(2, 9)
        k = random.randint(2, 6)
        return (a, b, k)
    a, b, k = unique_params("alg_fraction_simplify", draw)
    # (k a x^2 - k b x) / (k x) = a x - b   simplify at generic x -> ask value at x0
    x0 = random.randint(2, 5)
    val = a * x0 - b
    q_txt = f"Պարզեցրեք ({k}·{a}x² − {k}·{b}x)/({k}x) արտահայտությունը և հաշվեք նրա արժեքը x={x0}-ի դեպքում (x≠0)։"
    correct = val
    wrongs = [val + k, val - a, a * x0 + b if a*x0+b != val else val+3]
    h = "Դուրս բերեք ընդհանուր բազմապատկիչը համարիչում ու հայտարարում, կրճատեք։"
    steps = [f"Համարիչում ընդհանուր բազմապատկիչը՝ {k}x", f"Կրճատելուց հետո՝ {a}x − {b}", f"x={x0}-ի դեպքում՝ {a}·{x0} − {b} = {val}"]
    options, cl = mcq_options(correct, wrongs)
    return q_txt, h, steps, options, cl

def alg_exponent_simplify(n):
    def draw():
        base = random.choice([2, 3, 5, 7])
        p = random.randint(4, 15)
        q = random.randint(1, 5)
        return (base, p, q)
    base, p, q = unique_params("alg_exponent_simplify", draw)
    # (base^p) / (base^q) = base^(p-q)
    exp = p - q
    correct = base ** exp
    wrongs = [base ** (exp + 1), base ** (exp - 1) if exp >= 1 else base, base ** q]
    q_txt = f"Ինչքա՞ն է {base}^{p} : {base}^{q} արտահայտության արժեքը։"
    h = "Կիրառեք աստիճանների բաժանման կանոնը՝ a^m : a^n = a^(m−n)։"
    steps = [f"{base}^{p} : {base}^{q} = {base}^{{{p}-{q}}} = {base}^{exp}", f"{base}^{exp} = {correct}"]
    options, cl = mcq_options(correct, wrongs)
    return q_txt, h, steps, options, cl

def alg_radical_rationalize(n):
    def draw():
        a = random.randint(2, 20)
        n2 = random.choice([2, 3, 5, 6, 7, 10, 11, 13, 14, 15])
        return (a, n2)
    a, n2 = unique_params("alg_radical_rationalize", draw)
    # a / sqrt(n2) = a*sqrt(n2)/n2  -> if a divisible by n2 nicer, but keep as coefficient*sqrt form
    g = math.gcd(a, n2)
    coeff_num, coeff_den = a, n2
    q_txt = f"Ազատվեք հայտարարի իռացիոնալությունից՝ {a}/√{n2} արտահայտության մեջ, և գրեք արդյունքը p√{n2}/q տեսքով (p,q-ամբողջ, կրճատված)։"
    p, den = frac(coeff_num, coeff_den)
    correct = f"{p}√{n2}/{den}" if den != 1 else f"{p}√{n2}"
    wrongs = [f"{p}√{n2}/{den+1}", f"{p+1}√{n2}/{den}", f"√{n2}/{den}"]
    h = "Բազմապատկեք համարիչն ու հայտարարը √n2-ով։"
    steps = [f"{a}/√{n2} = {a}√{n2}/{n2}", f"Կրճատելով ԱՄԲ({a};{n2})={g}-ով ստանում ենք՝ {correct}"]
    options, cl = mcq_options(correct, wrongs, fmt=lambda v: v)
    return q_txt, h, steps, options, cl

def alg_diff_squares(n):
    def draw():
        a = random.randint(3, 12)
        b = random.randint(2, 11)
        while b == a:
            b = random.randint(2, 11)
        return (a, b)
    a, b = unique_params("alg_diff_squares", draw)
    val = a * a - b * b
    q_txt = f"Հաշվեք {a}² − {b}² արտահայտության արժեքը՝ օգտվելով քառակուսիների տարբերության բանաձևից։"
    correct = val
    wrongs = [(a - b) ** 2, a * a + b * b, (a + b) * (a - b) + 2]
    h = "a² − b² = (a−b)(a+b)"
    steps = [f"{a}² − {b}² = ({a}−{b})({a}+{b}) = {a-b}·{a+b} = {val}"]
    options, cl = mcq_options(correct, wrongs)
    return q_txt, h, steps, options, cl

ALG_TEMPLATES = [alg_fraction_simplify, alg_exponent_simplify, alg_radical_rationalize, alg_diff_squares]

# ---------------------------------------------------------------
# 3. EQUATIONS (Q9-12, MCQ)
# ---------------------------------------------------------------
def eq_linear(n):
    def draw():
        a = random.randint(2, 9)
        x0 = random.randint(-9, 9)
        while x0 == 0:
            x0 = random.randint(-9, 9)
        b = random.randint(-15, 15)
        return (a, x0, b)
    a, x0, b = unique_params("eq_linear", draw)
    c = a * x0 + b
    q_txt = f"Լուծեք {a}x + ({b}) = {c} հավասարումը։ Գտեք x-ը։"
    correct = x0
    wrongs = [x0 + 1, x0 - 1, -x0 if -x0 != x0 else x0 + 2]
    h = "Մեկուսացրեք x-ը՝ տեղափոխելով հայտնի անդամները հավասարման մյուս կողմ։"
    steps = [f"{a}x = {c} − ({b}) = {c-b}", f"x = {c-b}/{a} = {x0}"]
    options, cl = mcq_options(correct, wrongs)
    return q_txt, h, steps, options, cl

def eq_quadratic(n):
    def draw():
        r1 = random.randint(-8, 8)
        r2 = random.randint(-8, 8)
        while r2 <= r1:
            r1 = random.randint(-8, 8)
            r2 = random.randint(-8, 8)
        return (r1, r2)
    r1, r2 = unique_params("eq_quadratic", draw)
    b = -(r1 + r2)
    c = r1 * r2
    b_s = f"+{b}" if b >= 0 else f"−{-b}"
    c_s = f"+{c}" if c >= 0 else f"−{-c}"
    q_txt = f"Լուծեք x² {b_s}x {c_s} = 0 հավասարումը։ Որքա՞ն է արմատների գումարը։"
    correct = r1 + r2
    wrongs = [r1 * r2, r1 - r2, -(r1 + r2) if -(r1+r2) != r1+r2 else r1+r2+2]
    h = "Կիրառեք Վիետի թեորեմը՝ x1+x2 = −b, x1·x2 = c։"
    steps = [f"Հավասարման արմատներն են x1={r1}, x2={r2}", f"x1+x2 = {r1+r2}"]
    options, cl = mcq_options(correct, wrongs)
    return q_txt, h, steps, options, cl

def eq_rational(n):
    def draw():
        a = random.randint(2, 18)
        k = random.randint(1, 12)
        while k == 0:
            k = random.randint(1, 12)
        return (a, k)
    a, k = unique_params("eq_rational", draw)
    # (x + a)/(x - a) = k  =>  x + a = k(x-a) => x - kx = -ka - a => x(1-k) = -a(k+1) => x = a(k+1)/(k-1) if k!=1
    if k == 1:
        k += 1
    x_val_num = a * (k + 1)
    x_val_den = (k - 1)
    g = math.gcd(x_val_num, x_val_den)
    xn, xd = x_val_num // g, x_val_den // g
    if xd < 0:
        xn, xd = -xn, -xd
    q_txt = f"Լուծեք (x + {a})/(x − {a}) = {k} հավասարումը (x≠{a})։ Գտեք x-ը։"
    if xd == 1:
        correct = xn
        wrongs = [xn + 1, xn - 1, -xn if -xn != xn else xn + 3]
    else:
        correct = f"{xn}/{xd}"
        wrongs = [f"{xn+1}/{xd}", f"{xn}/{xd+1}", f"{-xn}/{xd}"]
    h = "Բազմապատկեք հավասարման երկու կողմերը հայտարարով և լուծեք գծային հավասարումը x-ի նկատմամբ։"
    steps = [f"x + {a} = {k}(x − {a})", f"x − {k}x = −{k}·{a} − {a}", f"x({1-k}) = {-(k*a+a)}", f"x = {correct}"]
    options, cl = mcq_options(correct, wrongs, fmt=lambda v: v if isinstance(v, str) else fnum(v))
    return q_txt, h, steps, options, cl

def eq_exponential(n):
    def draw():
        base = random.choice([2, 3, 5, 7])
        x0 = random.randint(1, 15)
        return (base, x0)
    base, x0 = unique_params("eq_exponential", draw)
    rhs = base ** x0
    q_txt = f"Լուծեք {base}^x = {rhs} հավասարումը։ Գտեք x-ը։"
    correct = x0
    wrongs = [x0 + 1, x0 - 1 if x0 > 1 else x0 + 2, x0 + 2]
    h = "Ներկայացրեք աջ կողմը նույն հիմքով աստիճանի տեսքով և հավասարեցրեք ցուցիչները։"
    steps = [f"{rhs} = {base}^{x0}", f"{base}^x = {base}^{x0} ⇒ x = {x0}"]
    options, cl = mcq_options(correct, wrongs)
    return q_txt, h, steps, options, cl

EQ_TEMPLATES = [eq_linear, eq_quadratic, eq_rational, eq_exponential]

# ---------------------------------------------------------------
# 4. INEQUALITIES (Q13-16, MCQ)
# ---------------------------------------------------------------
def ineq_linear(n):
    def draw():
        a = random.randint(2, 9)
        b = random.randint(-15, 15)
        c = random.randint(-15, 15)
        while c == b:
            c = random.randint(-15, 15)
        return (a, b, c)
    a, b, c = unique_params("ineq_linear", draw)
    bound_num = c - b
    g = math.gcd(abs(bound_num) if bound_num else 1, a)
    q_txt = f"Լուծեք {a}x + ({b}) < {c} անհավասարումը։"
    if bound_num % a == 0:
        bound = bound_num // a
        correct = f"x < {bound}"
        wrongs = [f"x > {bound}", f"x < {bound+1}", f"x ≤ {bound}"]
    else:
        n_, d_ = frac(bound_num, a)
        correct = f"x < {n_}/{d_}"
        wrongs = [f"x > {n_}/{d_}", f"x < {n_+1}/{d_}", f"x ≤ {n_}/{d_}"]
    h = "Մեկուսացրեք x-ը. հիշեք՝ բացասական թվի վրա բաժանելիս անհավասարման նշանը փոխվում է։"
    steps = [f"{a}x < {c} − ({b}) = {bound_num}", f"x < {bound_num}/{a}"]
    options, cl = mcq_options(correct, wrongs, fmt=lambda v: v)
    return q_txt, h, steps, options, cl

def ineq_quadratic(n):
    def draw():
        r1 = random.randint(-7, 7)
        r2 = random.randint(-7, 7)
        while r2 <= r1:
            r1 = random.randint(-7, 7)
            r2 = random.randint(-7, 7)
        return (r1, r2)
    r1, r2 = unique_params("ineq_quadratic", draw)
    b = -(r1 + r2)
    c = r1 * r2
    b_s = f"+{b}" if b >= 0 else f"−{-b}"
    c_s = f"+{c}" if c >= 0 else f"−{-c}"
    q_txt = f"Լուծեք x² {b_s}x {c_s} ≤ 0 անհավասարումը։"
    correct = f"[{r1}; {r2}]"
    wrongs = [f"({r1}; {r2})", f"(−∞; {r1}] ∪ [{r2}; +∞)", f"[{r1-1}; {r2}]"]
    h = "Գտեք եռանդամի արմատները, կառուցեք պարաբոլայի նշանների սխեման (ճյուղերը վերև)։"
    steps = [f"Արմատներն են x1={r1}, x2={r2}", "Քանի որ a=1>0, եռանդամը ոչ դրական է արմատների միջև", f"Լուծումն է՝ [{r1}; {r2}]"]
    options, cl = mcq_options(correct, wrongs, fmt=lambda v: v)
    return q_txt, h, steps, options, cl

def ineq_rational(n):
    def draw():
        a = random.randint(-8, 8)
        b = random.randint(-8, 8)
        while b <= a:
            a = random.randint(-8, 8)
            b = random.randint(-8, 8)
        return (a, b)
    a, b = unique_params("ineq_rational", draw)
    q_txt = f"Լուծեք (x − {a})/(x − {b}) > 0 անհավասարումը։"
    correct = f"(−∞; {a}) ∪ ({b}; +∞)" if a < b else f"(−∞; {b}) ∪ ({a}; +∞)"
    lo, hi = min(a, b), max(a, b)
    correct = f"(−∞; {lo}) ∪ ({hi}; +∞)"
    wrongs = [f"({lo}; {hi})", f"(−∞; {lo}] ∪ [{hi}; +∞)", f"({lo}; +∞)"]
    h = "Կիրառեք միջակայքերի մեթոդը՝ նշելով համարիչի և հայտարարի արմատները թվային առանցքի վրա։"
    steps = [f"Կրիտիկական կետեր՝ x={lo}, x={hi}", "Նշանների սխեմայից դրական է ծայրահեղ միջակայքերում", f"Պատասխան՝ (−∞; {lo}) ∪ ({hi}; +∞)"]
    options, cl = mcq_options(correct, wrongs, fmt=lambda v: v)
    return q_txt, h, steps, options, cl

def ineq_abs(n):
    def draw():
        a = random.randint(-9, 9)
        k = random.randint(2, 9)
        return (a, k)
    a, k = unique_params("ineq_abs", draw)
    q_txt = f"Լուծեք |x − ({a})| < {k} անհավասարումը։"
    lo, hi = a - k, a + k
    correct = f"({lo}; {hi})"
    wrongs = [f"[{lo}; {hi}]", f"(−∞; {lo}) ∪ ({hi}; +∞)", f"({lo-1}; {hi})"]
    h = "|x − a| < k համարժեք է a−k < x < a+k անհավասարությանը։"
    steps = [f"−{k} < x − ({a}) < {k}", f"{a}−{k} < x < {a}+{k}", f"{lo} < x < {hi}"]
    options, cl = mcq_options(correct, wrongs, fmt=lambda v: v)
    return q_txt, h, steps, options, cl

INEQ_TEMPLATES = [ineq_linear, ineq_quadratic, ineq_rational, ineq_abs]

# ---------------------------------------------------------------
# 5. MOTION WORD PROBLEMS (Q17-20, grouped MCQ)
# ---------------------------------------------------------------
def motion_group(n):
    def draw():
        v1 = random.randint(40, 70)
        v2 = random.randint(40, 70)
        while v2 == v1:
            v2 = random.randint(40, 70)
        t_meet = random.randint(2, 6)
        return (v1, v2, t_meet)
    v1, v2, t_meet = unique_params("motion_group", draw)
    dist = (v1 + v2) * t_meet
    context = (f"Երկու քաղաքների միջև հեռավորությունը {dist} կմ է։ Դրանցից միաժամանակ իրար ընդառաջ "
               f"դուրս են եկել երկու ավտոմեքենա՝ {v1} կմ/ժ և {v2} կմ/ժ արագություններով և հանդիպել {t_meet} ժամ հետո։")
    qs = []
    # sub1: verify distance formula → find distance (given) reversed: ask t if v1,v2, dist given differently
    qs.append(("Քանի՞ կիլոմետր է հեռավորությունը երկու քաղաքների միջև։",
               dist, [dist + v1, dist - v2, dist + t_meet],
               "Հեռավորությունը հավասար է արագությունների գումարի և հանդիպման ժամանակի արտադրյալին։",
               [f"S = (v1+v2)·t = ({v1}+{v2})·{t_meet} = {dist} կմ"]))
    d1 = v1 * t_meet
    qs.append(("Քանի՞ կիլոմետր է անցել առաջին ավտոմեքենան մինչև հանդիպումը։",
               d1, [d1 + v2, dist - d1 - 5 if dist-d1-5 != d1 else d1+10, v1],
               "Օգտվեք S=v·t բանաձևից առաջին մեքենայի համար։",
               [f"S1 = {v1}·{t_meet} = {d1} կմ"]))
    d2 = v2 * t_meet
    qs.append(("Քանի՞ կիլոմետր է անցել երկրորդ ավտոմեքենան մինչև հանդիպումը։",
               d2, [d2 + v1, d1, v2],
               "Օգտվեք S=v·t բանաձևից երկրորդ մեքենայի համար։",
               [f"S2 = {v2}·{t_meet} = {d2} կմ"]))
    diff = abs(d1 - d2)
    qs.append(("Քանի՞ կիլոմետրով է հանդիպման պահին մեկ մեքենան մյուսից առաջ անցել։",
               diff, [diff + 5, diff - 2 if diff > 2 else diff + 4, t_meet],
               "Հաշվեք երկու մեքենաների անցած ճանապարհների տարբերությունը։",
               [f"|S1 − S2| = |{d1} − {d2}| = {diff} կմ"]))
    return context, qs

# ---------------------------------------------------------------
# 6. PROGRESSIONS (Q21-24, MCQ)
# ---------------------------------------------------------------
def prog_arith_nth(n):
    def draw():
        a1 = random.randint(-10, 15)
        d = random.randint(-6, 9)
        while d == 0:
            d = random.randint(-6, 9)
        k = random.randint(10, 25)
        return (a1, d, k)
    a1, d, k = unique_params("prog_arith_nth", draw)
    ak = a1 + (k - 1) * d
    q_txt = f"Թվաբանական պրոգրեսիայի առաջին անդամը a1={a1} է, տարբերությունը՝ d={d}։ Ինչքա՞ն է a{k}։"
    correct = ak
    wrongs = [ak + d, ak - d, a1 + k * d]
    h = "an = a1 + (n−1)d"
    steps = [f"a{k} = {a1} + ({k}−1)·{d} = {ak}"]
    options, cl = mcq_options(correct, wrongs)
    return q_txt, h, steps, options, cl

def prog_arith_sum(n):
    def draw():
        a1 = random.randint(1, 12)
        d = random.randint(1, 8)
        k = random.randint(8, 20)
        return (a1, d, k)
    a1, d, k = unique_params("prog_arith_sum", draw)
    ak = a1 + (k - 1) * d
    s = (a1 + ak) * k // 2
    q_txt = f"Թվաբանական պրոգրեսիայում a1={a1}, d={d}։ Ինչքա՞ն է առաջին {k} անդամների գումարը (S{k})։"
    correct = s
    wrongs = [s + k, s - d, ak * k]
    h = "Sn = (a1+an)·n/2, նախ գտեք an-ը։"
    steps = [f"a{k} = {a1} + ({k}−1)·{d} = {ak}", f"S{k} = ({a1}+{ak})·{k}/2 = {s}"]
    options, cl = mcq_options(correct, wrongs)
    return q_txt, h, steps, options, cl

def prog_geom_nth(n):
    def draw():
        b1 = random.randint(1, 6)
        r = random.randint(2, 4)
        k = random.randint(3, 7)
        return (b1, r, k)
    b1, r, k = unique_params("prog_geom_nth", draw)
    bk = b1 * (r ** (k - 1))
    q_txt = f"Երկրաչափական պրոգրեսիայում b1={b1}, հայտարարը՝ q={r}։ Ինչքա՞ն է b{k}։"
    correct = bk
    wrongs = [bk * r, bk // r if bk % r == 0 else bk + r, b1 * k * r]
    h = "bn = b1·q^(n−1)"
    steps = [f"b{k} = {b1}·{r}^{{{k}-1}} = {bk}"]
    options, cl = mcq_options(correct, wrongs)
    return q_txt, h, steps, options, cl

def prog_geom_sum(n):
    def draw():
        b1 = random.randint(1, 9)
        r = random.randint(2, 4)
        k = random.randint(3, 8)
        return (b1, r, k)
    b1, r, k = unique_params("prog_geom_sum", draw)
    s = b1 * (r ** k - 1) // (r - 1)
    q_txt = f"Երկրաչափական պրոգրեսիայում b1={b1}, q={r}։ Ինչքա՞ն է առաջին {k} անդամների գումարը S{k}։"
    correct = s
    wrongs = [s + b1, s - r, b1 * (r ** k)]
    h = "Sn = b1(q^n − 1)/(q − 1)"
    steps = [f"S{k} = {b1}·({r}^{k} − 1)/({r} − 1) = {s}"]
    options, cl = mcq_options(correct, wrongs)
    return q_txt, h, steps, options, cl

PROG_TEMPLATES = [prog_arith_nth, prog_arith_sum, prog_geom_nth, prog_geom_sum]

# ---------------------------------------------------------------
# 7. FUNCTION / DERIVATIVE ANALYSIS (Q25-28, MCQ)  f(x)=ax^3+bx^2+cx  or ax^2+bx+c
# ---------------------------------------------------------------
def der_value_at_point(n):
    def draw():
        a = random.randint(1, 5)
        b = random.randint(-6, 6)
        c = random.randint(-6, 6)
        x0 = random.randint(-4, 4)
        return (a, b, c, x0)
    a, b, c, x0 = unique_params("der_value_at_point", draw)
    # f(x) = a x^3 + b x^2 + c x ; f'(x) = 3a x^2 + 2b x + c
    val = 3 * a * x0 * x0 + 2 * b * x0 + c
    q_txt = f"Տրված է f(x) = {a}x³ + ({b})x² + ({c})x ֆունկցիան։ Ինչքա՞ն է f'({x0})։"
    correct = val
    wrongs = [val + a, val - b, val + 2]
    h = "Գտեք ածանցյալը f'(x)=3ax²+2bx+c, ապա տեղադրեք x0-ը։"
    steps = [f"f'(x) = {3*a}x² + {2*b}x + {c}", f"f'({x0}) = {3*a}·{x0}² + {2*b}·{x0} + {c} = {val}"]
    options, cl = mcq_options(correct, wrongs)
    return q_txt, h, steps, options, cl

def der_critical_point(n):
    def draw():
        x1 = random.randint(-9, 9)
        x2 = random.randint(-9, 9)
        while x2 <= x1:
            x1 = random.randint(-9, 9)
            x2 = random.randint(-9, 9)
        a = random.choice([1, 2, 3, 4])
        return (x1, x2, a)
    x1, x2, a = unique_params("der_critical_point", draw)
    # f'(x) = 3a(x-x1)(x-x2) => f'(x)=3a x^2 -3a(x1+x2)x+3a x1 x2
    b_coef = -3 * a * (x1 + x2)  # coeff of x in f'
    q_txt = f"Ֆունկցիայի ածանցյալը՝ f'(x) = {3*a}x² + ({b_coef})x + {3*a*x1*x2}։ Քանի՞ կրիտիկական կետ ունի ֆունկցիան, և որքա՞ն է դրանցից փոքրագույնը։"
    lo = min(x1, x2)
    correct = lo
    wrongs = [max(x1, x2), lo + 1, lo - 1]
    h = "Կրիտիկական կետերը՝ f'(x)=0 հավասարման արմատներն են։"
    steps = [f"f'(x)=0 ⇒ {3*a}(x−{x1})(x−{x2})=0", f"x1={x1}, x2={x2}", f"Փոքրագույնը՝ {lo}"]
    options, cl = mcq_options(correct, wrongs)
    return q_txt, h, steps, options, cl

def der_polynomial_basic(n):
    def draw():
        a = random.randint(2, 7)
        n_pow = random.randint(2, 5)
        x0 = random.randint(1, 4)
        return (a, n_pow, x0)
    a, n_pow, x0 = unique_params("der_polynomial_basic", draw)
    # f(x) = a x^n_pow ; f'(x) = a*n_pow x^(n_pow-1)
    val = a * n_pow * (x0 ** (n_pow - 1))
    q_txt = f"Տրված է f(x) = {a}x^{n_pow} ֆունկցիան։ Ինչքա՞ն է f'({x0})։"
    correct = val
    wrongs = [val + a, val - n_pow, a * (x0 ** n_pow)]
    h = "(x^n)' = n·x^(n−1)"
    steps = [f"f'(x) = {a*n_pow}x^{n_pow-1}", f"f'({x0}) = {a*n_pow}·{x0}^{n_pow-1} = {val}"]
    options, cl = mcq_options(correct, wrongs)
    return q_txt, h, steps, options, cl

def der_monotonic_interval(n):
    def draw():
        x1 = random.randint(-6, 2)
        x2 = random.randint(x1 + 2, x1 + 9)
        return (x1, x2)
    x1, x2 = unique_params("der_monotonic_interval", draw)
    q_txt = f"Ֆունկցիայի ածանցյալը՝ f'(x) = (x−{x1})(x−{x2})։ Ո՞ր միջակայքում է ֆունկցիան նվազող։"
    correct = f"({x1}; {x2})"
    wrongs = [f"(−∞; {x1})", f"({x2}; +∞)", f"(−∞; {x1}) ∪ ({x2}; +∞)"]
    h = "Դրական ածանցյալի դեպքում ֆունկցիան աճում է, բացասականի դեպքում՝ նվազում։"
    steps = [f"f'(x) < 0, երբ {x1} < x < {x2} (պարաբոլայի ճյուղերը վերև)", f"Հետևաբար ֆունկցիան նվազում է ({x1}; {x2}) միջակայքում"]
    options, cl = mcq_options(correct, wrongs, fmt=lambda v: v)
    return q_txt, h, steps, options, cl

DER_TEMPLATES = [der_value_at_point, der_critical_point, der_polynomial_basic, der_monotonic_interval]

# ---------------------------------------------------------------
# 8. RHOMBUS GEOMETRY (Q29-32, grouped MCQ)
# ---------------------------------------------------------------
def rhombus_group(n):
    def draw():
        leg1, leg2, hyp = random.choice(PYTHAG_POOL)
        return (2 * leg1, 2 * leg2)
    d1, d2 = unique_params("rhombus_group", draw)
    side = int(round(math.sqrt((d1/2)**2 + (d2/2)**2)))
    area = d1 * d2 // 2
    perim = 4 * side
    context = f"Շեղանկյան անկյունագծերը՝ d1={d1} սմ և d2={d2} սմ։"
    qs = []
    qs.append(("Քանի՞ սանտիմետր է շեղանկյան կողմը։", side, [side+1, side-1, side+2],
               "Անկյունագծերը փոխուղղահայաց կիսվում են. կողմը՝ ուղղանկյուն եռանկյան ներքո։",
               [f"կողմ = √((d1/2)² + (d2/2)²) = √(({d1}/2)² + ({d2}/2)²) = {side} սմ"]))
    qs.append(("Քանի՞ սանտիմետր քառակուսի է շեղանկյան մակերեսը։", area, [area+d1, area-d2, area+4],
               "S = d1·d2/2", [f"S = {d1}·{d2}/2 = {area} սմ²"]))
    qs.append(("Քանի՞ սանտիմետր է շեղանկյան պարագիծը։", perim, [perim+4, perim-4, perim+side],
               "P = 4·կողմ", [f"P = 4·{side} = {perim} սմ"]))
    height = round(2 * area / (4*side), 2) if side else 0
    height_frac_num, height_frac_den = area*2, 4*side
    g = math.gcd(height_frac_num, height_frac_den)
    hn, hd = height_frac_num//g, height_frac_den//g
    h_val = f"{hn}/{hd}" if hd != 1 else f"{hn}"
    qs.append(("Քանի՞ սանտիմետր է շեղանկյան բարձրությունը (կողմին տարված)։", h_val,
               [f"{hn+1}/{hd}", f"{hn}/{hd+1}", f"{hn-1}/{hd}" if hn>1 else f"{hn+2}/{hd}"],
               "S = կողմ·բարձրություն ⇒ h = S/կողմ",
               [f"h = 2S/P = {height_frac_num}/{height_frac_den} = {h_val} սմ"]))
    return context, qs

# ---------------------------------------------------------------
# 9. VECTORS (Q33-36, MCQ)
# ---------------------------------------------------------------
def vec_magnitude(n):
    def draw():
        return random.choice(VEC_MAG_POOL)
    x, y = unique_params("vec_magnitude", draw)
    mag = math.isqrt(x*x + y*y)
    q_txt = f"Տրված է a(vec) = ({x}; {y}) վեկտորը։ Ինչքա՞ն է |a(vec)|-ը։"
    correct = mag
    wrongs = [mag + 1, mag - 1 if mag > 1 else mag + 2, abs(x) + abs(y) if abs(x)+abs(y)!=mag else mag+3]
    h = "|a| = √(x² + y²)"
    steps = [f"|a| = √({x}² + {y}²) = √{x*x+y*y} = {mag}"]
    options, cl = mcq_options(correct, wrongs)
    return q_txt, h, steps, options, cl

def vec_dot_product(n):
    def draw():
        x1 = random.randint(-8, 8)
        y1 = random.randint(-8, 8)
        x2 = random.randint(-8, 8)
        y2 = random.randint(-8, 8)
        return (x1, y1, x2, y2)
    x1, y1, x2, y2 = unique_params("vec_dot_product", draw)
    dot = x1*x2 + y1*y2
    q_txt = f"Տրված են a(vec)=({x1}; {y1}) և b(vec)=({x2}; {y2}) վեկտորները։ Ինչքա՞ն է a(vec)·b(vec) սկալյար արտադրյալը։"
    correct = dot
    wrongs = [dot + x1, dot - y2, x1*y1 + x2*y2 if x1*y1+x2*y2 != dot else dot+2]
    h = "a·b = x1x2 + y1y2"
    steps = [f"a(vec)·b(vec) = {x1}·{x2} + {y1}·{y2} = {dot}"]
    options, cl = mcq_options(correct, wrongs)
    return q_txt, h, steps, options, cl

def vec_sum_scalar(n):
    def draw():
        x1 = random.randint(-7, 7)
        y1 = random.randint(-7, 7)
        x2 = random.randint(-7, 7)
        y2 = random.randint(-7, 7)
        k = random.randint(2, 5)
        return (x1, y1, x2, y2, k)
    x1, y1, x2, y2, k = unique_params("vec_sum_scalar", draw)
    rx, ry = k*x1 + x2, k*y1 + y2
    q_txt = f"Տրված են a(vec)=({x1}; {y1}) և b(vec)=({x2}; {y2})։ Ինչքա՞ն են {k}a(vec)+b(vec) վեկտորի կոորդինատները։"
    correct = f"({rx}; {ry})"
    wrongs = [f"({rx+1}; {ry})", f"({rx}; {ry+1})", f"({rx-k}; {ry})"]
    h = "Սկալյարով բազմապատկելիս և վեկտորներ գումարելիս գործողությունը կատարվում է կոորդինատ առ կոորդինատ։"
    steps = [f"{k}a(vec) = ({k*x1}; {k*y1})", f"{k}a(vec)+b(vec) = ({k*x1}+{x2}; {k*y1}+{y2}) = ({rx}; {ry})"]
    options, cl = mcq_options(correct, wrongs, fmt=lambda v: v)
    return q_txt, h, steps, options, cl

def vec_collinear_check(n):
    def draw():
        x1 = random.randint(1, 9)
        y1 = random.randint(1, 9)
        k = random.randint(2, 5)
        offset = random.randint(1, 4)
        return (x1, y1, k, offset)
    x1, y1, k, offset = unique_params("vec_collinear_check", draw)
    x2, y2 = k*x1, k*y1 + offset  # not collinear generally
    is_col = (x1*y2 - x2*y1 == 0)
    q_txt = f"Տրված են a(vec)=({x1}; {y1}) և b(vec)=({x2}; {y2})։ Գուծակցված են (կոլինեար) այս վեկտորները, թե՝ ոչ. ինչքա՞ն է x1y2 − x2y1 արտահայտության արժեքը (կոլինեարության հայտանիշ)։"
    val = x1*y2 - x2*y1
    correct = val
    wrongs = [val + 1, val - 1, val + x1]
    h = "Երկու վեկտորները կոլինեար են, եթե x1y2 − x2y1 = 0։"
    steps = [f"x1y2 − x2y1 = {x1}·{y2} − {x2}·{y1} = {val}"]
    options, cl = mcq_options(correct, wrongs)
    return q_txt, h, steps, options, cl

VEC_TEMPLATES = [vec_magnitude, vec_dot_product, vec_sum_scalar, vec_collinear_check]

# ---------------------------------------------------------------
# 10. PRISM STEREOMETRY (Q37-40, grouped free response)
# ---------------------------------------------------------------
def prism_group(n):
    def draw():
        a = random.randint(3, 12)
        b = random.randint(3, 12)
        c = random.randint(3, 15)
        return (a, b, c)
    a, b, c = unique_params("prism_group", draw)
    context = f"Ուղղանկյուն զուգահեռանիստի չափերն են՝ a={a} սմ, b={b} սմ, c={c} սմ։"
    vol = a*b*c
    surf = 2*(a*b + b*c + a*c)
    diag = math.sqrt(a*a+b*b+c*c)
    diag_r = round(diag, 2)
    qs = []
    qs.append(("Քանի՞ սանտիմետր խորանարդ է զուգահեռանիստի ծավալը։", f"{vol} սմ³",
               "V = a·b·c", [f"V = {a}·{b}·{c} = {vol} սմ³"]))
    qs.append(("Քանի՞ սանտիմետր քառակուսի է լրիվ մակերևույթի մակերեսը։", f"{surf} սմ²",
               "S = 2(ab+bc+ac)", [f"S = 2({a}·{b}+{b}·{c}+{a}·{c}) = {surf} սմ²"]))
    qs.append(("Քանի՞ սանտիմետր է զուգահեռանիստի անկյունագիծը (կլորացրեք հազարերորդականով)։", f"{fnum(diag_r)} սմ",
               "d = √(a²+b²+c²)", [f"d = √({a}²+{b}²+{c}²) = √{a*a+b*b+c*c} ≈ {fnum(diag_r)} սմ"]))
    base_diag = round(math.sqrt(a*a+b*b), 2)
    qs.append(("Քանի՞ սանտիմետր է հիմքի անկյունագիծը (կլորացրեք հազարերորդականով)։", f"{fnum(base_diag)} սմ",
               "d_base = √(a²+b²)", [f"d_base = √({a}²+{b}²) = √{a*a+b*b} ≈ {fnum(base_diag)} սմ"]))
    return context, qs

# ---------------------------------------------------------------
# 11. DERIVATIVE APPLICATIONS (Q41-44, free response)
# ---------------------------------------------------------------
def der_app_optimization(n):
    def draw():
        P = random.randint(40, 400)
        return (P,)
    (P,) = unique_params("der_app_optimization", draw)
    # rectangle perimeter P, max area at square side P/4
    side = P / 4
    area = side * side
    q_txt = f"Ուղղանկյան պարագիծը {P} սմ է։ Ինչքա՞ն է առավելագույն հնարավոր մակերեսը (սմ²)։"
    h = "Առավելագույն մակերես ունեցող ուղղանկյունը քառակուսին է. կիրառեք ածանցյալի եղանակը S(x)=x(P/2−x) ֆունկցիայի համար։"
    steps = [f"S(x) = x(P/2 − x), որտեղ P={P}", "S'(x) = P/2 − 2x = 0 ⇒ x = P/4", f"x = {P}/4 = {fnum(side)} սմ", f"S_max = {fnum(side)}² = {fnum(area)} սմ²"]
    return q_txt, h, steps, f"{fnum(area)} սմ²"

def der_app_tangent(n):
    def draw():
        a = random.randint(1, 4)
        x0 = random.randint(-3, 3)
        b = random.randint(-5, 5)
        return (a, x0, b)
    a, x0, b = unique_params("der_app_tangent", draw)
    # f(x) = a x^2 + b x
    y0 = a*x0*x0 + b*x0
    slope = 2*a*x0 + b
    # tangent: y = y0 + slope(x-x0) = slope*x + (y0 - slope*x0)
    intercept = y0 - slope*x0
    q_txt = f"Տրված է f(x) = {a}x² + ({b})x ֆունկցիան։ Կազմեք f-ի գրաֆիկին x0={x0} կետում տարված շոշափողի հավասարումը (y=kx+m տեսքով)։"
    h = "Շոշափողի հավասարումն է y = f(x0) + f'(x0)(x − x0)։"
    steps = [f"f({x0}) = {a}·{x0}² + {b}·{x0} = {y0}", f"f'(x) = {2*a}x + {b}, f'({x0}) = {slope}",
             f"y = {y0} + {slope}(x − {x0}) = {slope}x + ({intercept})"]
    answer = f"y = {slope}x + ({intercept})" if intercept != 0 else f"y = {slope}x"
    return q_txt, h, steps, answer

def der_app_motion(n):
    def draw():
        a = random.randint(1, 3)
        b = random.randint(-10, 10)
        t0 = random.randint(1, 6)
        return (a, b, t0)
    a, b, t0 = unique_params("der_app_motion", draw)
    # s(t) = a t^3 + b t ; v(t)=3a t^2 + b
    v = 3*a*t0*t0 + b
    q_txt = f"Մարմնի շարժման օրենքն է s(t) = {a}t³ + ({b})t (մետրերով)։ Ինչքա՞ն է մարմնի արագությունը t0={t0} վայրկյանում (մ/վ)։"
    h = "Արագությունը ճանապարհի ածանցյալն է ըստ ժամանակի՝ v(t)=s'(t)"
    steps = [f"v(t) = {3*a}t² + {b}", f"v({t0}) = {3*a}·{t0}² + {b} = {v} մ/վ"]
    return q_txt, h, steps, f"{v} մ/վ"

def der_app_increasing(n):
    def draw():
        x1 = random.randint(-12, 0)
        x2 = random.randint(1, 13)
        return (x1, x2)
    x1, x2 = unique_params("der_app_increasing", draw)
    q_txt = f"Ֆունկցիայի ածանցյալը՝ f'(x) = (x−{x1})(x−{x2})։ Գրեք ֆունկցիայի աճման միջակայքերը։"
    h = "f'(x) > 0 միջակայքերում ֆունկցիան աճում է (ճյուղերը վերև ունեցող պարաբոլա)"
    steps = [f"f'(x) > 0, երբ x < {x1} կամ x > {x2}"]
    return q_txt, h, steps, f"(−∞; {x1}) ∪ ({x2}; +∞)"

DER_APP_TEMPLATES = [der_app_optimization, der_app_tangent, der_app_motion, der_app_increasing]

# ---------------------------------------------------------------
# 12. Q45 MULTI-STATEMENT PARAMETER INEQUALITY
# ---------------------------------------------------------------
def q45_param_inequality(n):
    def draw():
        m_bound = random.randint(2, 300)
        return (m_bound,)
    (m_bound,) = unique_params("q45_param_inequality", draw)
    # mx^2 - 2(m-1)x + (m-2) < 0 has no solution for all real x  <=>  m>0 and D<0 style construction
    # We'll construct a concrete family: (m - k)x^2 + ... simpler: statements about sign of m for f(x)=mx^2+2x+m>0 for all x
    q_txt = (f"Դիտարկենք f(x) = mx² + 2x + m քառակուսային եռանդամը, որտեղ m-ը իրական պարամետր է "
             f"(հետազոտության մեջ կիրառվում է մասնավոր արժեք m={m_bound})։ Քննարկվում են հետևյալ պնդումները․")
    statements = [
        f"Ա) Եթե m > 1, ապա f(x) > 0 ցանկացած իրական x-ի համար",
        f"Բ) Եթե m = {m_bound}, ապա f(x) ≥ 0 ցանկացած x-ի համար",
        f"Գ) Եթե 0 < m ≤ 1, ապա հավասարումը f(x)=0 ունի իրական արմատ",
        f"Դ) Եթե m ≤ 0, ապա f(x) > 0 բոլոր x-երի համար",
    ]
    # analysis: f(x)>0 for all x <=> m>0 and D<0 => 4-4m^2<0 => m>1 or m<-1; combined with m>0 => m>1. So Ա is TRUE.
    # Բ: m=m_bound could be >1 (true, f>0>=0 true) as long as m_bound>=1; ensure m_bound>=2 always true here → statement true actually; let's pick which are true/false carefully.
    # Let's just fix truth values logically: Ա True, Բ True (since m_bound>1 given range 2-9), Գ: for 0<m<=1, D=4-4m^2>=0 => real roots exist -> True, Դ: m<=0 => f could be negative for large x (since coefficient of x^2 <=0, opens downward or linear) -> False
    correct_option = "Ա, Բ և Գ"
    h = "Վերլուծեք դիսկրիմինանտի նշանը (D=4−4m²) և գործակցի (m) նշանը D<0 պայմանի հետ միասին։"
    steps = [
        "f(x)>0 ցանկացած x-ի համար ⟺ m>0 և D<0 ⟺ m>0 և 4−4m²<0 ⟺ m>1 (Ա ճիշտ է)",
        f"m={m_bound}>1 ⇒ f(x)≥0 (նույնիսկ խիստ f(x)>0) ցանկացած x-ի համար (Բ ճիշտ է)",
        "0<m≤1 ⇒ D=4−4m²≥0 ⇒ հավասարումն ունի իրական արմատ (Գ ճիշտ է)",
        "m≤0 ⇒ գործակիցը ոչ դրական է, ուստի f(x)→−∞ մեծ x-երի համար (Դ սխալ է)",
    ]
    difficulty = "բարձր"
    return q_txt, statements, correct_option, h, steps

# ---------------------------------------------------------------
# 13. MIXTURE PROBLEM (Q46-49, grouped free response)
# ---------------------------------------------------------------
def mixture_group(n):
    def draw():
        m1 = random.randint(10, 40)
        c1 = random.randint(10, 60)
        m2 = random.randint(10, 40)
        c2 = random.randint(10, 60)
        while c2 == c1:
            c2 = random.randint(10, 60)
        return (m1, c1, m2, c2)
    m1, c1, m2, c2 = unique_params("mixture_group", draw)
    context = (f"{m1} կգ {c1}% խտության աղի լուծույթը խառնվում է {m2} կգ {c2}% խտության աղի "
               f"լուծույթի հետ, ստանալով նոր խառնուրդ։")
    total_mass = m1 + m2
    total_salt = m1*c1/100 + m2*c2/100
    conc = round(total_salt/total_mass*100, 2)
    qs = []
    qs.append(("Քանի՞ կիլոգրամ է ստացված խառնուրդի զանգվածը։", f"{total_mass} կգ",
               "Խառնուրդի զանգվածը հավասար է բաղադրիչների զանգվածների գումարին։", [f"m = {m1} + {m2} = {total_mass} կգ"]))
    qs.append(("Քանի՞ կիլոգրամ մաքուր աղ է պարունակվում խառնուրդում (կլորացրեք հարյուրերորդականով)։", f"{fnum(round(total_salt,2))} կգ",
               "Ամեն լուծույթում պարունակվող աղը հաշվեք առանձին և գումարեք։",
               [f"աղ1 = {m1}·{c1}/100 = {fnum(round(m1*c1/100,2))} կգ", f"աղ2 = {m2}·{c2}/100 = {fnum(round(m2*c2/100,2))} կգ",
                f"ընդհանուր աղ = {fnum(round(total_salt,2))} կգ"]))
    qs.append(("Քանի՞ տոկոս է ստացված խառնուրդի խտությունը (կլորացրեք հարյուրերորդականով)։", f"{fnum(conc)}%",
               "Խտություն(%) = (աղի զանգված/խառնուրդի զանգված)·100%",
               [f"c = {fnum(round(total_salt,2))}/{total_mass}·100% ≈ {fnum(conc)}%"]))
    water1 = round(m1*(100-c1)/100, 2)
    qs.append(("Քանի՞ կիլոգրամ ջուր է պարունակվում առաջին լուծույթում (կլորացրեք հարյուրերորդականով)։", f"{fnum(water1)} կգ",
               "Ջրի զանգված = ընդհանուր զանգված − աղի զանգված", [f"ջուր = {m1}·(100−{c1})/100 = {fnum(water1)} կգ"]))
    return context, qs

# ---------------------------------------------------------------
# 14. CIRCUMSCRIBED CIRCLE GEOMETRY (Q50-53, grouped free response)
# ---------------------------------------------------------------
def circle_group(n):
    def draw():
        return random.choice(PYTHAG_POOL)
    a, b, c = unique_params("circle_group", draw)  # right triangle legs a,b, hypotenuse c
    R = c / 2
    area = a * b / 2
    perim = a + b + c
    r = area / (perim/2)
    context = f"Ուղղանկյուն եռանկյան էջերն են՝ a={a} սմ, b={b} սմ, ներքնաձիգը՝ c={c} սմ։"
    qs = []
    qs.append(("Քանի՞ սանտիմետր է շրջագծած շրջանագծի շառավիղը։", f"{fnum(R)} սմ",
               "Ուղղանկյուն եռանկյան համար շրջագծած շրջանագծի շառավիղը հավասար է ներքնաձիգի կեսին։",
               [f"R = c/2 = {c}/2 = {fnum(R)} սմ"]))
    qs.append(("Քանի՞ սանտիմետր քառակուսի է եռանկյան մակերեսը։", f"{fnum(area)} սմ²",
               "S = a·b/2 (ուղղանկյուն եռանկյան համար)", [f"S = {a}·{b}/2 = {fnum(area)} սմ²"]))
    qs.append(("Քանի՞ սանտիմետր է ներգծած շրջանագծի շառավիղը (կլորացրեք հարյուրերորդականով)։", f"{fnum(round(r,2))} սմ",
               "r = S/p, որտեղ p-ը կիսապարագիծն է", [f"p = ({a}+{b}+{c})/2 = {fnum(perim/2)}", f"r = {fnum(area)}/{fnum(perim/2)} ≈ {fnum(round(r,2))} սմ"]))
    qs.append(("Քանի՞ սանտիմետր քառակուսի է շրջագծած շրջանագծի մակերեսը (կլորացրեք հարյուրերորդականով, օգտվեք π≈3,14-ից)։",
               f"{fnum(round(math.pi*R*R,2))} սմ²",
               "S = πR²", [f"S = 3,14·{fnum(R)}² ≈ {fnum(round(math.pi*R*R,2))} սմ²"]))
    return context, qs

# ---------------------------------------------------------------
# 15. PARAMETER ROOT COUNTING (Q54-57, free response)
# ---------------------------------------------------------------
def param_root_count(n):
    def draw():
        k = random.randint(-9, 9)
        p = random.randint(1, 5)
        return (k, p)
    k, p = unique_params("param_root_count", draw)
    # x^2 - 2px + (p^2 - k) = 0  => D = 4p^2 - 4(p^2-k) = 4k. Roots count depends on sign of k.
    q_txt = f"Քանի՞ արմատ ունի x² − {2*p}x + ({p*p} − m) = 0 հավասարումը, երբ m = {k}։"
    D_over4 = k
    if D_over4 > 0:
        ans = "երկու տարբեր իրական արմատ"
    elif D_over4 == 0:
        ans = "մեկ (կրկնակի) իրական արմատ"
    else:
        ans = "իրական արմատներ չունի"
    h = "Հաշվեք դիսկրիմինանտը D=4p²−4(p²−m)=4m և վերլուծեք նրա նշանը։"
    steps = [f"D/4 = p² − (p² − m) = m = {k}", f"D {'​>' if D_over4>0 else ('=' if D_over4==0 else '<')} 0 ⇒ {ans}"]
    return q_txt, h, steps, ans

def param_root_range(n):
    def draw():
        target_count = random.choice([0, 1, 2])
        shift = random.randint(-25, 25)
        return (target_count, shift)
    target_count, shift = unique_params("param_root_range", draw)
    # (x-shift)^2 = m  -> roots depend on m vs 0
    if target_count == 2:
        cond = "m > 0"
    elif target_count == 1:
        cond = "m = 0"
    else:
        cond = "m < 0"
    q_txt = f"(x − ({shift}))² = m հավասարումն ունի ուղիղ {['զրո','մեկ','երկու'][target_count]} իրական արմատ, երբ m-ը ի՞նչ պայմանի է բավարարում։"
    h = "Աջ կողմի արժեքի նշանից է կախված արմատների քանակը՝ (x−a)²=m ձևի հավասարման համար։"
    steps = [f"(x−{shift})² ≥ 0 միշտ, հետևաբար՝", "եթե m>0՝ երկու արմատ, եթե m=0՝ մեկ արմատ, եթե m<0՝ արմատներ չկան",
             f"Ուղիղ {['զրո','մեկ','երկու'][target_count]} արմատի համար պահանջվում է {cond}"]
    return q_txt, h, steps, cond

def param_two_roots_positive(n):
    def draw():
        s = random.randint(4, 400)
        return (s,)
    (s,) = unique_params("param_two_roots_positive", draw)
    # x^2 - s x + m = 0, both roots positive and real <=> D>=0 and sum>0(always, s>0) and product m>0 => 0 < m <= s^2/4
    bound = (s*s)/4
    q_txt = f"x² − {s}x + m = 0 հավասարման երկու արմատներն էլ դրական իրական թվեր են։ Ո՞ր միջակայքում պետք է գտնվի m-ը։"
    h = "Պահանջվում է D≥0, x1+x2>0 (ինքնաբերաբար, քանի որ գումարը {s}>0), և x1·x2>0"
    steps = [f"D≥0 ⇒ {s}² − 4m ≥ 0 ⇒ m ≤ {fnum(bound)}", "x1x2 = m > 0", f"Հետևաբար՝ 0 < m ≤ {fnum(bound)}"]
    ans = f"0 < m ≤ {fnum(bound)}"
    return q_txt, h, steps, ans

def param_no_roots(n):
    def draw():
        b = random.randint(-100, 100)
        return (b,)
    (b,) = unique_params("param_no_roots", draw)
    # x^2 + bx + m = 0 has no real roots <=> D<0 <=> m > b^2/4
    bound = (b*b)/4
    q_txt = f"x² + ({b})x + m = 0 հավասարումը իրական արմատներ չունի։ Ո՞ր պայմանին պետք է բավարարի m-ը։"
    h = "D<0 պայմանից"
    steps = [f"D = {b}² − 4m < 0 ⇒ m > {b*b}/4 = {fnum(bound)}"]
    ans = f"m > {fnum(bound)}"
    return q_txt, h, steps, ans

PARAM_TEMPLATES = [param_root_count, param_root_range, param_two_roots_positive, param_no_roots]

# ---------------------------------------------------------------
# 16. ALGEBRAIC IDENTITIES (Q58-61, free response)
# ---------------------------------------------------------------
def identity_sum_cubes(n):
    def draw():
        s = random.randint(3, 12)
        p = random.randint(2, 20)
        return (s, p)
    s, p = unique_params("identity_sum_cubes", draw)
    # given x+y=s, xy=p find x^3+y^3 = s^3 - 3ps
    val = s**3 - 3*p*s
    q_txt = f"Հայտնի է, որ x + y = {s} և xy = {p}։ Ինչքա՞ն է x³ + y³-ը։"
    h = "x³+y³ = (x+y)³ − 3xy(x+y)"
    steps = [f"x³+y³ = {s}³ − 3·{p}·{s} = {s**3} − {3*p*s} = {val}"]
    return q_txt, h, steps, str(val)

def identity_square_sum(n):
    def draw():
        s = random.randint(4, 15)
        p = random.randint(1, 25)
        return (s, p)
    s, p = unique_params("identity_square_sum", draw)
    val = s*s - 2*p
    q_txt = f"Հայտնի է, որ x + y = {s} և xy = {p}։ Ինչքա՞ն է x² + y²-ը։"
    h = "x²+y² = (x+y)² − 2xy"
    steps = [f"x²+y² = {s}² − 2·{p} = {s*s} − {2*p} = {val}"]
    return q_txt, h, steps, str(val)

def identity_diff_cube(n):
    def draw():
        d = random.randint(2, 9)
        p = random.randint(2, 15)
        return (d, p)
    d, p = unique_params("identity_diff_cube", draw)
    # x-y=d, xy=p, find x^3-y^3 = (x-y)^3+3xy(x-y) = d^3+3pd
    val = d**3 + 3*p*d
    q_txt = f"Հայտնի է, որ x − y = {d} և xy = {p}։ Ինչքա՞ն է x³ − y³-ը։"
    h = "x³−y³ = (x−y)³ + 3xy(x−y)"
    steps = [f"x³−y³ = {d}³ + 3·{p}·{d} = {d**3} + {3*p*d} = {val}"]
    return q_txt, h, steps, str(val)

def identity_fraction_value(n):
    def draw():
        s = random.randint(5, 16)
        p = random.randint(2, 20)
        return (s, p)
    s, p = unique_params("identity_fraction_value", draw)
    # x+y=s, xy=p; find x/y+y/x = (x^2+y^2)/xy = (s^2-2p)/p
    num = s*s - 2*p
    n_, d_ = frac(num, p)
    q_txt = f"Հայտնի է, որ x + y = {s} և xy = {p} (x,y≠0)։ Ինչքա՞ն է x/y + y/x-ը։"
    ans = f"{n_}/{d_}" if d_ != 1 else f"{n_}"
    h = "x/y + y/x = (x²+y²)/xy = ((x+y)²−2xy)/xy"
    steps = [f"x²+y² = {s}² − 2·{p} = {num}", f"x/y+y/x = {num}/{p} = {ans}"]
    return q_txt, h, steps, ans

IDENTITY_TEMPLATES = [identity_sum_cubes, identity_square_sum, identity_diff_cube, identity_fraction_value]

# ---------------------------------------------------------------
# 17. COMBINATORICS (Q62-63, free response)
# ---------------------------------------------------------------
def combo_permutation(n):
    def draw():
        total = random.randint(6, 25)
        choose = random.randint(3, 7)
        return (total, choose)
    total, choose = unique_params("combo_permutation", draw)
    val = math.perm(total, choose)
    q_txt = f"{total} տարբեր գրքերից քանի՞ եղանակով կարելի է շարքով դասավորել {choose} գիրք դարակի վրա (կարգը կարևոր է)։"
    h = "Կիրառեք տեղափոխությունների բանաձևը՝ A(n,k) = n!/(n−k)!"
    steps = [f"A({total},{choose}) = {total}!/({total}-{choose})! = {val}"]
    return q_txt, h, steps, str(val)

def combo_combination(n):
    def draw():
        total = random.randint(7, 30)
        choose = random.randint(3, 8)
        return (total, choose)
    total, choose = unique_params("combo_combination", draw)
    val = math.comb(total, choose)
    q_txt = f"{total} աշակերտներից քանի՞ եղանակով կարելի է կազմել {choose} հոգանոց խումբ (կարգը կարևոր չէ)։"
    h = "Կիրառեք զուգակցությունների բանաձևը՝ C(n,k) = n!/(k!(n−k)!)"
    steps = [f"C({total},{choose}) = {total}!/({choose}!·{total-choose}!) = {val}"]
    return q_txt, h, steps, str(val)

def combo_word_arrangement(n):
    def draw():
        length = random.randint(5, 20)
        repeated = random.randint(2, 6)
        return (length, repeated)
    length, repeated = unique_params("combo_word_arrangement", draw)
    val = math.factorial(length) // math.factorial(repeated)
    q_txt = f"{length} տառից բաղկացած բառում {repeated} տառը կրկնվում է, մնացած տառերը՝ տարբեր են։ Քանի՞ տարբեր «բառ» (տառադասավորություն) կարելի է կազմել։"
    h = "Օգտվեք կրկնություններով տեղափոխությունների բանաձևից՝ n!/(k1!·k2!·...)"
    steps = [f"Դասավորությունների քանակ = {length}!/{repeated}! = {val}"]
    return q_txt, h, steps, str(val)

COMBO_TEMPLATES = [combo_permutation, combo_combination, combo_word_arrangement]

# ---------------------------------------------------------------
# 18. Q64 TRIGONOMETRY MULTI-STATEMENT
# ---------------------------------------------------------------
def q64_trig_multi(n):
    def draw():
        k = random.randint(2, 100)
        return (k,)
    (k,) = unique_params("q64_trig_multi", draw)
    q_txt = f"Դիտարկենք հետևյալ պնդումները, երբ sin(α) = 1/{k} (0 < α < π/2)."
    statements = [
        "Ա) cos(α) > 0",
        f"Բ) cos²(α) = 1 − 1/{k*k}",
        "Գ) tg(α)·ctg(α) = 1",
        f"Դ) sin(2α) = 2/{k}·cos(α)",
    ]
    correct_option = "Ա, Բ, Գ և Դ"
    h = "Օգտվեք հիմնական եռանկյունաչափական նույնություններից՝ sin²+cos²=1, tg·ctg=1, sin2α=2sinαcosα։"
    steps = [
        "0<α<π/2 միջակայքում cos(α)>0 (Ա ճիշտ է)",
        f"cos²(α)=1−sin²(α)=1−1/{k*k} (Բ ճիշտ է)",
        "tg(α)·ctg(α)=1 միշտ, երբ սահմանված են (Գ ճիշտ է)",
        f"sin(2α)=2sin(α)cos(α)=2·(1/{k})·cos(α)=2/{k}·cos(α) (Դ ճիշտ է)",
    ]
    return q_txt, statements, correct_option, h, steps

# ---------------------------------------------------------------
# 19. Q65 PYRAMID STEREOMETRY MULTI-STATEMENT
# ---------------------------------------------------------------
def q65_pyramid_multi(n):
    def draw():
        base = random.randint(4, 14)
        height = random.randint(3, 12)
        return (base, height)
    base, height = unique_params("q65_pyramid_multi", draw)
    vol = base*base*height/3
    lateral_edge_half_diag = math.sqrt((base*math.sqrt(2)/2)**2 + height**2)
    q_txt = (f"Կանոնավոր քառանկյուն բուրգի հիմքի կողմը a={base} սմ է, բարձրությունը՝ h={height} սմ։ "
             f"Դիտարկենք հետևյալ պնդումները․")
    statements = [
        f"Ա) Բուրգի ծավալը հավասար է {fnum(round(vol,2))} սմ³-ի",
        "Բ) Բուրգի կողմնային կողերը հավասար են իրար",
        f"Գ) Կողմնային կողի երկարությունը մոտավորապես {fnum(round(lateral_edge_half_diag,2))} սմ է",
        "Դ) Հիմքի անկյունագծերը հատվում են բարձրության հիմքի կետում",
    ]
    correct_option = "Ա, Բ, Գ և Դ"
    h = "Կանոնավոր բուրգի ծավալը V=(1/3)a²h, կողմնային կողերը հավասար են, հիմքի կենտրոնում հատվում են անկյունագծերը։"
    steps = [
        f"V = (1/3)·{base}²·{height} = {fnum(round(vol,2))} սմ³ (Ա ճիշտ է)",
        "Կանոնավոր բուրգում բոլոր կողմնային կողերը հավասար են (Բ ճիշտ է)",
        f"Կողմնային կող = √((a√2/2)² + h²) ≈ {fnum(round(lateral_edge_half_diag,2))} սմ (Գ ճիշտ է)",
        "Կանոնավոր քառանկյուն բուրգում հիմքի անկյունագծերի հատման կետը հենց բարձրության հիմքն է (Դ ճիշտ է)",
    ]
    return q_txt, statements, correct_option, h, steps

# =================================================================
# EXAM ASSEMBLY
# =================================================================
def diff_for(pos_in_block, block_len):
    if pos_in_block == 0:
        return "հեշտ"
    elif pos_in_block == block_len - 1:
        return "բարձր"
    return "միջին"

def build_exam(exam_idx):
    qs = []
    num = 1

    def add_mcq_block(topic, templates, count, difficulty_bump=None):
        nonlocal num
        chosen = [templates[i % len(templates)] for i in range(count)]
        # rotate template order slightly per exam for variety
        offset = exam_idx % len(templates)
        chosen = [templates[(i + offset) % len(templates)] for i in range(count)]
        for i, t in enumerate(chosen):
            q_txt, h, steps, options, cl = t(exam_idx)
            diff = diff_for(i, count)
            qs.append(mk(num, topic_for(t.__module__ if False else None) or topic, "single_choice",
                         q_txt, diff, h, steps, options=options, correct_option=cl))
            num += 1

    def topic_for(_):
        return None

    # 1. Number theory
    add_mcq_block("Թվերի տեսություն", NT_TEMPLATES, 4)
    # 2. Algebraic simplification
    add_mcq_block("Հանրահաշվական արտահայտությունների պարզեցում", ALG_TEMPLATES, 4)
    # 3. Equations
    add_mcq_block("Հավասարումներ", EQ_TEMPLATES, 4)
    # 4. Inequalities
    add_mcq_block("Անհավասարումներ", INEQ_TEMPLATES, 4)
    # 5. Motion word problems (grouped)
    context, subqs = motion_group(exam_idx)
    for i, (q_suffix, correct, wrongs, h, steps) in enumerate(subqs):
        options, cl = mcq_options(correct, wrongs, fmt=lambda v: v if isinstance(v, str) else fnum(v))
        full_q = f"{context} {q_suffix}"
        qs.append(mk(num, "Շարժման վերաբերյալ խնդիրներ", "single_choice", full_q,
                      diff_for(i, 4), h, steps, group=f"motion_{exam_idx}", options=options, correct_option=cl))
        num += 1
    # 6. Progressions
    add_mcq_block("Պրոգրեսիաներ", PROG_TEMPLATES, 4)
    # 7. Function/derivative analysis
    add_mcq_block("Ֆունկցիայի և ածանցյալի հետազոտություն", DER_TEMPLATES, 4)
    # 8. Rhombus geometry (grouped)
    context, subqs = rhombus_group(exam_idx)
    for i, (q_suffix, correct, wrongs, h, steps) in enumerate(subqs):
        options, cl = mcq_options(correct, wrongs, fmt=lambda v: v if isinstance(v, str) else fnum(v))
        full_q = f"{context} {q_suffix}"
        qs.append(mk(num, "Շեղանկյան երկրաչափություն", "single_choice", full_q,
                      diff_for(i, 4), h, steps, group=f"rhombus_{exam_idx}", options=options, correct_option=cl))
        num += 1
    # 9. Vectors
    add_mcq_block("Վեկտորներ", VEC_TEMPLATES, 4)
    # 10. Prism stereometry (grouped, free response)
    context, subqs = prism_group(exam_idx)
    for i, (q_suffix, answer, h, steps) in enumerate(subqs):
        full_q = f"{context} {q_suffix}"
        qs.append(mk(num, "Պրիզմայի ստերեոմետրիա", "free_response", full_q,
                      diff_for(i, 4), h, steps, group=f"prism_{exam_idx}", answer=answer))
        num += 1
    # 11. Derivative applications (free response)
    offset = exam_idx % len(DER_APP_TEMPLATES)
    chosen = [DER_APP_TEMPLATES[(i + offset) % len(DER_APP_TEMPLATES)] for i in range(4)]
    for i, t in enumerate(chosen):
        q_txt, h, steps, answer = t(exam_idx)
        qs.append(mk(num, "Ածանցյալի կիրառություններ", "free_response", q_txt,
                      diff_for(i, 4), h, steps, answer=answer))
        num += 1
    # 12. Q45 multi-statement parameter inequality
    q_txt, statements, cl, h, steps = q45_param_inequality(exam_idx)
    qs.append(mk(num, "Պարամետրով անհավասարումներ", "multi_statement", q_txt,
                  "բարձր", h, steps, statements=statements, correct_option=cl))
    num += 1
    # 13. Mixture problem (grouped)
    context, subqs = mixture_group(exam_idx)
    for i, (q_suffix, answer, h, steps) in enumerate(subqs):
        full_q = f"{context} {q_suffix}"
        qs.append(mk(num, "Խառնուրդների խնդիր", "free_response", full_q,
                      diff_for(i, 4), h, steps, group=f"mixture_{exam_idx}", answer=answer))
        num += 1
    # 14. Circumscribed circle geometry (grouped)
    context, subqs = circle_group(exam_idx)
    for i, (q_suffix, answer, h, steps) in enumerate(subqs):
        full_q = f"{context} {q_suffix}"
        qs.append(mk(num, "Շրջագծած շրջանագծի երկրաչափություն", "free_response", full_q,
                      diff_for(i, 4), h, steps, group=f"circle_{exam_idx}", answer=answer))
        num += 1
    # 15. Parameter root counting (free response)
    offset = exam_idx % len(PARAM_TEMPLATES)
    chosen = [PARAM_TEMPLATES[(i + offset) % len(PARAM_TEMPLATES)] for i in range(4)]
    for i, t in enumerate(chosen):
        q_txt, h, steps, answer = t(exam_idx)
        qs.append(mk(num, "Պարամետրով արմատների քանակի հետազոտություն", "free_response", q_txt,
                      diff_for(i, 4), h, steps, answer=answer))
        num += 1
    # 16. Algebraic identities (free response)
    offset = exam_idx % len(IDENTITY_TEMPLATES)
    chosen = [IDENTITY_TEMPLATES[(i + offset) % len(IDENTITY_TEMPLATES)] for i in range(4)]
    for i, t in enumerate(chosen):
        q_txt, h, steps, answer = t(exam_idx)
        qs.append(mk(num, "Հանրահաշվական նույնություններ", "free_response", q_txt,
                      diff_for(i, 4), h, steps, answer=answer))
        num += 1
    # 17. Combinatorics (2 questions)
    offset = exam_idx % len(COMBO_TEMPLATES)
    chosen = [COMBO_TEMPLATES[(i + offset) % len(COMBO_TEMPLATES)] for i in range(2)]
    for i, t in enumerate(chosen):
        q_txt, h, steps, answer = t(exam_idx)
        qs.append(mk(num, "Կոմբինատորիկա", "free_response", q_txt,
                      diff_for(i, 2), h, steps, answer=answer))
        num += 1
    # 18. Q64 trigonometry multi-statement
    q_txt, statements, cl, h, steps = q64_trig_multi(exam_idx)
    qs.append(mk(num, "Եռանկյունաչափություն", "multi_statement", q_txt,
                  "միջին", h, steps, statements=statements, correct_option=cl))
    num += 1
    # 19. Q65 pyramid stereometry multi-statement
    q_txt, statements, cl, h, steps = q65_pyramid_multi(exam_idx)
    qs.append(mk(num, "Բուրգի ստերեոմետրիա", "multi_statement", q_txt,
                  "բարձր", h, steps, statements=statements, correct_option=cl))
    num += 1

    assert num - 1 == 65, f"Exam {exam_idx} has {num-1} questions, expected 65"
    return {
        "exam_id": f"AEE-{exam_idx:03d}",
        "title": f"Հայաստանի Հանրապետության Միասնական քննություն — Մաթեմատիկա (կրկնօրինակ թիվ {exam_idx})",
        "question_count": 65,
        "questions": qs,
    }

# =================================================================
# RUN
# =================================================================
all_question_texts = set()
dupe_count = 0

for exam_idx in range(1, 51):
    exam = build_exam(exam_idx)
    for q in exam["questions"]:
        if q["question"] in all_question_texts:
            dupe_count += 1
        all_question_texts.add(q["question"])
    fname = os.path.join(OUT_DIR, f"armenian_entrance_exam_{exam_idx:02d}.json")
    with open(fname, "w", encoding="utf-8") as f:
        json.dump(exam, f, ensure_ascii=False, indent=2)

print(f"Generated 50 exams. Total unique question texts: {len(all_question_texts)} / 3250. Exact-text duplicates: {dupe_count}")
