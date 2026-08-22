# History exams — handoff prompt

**How to use:** paste everything below the line into a fresh chat, then attach the official
Armenian history exam PDF(s) in that same message (or drop them in `~/Documents/gitus_tests/`
and paste the paths, the way physics/chemistry PDFs were shared). A new agent can then continue
from scratch — it does not need this conversation's history.

---

I'm continuing work on my Armenian entrance-exam mock-test web app. **Math (50 exams × 65 Q) and Physics (50 × 70 Q) are already live and working; Biology and/or Chemistry may also be in progress by the time you read this — check what subfolders already exist under `data/exams/` before assuming.** Now add **History** as the next subject. I'll attach official Armenian history exam PDF(s) in this chat — build **one** complete history exam first; when I approve it, you'll generate **49 more**.

## Project location & how to run it
- App lives at `/Users/daniel/Haygit` (a Django + React app dockerized). Always run Docker from there: `cd ~/Haygit && docker compose up -d`. Ports: frontend **localhost:3000**, backend **localhost:8000**.
- Containers: `haygit-backend-1` (Django/daphne), `haygit-frontend-1` (Vite), `haygit-db-1` (Postgres, data in a named volume).
- ⚠️ **Backend runs daphne (ASGI) — it does NOT hot-reload.** After ANY backend Python change, run `docker restart haygit-backend-1`. The frontend (Vite) DOES hot-reload.

## Where exam data lives (infra already built — don't rebuild it)
- Exams are JSON files in `backend/apps/mock_exams/data/exams/<subject>/` — per-subject folders. Existing: `math/`, `physics/` (check for `biology/`, `chemistry/` too). **Create `history/` for the new files.**
- Import command (already recurses subfolders): `docker exec haygit-backend-1 python manage.py import_mock_exams` (idempotent upsert by `exam_id`).
- The DB model already has a `subject` field and a `figure_svg` field (migration applied). The frontend already has a `QuestionFigure` component that renders inline SVG, and `MathText` that renders `$...$` via KaTeX. **No model/renderer changes needed** (history barely needs KaTeX at all — see below).
- To add the subject tab: append `{ key: "history", label: "Պատմություն" }` to the `SUBJECTS` list in `frontend/src/pages/MockExamsPage.tsx` (Vite hot-reloads it).

