// ---- Math notation converter: explicit, targeted rules (no blind global regex) ----

const SUP_MAP = {'⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9','ⁿ':'n','ˣ':'x','⁺':'+','⁻':'-'};
const SUB_MAP = {'₀':'0','₁':'1','₂':'2','₃':'3','₄':'4','₅':'5','₆':'6','₇':'7','₈':'8','₉':'9','ₙ':'n','ₓ':'x'};

function escapeLiteralBraces(s) {
  // Escape any literal { or } that appear in the raw source text (used for vector/set notation
  // like AC{-7;4} or {x|...}), so KaTeX displays them as visible characters rather than
  // treating them as silent LaTeX grouping syntax. Must run BEFORE convertSupSub/convertMathSymbols
  // generate their own ^{...}, _{...}, \sqrt{...} constructs (which must stay unescaped).
  return s.replace(/\{/g, '\\{').replace(/\}/g, '\\}');
}

function fixLogSubSupPattern(s) {
  // Specific fix for "log" + subscript-base + superscript-power + argument, e.g. "log₄²2" meaning (log₄2)²
  // NOTE: superscript ² and ³ are NOT in the same Unicode block as ⁰ ⁴-⁹ (they're Latin-1 legacy
  // codepoints U+00B2/U+00B3), so a simple range [⁰-⁹] silently misses them. Use explicit class instead.
  const supClass = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  const subClass = '₀₁₂₃₄₅₆₇₈₉';
  const re = new RegExp(`log([${subClass}]+)([${supClass}]+)(\\d+)`, 'g');
  return s.replace(re, (m, sub, sup, arg) => {
    const subDigits = sub.split('').map(c => SUB_MAP[c] || '').join('');
    const supDigits = sup.split('').map(c => SUP_MAP[c] || '').join('');
    return `(\\log_{${subDigits}}${arg})^{${supDigits}}`;
  });
}

function unescapeGeneratedBraces(s) {
  // After we've generated our own LaTeX commands (^{...}, _{...}, \sqrt{...}, \log_{...}),
  // their braces were created fresh by our code (not escaped), so no unescaping needed here.
  // This function is a no-op placeholder kept for clarity of pipeline intent.
  return s;
}

function convertSupSub(s) {
  // Convert runs of unicode superscript chars immediately following a base char into ^{...}
  s = s.replace(/([A-Za-zԱ-Ֆա-ֆ0-9\)\]])([⁰¹²³⁴⁵⁶⁷⁸⁹ⁿˣ⁺⁻]+)/g, (m, base, sup) => {
    const digits = sup.split('').map(c => SUP_MAP[c] || '').join('');
    return `${base}^{${digits}}`;
  });
  // Convert runs of unicode subscript chars into _{...}
  s = s.replace(/([A-Za-zԱ-Ֆա-ֆ])([₀₁₂₃₄₅₆₇₈₉ₙₓ]+)/g, (m, base, sub) => {
    const digits = sub.split('').map(c => SUB_MAP[c] || '').join('');
    return `${base}_{${digits}}`;
  });
  return s;
}

