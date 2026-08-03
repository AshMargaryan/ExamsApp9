# Biology exams — handoff prompt

**How to use:** paste everything below the line into a fresh chat, then attach the official
Armenian biology exam PDF(s) in that same message (or drop them in `~/Documents/gitus_tests/`
and paste the paths). A new agent can then continue from scratch.

---

I'm continuing work on my Armenian entrance-exam mock-test web app. **Math (50 exams × 65 Q) and Physics (50 × 70 Q) are already live and working.** Now I want to add **Biology** as a third subject. I'll attach official Armenian biology exam PDF(s) in this chat — build **one** complete biology exam first; when I approve it, you'll generate **49 more**.

## Project location & how to run it
- App lives at `/Users/daniel/Haygit` (a Django + React app dockerized). Always run Docker from there: `cd ~/Haygit && docker compose up -d`. Ports: frontend **localhost:3000**, backend **localhost:8000**.
- Containers: `haygit-backend-1` (Django/daphne), `haygit-frontend-1` (Vite), `haygit-db-1` (Postgres, data in a named volume).
- ⚠️ **Backend runs daphne (ASGI) — it does NOT hot-reload.** After ANY backend Python change, run `docker restart haygit-backend-1`. The frontend (Vite) DOES hot-reload.

## Where exam data lives (infra already built — don't rebuild it)
- Exams are JSON files in `backend/apps/mock_exams/data/exams/<subject>/` — per-subject folders. Existing: `math/`, `physics/`. **Create `biology/` for the new files.**
- Import command (already recurses subfolders): `docker exec haygit-backend-1 python manage.py import_mock_exams` (idempotent upsert by `exam_id`).
- The DB model already has a `subject` field and a `figure_svg` field (migration applied). The frontend already has a `QuestionFigure` component that renders inline SVG, and `MathText` that renders `$...$` via KaTeX. **No model/renderer changes needed.**
- To add the subject tab: append `{ key: "biology", label: "Կենսաբանություն" }` to the `SUBJECTS` list in `frontend/src/pages/MockExamsPage.tsx` (Vite hot-reloads it).