## Exact JSON schema (one file per exam — preserve exactly, don't add/remove/rename/reorder fields)
Top level: `exam_id` (e.g. "AEE-HIST-001"), `title` (e.g. "Միասնական քննություն — Պատմություն (թեստ 1)"), `question_count`, `subject` ("history"), `questions` (array).
Each question object: `number`, `topic` (Armenian), `group` (null or a shared key for grouped questions), `type` (one of `"single_choice"`, `"free_response"`, `"multi_statement"`), `question` (Armenian text; rarely needs `$...$` math — dates/numbers can just be plain text), `difficulty` (Armenian: `"հեշտ"` | `"միջին"` | `"բարձր"`), `hint`, `solution_steps` (array of strings — here more like "explanation" than "calculation"), and then type-specific fields:
- single_choice: `options` (array of 4 strings), `correct_option` (Armenian letter `"Ա"`/`"Բ"`/`"Գ"`/`"Դ"`).
- free_response: `answer` (string — e.g. a year, a name, a term).
- multi_statement: `statements` (array like `"Ա) …statement…"`), `correct_option` (the TRUE statements' labels joined like `"Ա, Գ և Ե"`).
- Optional on any question: `figure_svg` (an inline `<svg>…</svg>` diagram — see the map/timeline gotcha below, this is the hard part for history).

## THE RULES (mandatory — my "TEST MASTER PROMPT")
1. **Originality**: no repeated, paraphrased, or near-duplicate questions across the 50-exam set — no reused wording, sentence structure, or framing of the same fact.
2. **Authenticity**: every question must feel like a real official Armenian Unified Entrance Examination; nothing AI-generated-looking.
3. **Schema**: preserve exactly (schema above).
4. **Structure**: match the official exam's structure from the PDFs — question count, section order, grouped questions (e.g. a shared excerpt/source followed by several questions about it), MCQ/free-response/multi-statement sections.
5. **Difficulty**: realistic easy→hard progression.
6. **Verification**: independently re-verify EVERY fact — never guess a date, name, treaty, battle outcome, or causal claim. Cross-check against your own knowledge; if uncertain about a specific date/figure, don't include the question rather than risk a wrong "official" answer. This matters more in history than any other subject — there's no computed check like a physics equation to catch an error.
7. **Language**: all Armenian, official terminology, punctuation, typography (correct historical figure/place names in their standard Armenian spelling). Never mix languages.
8. **Hints** must correspond exactly to each question (a nudge toward the relevant era/figure/concept, not a giveaway).
9. **Solutions** (`solution_steps`) must be complete, correct, and explain why the answer is right (brief historical justification, not a calculation).
10. **Grouped questions** share one scenario — typically a short excerpt, primary-source quote paraphrase, or described event, with several questions about it (repeat the shared text in each grouped question, like the physics/biology/chemistry groups do).
11–12. **Figures**: whenever a question needs one, draw it **programmatically as inline SVG**. No bitmaps/PNG/JPG. See the gotcha below — this is the one place history is genuinely harder than the science subjects.
13. **Viewer compatibility**: must render in the existing MathText/KaTeX + QuestionFigure viewer with no code changes.
14. **Validation** before finalizing (see checklist below).
15. Return only the requested output.

## ⚠️ History-specific gotcha #1: figures are the hard part (needs a judgment call per question)
Unlike physics (clean geometry) or even chemistry (simple lab sketches), history exams often reference **maps** (a kingdom's borders, a trade route, a battle's troop movements) or **portraits/photographs**. SVG can't responsibly trace real historical geography from scratch — a wrong or vague map is worse than no map, and risks failing rule #2 (authenticity) and rule #6 (accuracy).
Default approach: **only draw a figure when it is geometrically simple and verifiably accurate as SVG** — good candidates are:
- **Timelines** (a horizontal line with labeled date-markers/events) — straightforward and safe.
- **Simple relationship diagrams** (a succession/dynasty box-and-arrow chart, a cause→effect flowchart, a simple two-column comparison table rendered as SVG).
- **Schematic (non-geographic) diagrams** the source PDF actually uses, redrawn faithfully.
For anything requiring **accurate geography** (a real map with real borders/rivers/city positions), do NOT attempt a freehand SVG approximation — instead, either skip the figure and rewrite the question to work as pure text (e.g. describe the region in words instead of pointing at a map), or flag it to the user for a decision rather than guessing at geography. State clearly in your response which questions had figures skipped or adapted for this reason.

## ⚠️ History-specific gotcha #2: near-zero parameterization, so originality is entirely hand-authored
Physics/chemistry can guarantee uniqueness across 50 exams by varying numbers in a formula. **History cannot** — a question about the founding date of an empire has exactly one correct fact; there's no "vary the parameter" trick. So:
- For the FIRST exam, originality is easy (just don't repeat yourself within one exam).
- Scaling to 50 exams (when the user approves) will require a **large, hand-authored, independently-verified question bank** spanning enough distinct facts, figures, events, and angles (a single era can be asked about from many different true angles: cause, effect, date, key figure, primary source, comparison to another event) to avoid the same fact being tested with reworded phrasing. Flag this explicitly to the user before generating the 49 additional exams — do not silently start reusing facts with cosmetic rewording, that would violate rule #1 even though it's tempting at this scale.
- There is no seeded-parameterized-generator pipeline possible here the way there was for math/physics — exam #1 (and likely all 50) will be a **hand-authored, individually verified JSON**, not a Python generator script. That's expected and fine; just be transparent about it with the user rather than trying to force a numeric-generator pattern that doesn't fit the subject.

## Technical gotchas learned (carried over from other subjects — still apply)
- **PDF reading**: poppler isn't installed; use PyMuPDF — `python3 -m pip install pymupdf` then `import fitz`. Extract text per page to map the structure. Watch for font ligature-substitution artifacts in extracted Armenian text (seen before: "ու" extracting as a stray character) — sanity-check extracted prose against expected spelling, don't trust raw extraction blindly.
- **KaTeX validation**: even though history rarely needs math, if any `$...$` appears (a date range, a numbered list), validate it — KaTeX is at `/Users/daniel/Haygit/frontend/node_modules/katex`; use `katex.renderToString(seg, {throwOnError:true, strict:'error'})` via node, must be **0 errors**. Simplest: avoid `$...$` entirely for history text (plain Armenian, plain digits) unless there's a real reason to need math mode.
- Validate every `figure_svg` as well-formed XML (`xml.dom.minidom.parseString`).
- Distractors: ensure all 4 options are distinct and plausible (real alternative dates/names/events from the same era, not obviously-wrong filler) — a good history distractor is a *different real fact* that a student might confuse with the correct one, not a random string.

## Concrete task for exam #1
1. Install PyMuPDF, read the attached history PDF(s), and map the exact structure (total questions; which numbers are single_choice / free_response / grouped / multi_statement; every question that references a figure/map/excerpt; topic/era order — Armenian history vs. world history sections if both appear).
2. For any figure/map found, apply gotcha #1's judgment call (timeline/diagram = draw it; real geography = skip or rewrite, and tell the user).
3. Build ONE history exam (`history/armenian_entrance_history_01.json`, `exam_id` "AEE-HIST-001", `subject` "history") matching that structure — all Armenian, every fact independently verified, hand-authored (no generator script needed for this subject).
4. **Validate**: 0 KaTeX errors (if any math used); all SVGs well-formed; correct schema; 4 distinct options per MCQ; multi_statement labels parse; difficulty spread sane.
5. Add the "Պատմություն" tab in `frontend/src/pages/MockExamsPage.tsx`.
6. Deploy: put the file in `backend/apps/mock_exams/data/exams/history/`, run `import_mock_exams`.
7. Verify live in the browser (create a temp Django user to log in, then delete it). Show me a rendered sample.
8. Wait for my approval, then generate the other 49 the same way — but first explicitly flag gotcha #2 (originality-at-scale) to the user and confirm how they want to handle it (e.g. splitting eras/topics across exams, accepting some inevitable factual overlap dressed differently, etc.) before mass-producing 49 more.

The history PDF(s) are attached below.