function convertMathSymbols(s) {
  // Trig and other named functions: convert bare "cosx", "cos x", "sinx" etc. into proper
  // upright LaTeX commands with correct spacing, e.g. "cos x" not italic-glued "cosx".
  s = s.replace(/\btg(?=[\d\(A-Za-zα-ωπ\^])/g, '\\tan ');
  s = s.replace(/\bctg(?=[\d\(A-Za-zα-ωπ\^])/g, '\\cot ');
  s = s.replace(/\barctg\b/g, '\\operatorname{arctg}');
  s = s.replace(/\bcos(?=[\d\(A-Za-zα-ωπ\^])/g, '\\cos ');
  s = s.replace(/\bsin(?=[\d\(A-Za-zα-ωπ\^])/g, '\\sin ');

  // log_a(b) or log_√3(...) or log_{a}(...) [already-braced from convertSupSub] -> \log_{a}(b)
  s = s.replace(/log_√(\d+)/g, '\\log_{\\sqrt{$1}}');
  // Convert "log_{x}" or "log_x" into "\log_{x}", but never re-match if already preceded by backslash
  s = s.replace(/(?<!\\)log_\{([A-Za-z0-9]+)\}/g, '\\log_{$1}');
  s = s.replace(/(?<!\\)log_([A-Za-z0-9]+)/g, '\\log_{$1}');
  s = s.replace(/\blog(?=[\d\(])/g, '\\log ');

  // sqrt: √(...) -> \sqrt{...}; bare √digit / √letter -> \sqrt{...}
  s = s.replace(/√\(([^)]+)\)/g, '\\sqrt{$1}');
  s = s.replace(/√(\d+(?:[.,]\d+)?)/g, '\\sqrt{$1}');
  s = s.replace(/√([A-Za-zԱ-Ֆա-ֆ])/g, '\\sqrt{$1}');

  // caret exponents: ^|x| -> ^{|x|}; ^(...) -> ^{...}; ^singlechar -> ^{singlechar}
  s = s.replace(/\^\|([^|]+)\|/g, '^{|$1|}');
  s = s.replace(/\^\(([^)]+)\)/g, '^{$1}');
  s = s.replace(/\^([0-9A-Za-z])(?![0-9A-Za-z{])/g, '^{$1}');

  // greek / symbols
  s = s.replace(/π/g, '\\pi ');
  s = s.replace(/∞/g, '\\infty ');
  s = s.replace(/·/g, '\\cdot ');
  s = s.replace(/∪/g, '\\cup ');
  s = s.replace(/∈/g, '\\in ');
  s = s.replace(/≤/g, '\\le ');
  s = s.replace(/≥/g, '\\ge ');
  s = s.replace(/≠/g, '\\ne ');
  s = s.replace(/×/g, '\\times ');

  // escape literal % so KaTeX/LaTeX doesn't treat it as a comment marker
  s = s.replace(/%/g, '\\%');

  // degree symbol must become a proper superscript circle command for KaTeX, not the raw glyph
  s = s.replace(/°/g, '^{\\circ}');

  // Convert ALL division expressions into proper stacked \frac{}{} (textbook style).
  // Order matters: most specific (both sides parenthesized) first, down to simplest (digit/digit) last,
  // so a more specific pattern isn't pre-empted by a looser one matching part of it first.
  s = s.replace(/\(([^()]+)\)\s*\/\s*(\\[a-z]+\s*[0-9A-Za-z^{}°\\]*)/g, '\\frac{$1}{$2}'); // (expr)/\func arg
  s = s.replace(/\(([^()]+)\)\/\(([^()]+)\)/g, '\\frac{$1}{$2}');           // (expr)/(expr)
  s = s.replace(/([A-Za-z0-9^{}\\]+)\/\(([^()]+)\)/g, '\\frac{$1}{$2}');     // token/(expr) [\\ included for \sqrt{}, \pi etc]
  s = s.replace(/\(([^()]+)\)\/([A-Za-z0-9^{}\\]+)/g, '\\frac{$1}{$2}');     // (expr)/token
  s = s.replace(/(-?(?:\\[a-z]+\s+)?[A-Za-z0-9^{}\\]*)\s*\/\s*([A-Za-z0-9^{}\\]+)/g, '\\frac{$1}{$2}'); // token/token, handles "\pi /2", "\pi k/3", "b/a", "h/AC"
  s = s.replace(/(-?\d+)\/(\d+)/g, '\\frac{$1}{$2}');                        // plain digit/digit

  return s;
}

// ---- App state ----
const APP_STATE = {
  selections: {},      // {questionId: selectedOptionIndex (1-indexed)}
  checked: false,      // becomes true once "Check Answers" is pressed
};

function processText(raw) {
  // Step 1: escape any literal braces already in the raw source (vector/set notation etc.)
  // This MUST run first, before any of our own conversions generate fresh LaTeX braces.
  let s = escapeLiteralBraces(raw);
  // Step 2: fix the rare ambiguous log-subscript-superscript pattern
  s = fixLogSubSupPattern(s);
  // Step 3: generate fresh (unescaped) LaTeX command braces from sup/sub/sqrt/log/exponent patterns
  s = convertSupSub(s);
  s = convertMathSymbols(s);

  // Wrap explicit, well-defined math patterns in $...$.
  // A run must not end immediately before an Armenian letter with no space (that's a unit
  // abbreviation or suffix glued to a number, e.g. "15գ" or "50%-անոց" → leave the Armenian part plain).
  const runRe = /[0-9A-Za-z+\-*/=<>≤≥≠,.;:()\[\]{}|^_\\%°]+(?:\s+[0-9A-Za-z+\-*/=<>≤≥≠,.;:()\[\]{}|^_\\%°]+)*/g;

  s = s.replace(runRe, (m, offset) => {
    let trimmed = m.trim();
    if (trimmed.length === 0) return m;

    // Peel off a leading list marker like "1)" or "6)" at the very start of a statement line —
    // this is numbering, not math, and should render as plain text.
    const leadingMarker = trimmed.match(/^(\d+\))\s*(.*)$/);
    if (leadingMarker) {
      const marker = leadingMarker[1];
      const rest = leadingMarker[2];
      if (rest.length === 0) return marker;
      if (/[0-9=+\-<>≤≥≠^_\\√]/.test(rest)) {
        return marker + ' $' + rest + '$';
      }
      return marker + ' ' + rest;
    }

    const followedByArmenian = /[\u0531-\u0556\u0561-\u0586]/.test(s[offset + m.length] || '');
    if (followedByArmenian) {
      // Case: run is a word/abbreviation immediately followed by "-armenian_suffix" (e.g. "tg-ով").
      // If the run ends in a bare hyphen with no digits/operators before it forming real math, leave plain.
      const wordHyphenMatch = trimmed.match(/^([A-Za-z]+)-$/);
      if (wordHyphenMatch) {
        return trimmed; // e.g. "tg-" stays plain, Armenian suffix follows naturally
      }
      // Note: % has already been escaped to \% by this point, so the trailing-fragment
      // pattern must match the two-character sequence \% as well as bare digits/hyphens.
      const peelMatch = trimmed.match(/^(.*?)((?:\\%|[0-9\-])+)$/);
      if (peelMatch && peelMatch[2].length < trimmed.length) {
        const head = peelMatch[1];
        const tail = peelMatch[2];
        if (/[0-9=+\-<>≤≥≠^_\\√]/.test(head)) {
          return '$' + head + '$' + tail;
        }
      } else {
        if (/^(?:\\%|[0-9\-])+$/.test(trimmed)) return trimmed;
      }
    }
    if (!/[0-9=+\-<>≤≥≠^_\\√]/.test(trimmed) && trimmed.length <= 2) return m;
    return '$' + trimmed + '$';
  });

  return s;
}

// ---- Rendering ----

function diffLabel(d) {
  if (d === 'easy') return 'հեշտ';
  if (d === 'medium') return 'միջին';
  if (d === 'hard') return 'դժվար';
  return d;
}

function renderQuestion(q, container, strippedQuestionText) {
  const card = document.createElement('div');
  card.className = 'question-card';
  card.id = 'q' + q.id;

  const num = document.createElement('div');
  num.className = 'qnum';
  num.textContent = q.id;
  card.appendChild(num);

  const diffTag = document.createElement('span');
  diffTag.className = 'difficulty-tag difficulty-' + q.difficulty;
  diffTag.textContent = diffLabel(q.difficulty);
  card.appendChild(diffTag);

  const qtext = document.createElement('div');
  qtext.className = 'qtext';
  const questionText = strippedQuestionText !== undefined ? strippedQuestionText : q.question;
  const lines = questionText.split('\n');
  qtext.innerHTML = lines.map(line => `<span class="statement-line">${processText(line)}</span>`).join('');
  card.appendChild(qtext);

  if (q.options) {
    const optWrap = document.createElement('div');
    optWrap.className = 'options';
    optWrap.id = 'opts-' + q.id;
    const labels = ['Ա', 'Բ', 'Գ', 'Դ'];
    q.options.forEach((opt, idx) => {
      const optDiv = document.createElement('div');
      optDiv.className = 'option';
      optDiv.dataset.idx = idx + 1;
      optDiv.innerHTML = `<span class="label">${labels[idx]}</span><span class="opt-text">${processText(opt)}</span>`;
      optDiv.onclick = () => {
        if (APP_STATE.checked) return; // lock selection once answers have been checked
        optWrap.querySelectorAll('.option').forEach(o => o.classList.remove('selected'));
        optDiv.classList.add('selected');
        APP_STATE.selections[q.id] = idx + 1;
      };
      optWrap.appendChild(optDiv);
    });
    card.appendChild(optWrap);

    const fb = document.createElement('div');
    fb.className = 'q-feedback';
    fb.id = 'fb-' + q.id;
    card.appendChild(fb);
  }

  const btnRow = document.createElement('div');
  btnRow.className = 'btn-row';

  const hintBtn = document.createElement('button');
  hintBtn.className = 'toggle-btn';
  hintBtn.textContent = 'Հուշում';
  const hintBox = document.createElement('div');
  hintBox.className = 'hint-box';
  hintBox.innerHTML = processText(q.hint);
  hintBtn.onclick = () => {
    hintBox.classList.toggle('shown');
    renderMathIn(hintBox);
  };
  btnRow.appendChild(hintBtn);

  const solBtn = document.createElement('button');
  solBtn.className = 'reveal-btn';
  solBtn.textContent = 'Լուծման ընթացք';
  const ansBox = document.createElement('div');
  ansBox.className = 'answer-box';
  const stepsHtml = q.solution_steps.map(step => {
    if (step.trim() === '') {
      return `<li class="blank" aria-hidden="true"></li>`;
    }
    let display = step;
    if (display.trim().startsWith('★')) {
      display = display.trim().slice(1).trim();
      return `<li><span class="step-marker">★</span>${processText(display)}</li>`;
    }
    return `<li>${processText(step)}</li>`;
  }).join('');
  ansBox.innerHTML = `<ul class="steps-list">${stepsHtml}</ul>`;
  solBtn.onclick = () => {
    ansBox.classList.toggle('shown');
    renderMathIn(ansBox);
  };
  btnRow.appendChild(solBtn);

  card.appendChild(btnRow);
  card.appendChild(hintBox);
  card.appendChild(ansBox);

  container.appendChild(card);
  renderMathIn(card);
}

function renderMathIn(el) {
  if (window.renderMathInElement) {
    renderMathInElement(el, {
      delimiters: [{left: '$', right: '$', display: false}],
      throwOnError: false
    });
  }
}

function buildExam() {
  const root = document.getElementById('exam-root');
  const groupsShown = new Set();

  const byGroup = {};
  EXAM_DATA.questions.forEach(q => {
    byGroup[q.group] = byGroup[q.group] || [];
    byGroup[q.group].push(q);
  });

  EXAM_DATA.questions.forEach((q) => {
    const group = q.group;
    const groupQs = byGroup[group];
    let strippedText = q.question;

    if (groupQs.length > 1) {
      const texts = groupQs.map(x => x.question);
      let common = sharedPrefix(texts);
      const lastDot = Math.max(common.lastIndexOf('։'), common.lastIndexOf('.'));
      if (lastDot > 10) {
        common = common.slice(0, lastDot + 1);
        // Strip the shared condition from THIS question's own displayed text, since it's
        // already shown once in the group-condition box right above the group's first question.
        if (q.question.startsWith(common)) {
          strippedText = q.question.slice(common.length).trim();
        }
        if (!groupsShown.has(group)) {
          groupsShown.add(group);
          const cond = document.createElement('div');
          cond.className = 'group-condition';
          cond.innerHTML = `<span class="group-label">Հանրագիր ${group}</span>${processText(common)}`;
          root.appendChild(cond);
          renderMathIn(cond);
        }
      }
    }

    renderQuestion(q, root, strippedText);
  });

  buildCheckAnswersBar(root);
}

function buildCheckAnswersBar(root) {
  const bar = document.createElement('div');
  bar.className = 'check-bar';
  bar.innerHTML = `
    <button class="check-answers-btn" id="check-answers-btn">Ստուգել պատասխանները</button>
    <div class="check-summary" id="check-summary"></div>
  `;
  root.appendChild(bar);

  document.getElementById('check-answers-btn').onclick = () => {
    APP_STATE.checked = true;
    let correctCount = 0;
    let answeredCount = 0;
    const mcqQuestions = EXAM_DATA.questions.filter(q => q.options);

    mcqQuestions.forEach(q => {
      const selected = APP_STATE.selections[q.id];
      const optWrap = document.getElementById('opts-' + q.id);
      const fb = document.getElementById('fb-' + q.id);
      if (!optWrap) return;

      if (selected) answeredCount++;
      const isCorrect = selected === q.correct_option;
      if (isCorrect) correctCount++;

      optWrap.querySelectorAll('.option').forEach(o => {
        const idx = parseInt(o.dataset.idx, 10);
        o.classList.remove('selected');
        if (idx === q.correct_option) o.classList.add('correct');
        else if (idx === selected) o.classList.add('incorrect');
      });

      if (fb) {
        if (!selected) {
          fb.innerHTML = `<span class="fb-unanswered">Չպատասխանված</span> — ճիշտ պատասխանն է՝ ${processText(String(q.answer))}`;
        } else if (isCorrect) {
          fb.innerHTML = `<span class="fb-correct">✓ Ճիշտ պատասխան</span>`;
        } else {
          fb.innerHTML = `<span class="fb-incorrect">✗ Սխալ պատասխան</span> — ճիշտ պատասխանն է՝ ${processText(String(q.answer))}`;
        }
        renderMathIn(fb);
      }
    });

    const summary = document.getElementById('check-summary');
    const pct = mcqQuestions.length ? Math.round((correctCount / mcqQuestions.length) * 100) : 0;
    summary.innerHTML = `
      <div class="summary-line"><strong>${correctCount}</strong> ճիշտ <strong>${mcqQuestions.length}</strong>-ից (${pct}%)</div>
      <div class="summary-line summary-sub">Պատասխանված է ${answeredCount} հարց ${mcqQuestions.length}-ից</div>
    `;
    summary.classList.add('shown');

    document.getElementById('check-answers-btn').textContent = 'Թեստն ստուգված է';
    document.getElementById('check-answers-btn').disabled = true;

    summary.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
}

function sharedPrefix(strings) {
  if (!strings.length) return '';
  let prefix = strings[0];
  for (const s of strings.slice(1)) {
    let i = 0;
    while (i < prefix.length && i < s.length && prefix[i] === s[i]) i++;
    prefix = prefix.slice(0, i);
  }
  return prefix;
}

// ---- AI panel shell (placeholder UI, no live AI wired up yet) ----

function setupAIPanel() {
  const toggleBtn = document.getElementById('ai-toggle-btn');
  const panel = document.getElementById('ai-panel');
  const closeBtn = document.getElementById('ai-panel-close');
  const appShell = document.getElementById('app-shell');
  if (!toggleBtn || !panel) return;

  toggleBtn.onclick = () => {
    appShell.classList.toggle('ai-open');
  };
  if (closeBtn) {
    closeBtn.onclick = () => appShell.classList.remove('ai-open');
  }
}

setupAIPanel();


buildExam();