## Exact JSON schema (one file per exam — preserve exactly, don't add/remove/rename/reorder fields)
Top level: `exam_id` (e.g. "AEE-BIO-001"), `title` (e.g. "Միասնական քննություն — Կենսաբանություն (թեստ 1)"), `question_count`, `subject` ("biology"), `questions` (array).
Each question object: `number`, `topic` (Armenian), `group` (null or a shared key for grouped questions), `type` (one of `"single_choice"`, `"free_response"`, `"multi_statement"`), `question` (Armenian text, may contain `$...$` LaTeX), `difficulty` (Armenian: `"հեշտ"` | `"միջին"` | `"բարձր"`), `hint`, `solution_steps` (array of strings), and then type-specific fields:
- single_choice: `options` (array of 4 strings), `correct_option` (Armenian letter `"Ա"`/`"Բ"`/`"Գ"`/`"Դ"`).
- free_response: `answer` (string).
- multi_statement: `statements` (array like `"Ա) …statement…"`), `correct_option` (the TRUE statements' labels joined like `"Ա, Գ և Ե"`).
- Optional on any question: `figure_svg` (an inline `<svg>…</svg>` diagram).

## THE RULES (mandatory — my "TEST MASTER PROMPT")
1. **Originality**: no repeated, paraphrased, or near-duplicate questions across the 50-exam set — no reused wording, sentence structure, number-sets, or solving strategy.
2. **Authenticity**: every question must feel like a real official Armenian Unified Entrance Examination; nothing AI-generated-looking.
3. **Schema**: preserve exactly (schema above).
4. **Structure**: match the official exam's structure from the PDFs — question count, section order, grouped questions, MCQ/free-response/multi-statement/true-false sections.
5. **Difficulty**: realistic easy→hard progression.
6. **Verification**: independently re-derive/verify EVERY answer — never guess. Biology: verify terminology, genetics (Punnett/ratios/probability), taxonomy, physiology.
7. **Language**: all Armenian, official terminology, punctuation, typography. Never mix languages.
8. **Hints** must correspond exactly to each question.
9. **Solutions** (`solution_steps`) must be complete, correct, and reach the verified answer.
10. **Grouped questions** share one scenario (repeat the scenario text in each grouped question, like the official exam and like my physics groups do).
11–12. **Figures**: whenever a question needs one, draw it **programmatically as inline SVG** (`<line>`, `<circle>`, `<rect>`, `<path>`, `<polygon>`, `<text>`, etc.). No bitmaps/PNG/JPG. I chose **"full diagrams, take your time"** — draw cell/organ/cross/food-web figures and iterate until clear.
13. **Viewer compatibility**: must render in the existing MathText/KaTeX + QuestionFigure viewer with no code changes.
14. **Validation** before finalizing (see checklist below).
15. Return only the requested output.

## Established pipeline that worked for math & physics (reuse it)
Write a **seeded parameterized Python generator** that **computes every numeric answer** (so answers are correct by construction) and uses a global `uniq()` dedup set so no two questions across all exams share a parameter tuple. Save generators in `exam_viewer/tests/` (there are `generate.py` for math and `generate_physics.py` for physics you can read as templates — they define the mc/fr/ms builders, SVG figure functions, and the dedup approach).
**Biology caveat:** biology is mostly conceptual, so it can't be fully parameterized like physics numbers. Only genetics/ecology math parameterizes (cross types → offspring ratios/probabilities, population/energy-pyramid calcs). The concept questions need a large hand-authored, verified question bank to reach 50× uniqueness (some conceptual overlap is unavoidable at scale, like any real bank). **For the FIRST exam, full originality is easy** — focus on one excellent, fully-verified exam.

## Technical gotchas learned (important)
- **PDF reading**: poppler isn't installed; use PyMuPDF — `python3 -m pip install pymupdf` then `import fitz`. Extract text per page to map the structure.
- **KaTeX validation**: KaTeX is at `/Users/daniel/Haygit/frontend/node_modules/katex`. Validate every `$...$` segment with `katex.renderToString(seg, {throwOnError:true, strict:'error'})` via node — must be **0 errors**.
- **Armenian letters inside math** (`$...$`) fail KaTeX strict mode — wrap any Armenian in `\text{…}` (e.g. `F_{\text{շփ}}`). Decimal comma inside math: write `{,}` (e.g. `2{,}5`). Outside math, plain Armenian text is fine.
- When writing LaTeX inside Python string literals, use `\\` (double backslash) or raw strings — a single `\t`/`\f` in a normal Python string becomes a tab/formfeed (this caused bugs).
- Validate every `figure_svg` as well-formed XML (`xml.dom.minidom.parseString`).
- Distractors: ensure all 4 options are distinct and none equals the correct answer (data-dependent collisions happen — dedup them).

## Concrete task for exam #1
1. Install PyMuPDF, read the attached biology PDF(s), and map the exact structure (total questions; which numbers are single_choice / free_response / grouped / multi_statement; every question that needs a diagram; topic order).
2. Build ONE biology exam (`biology/armenian_entrance_biology_01.json`, `exam_id` "AEE-BIO-001", `subject` "biology") matching that structure — all Armenian, every answer verified, with clean SVG diagrams where the official has figures.
3. **Validate**: 0 KaTeX errors across all `$...$`; all SVGs well-formed; correct schema; 4 distinct options per MCQ; multi_statement labels parse; difficulty spread sane.
4. Add the "Կենսաբանություն" tab in `frontend/src/pages/MockExamsPage.tsx`.
5. Deploy: put the file in `backend/apps/mock_exams/data/exams/biology/`, run `import_mock_exams`.
6. Verify live in the browser (create a temp Django user to log in, then delete it). Show me a rendered sample.
7. Wait for my approval, then generate the other 49 the same way (with the uniqueness/verification/validation guarantees), and confirm 0 duplicate questions + 0 KaTeX/SVG errors across all 50.

The biology PDF(s) are attached below.
