# Chemistry exams — handoff prompt

**How to use:** paste everything below the line into a fresh chat, then attach the official
Armenian chemistry exam PDF(s) in that same message (the ones already analyzed for this prompt
are at `/Users/daniel/Documents/gitus_tests/11_1.pdf` … `11_4.pdf` — reattach them, or point the
new agent at that path). A new agent can then continue from scratch.

---

I'm continuing work on my Armenian entrance-exam mock-test web app. **Math (50 exams × 65 Q) and Physics (50 × 70 Q) are already live and working; Biology is in progress as a third subject.** Now add **Chemistry** as the next subject. I'll attach official Armenian chemistry exam PDF(s) in this chat (also available at `/Users/daniel/Documents/gitus_tests/11_1.pdf` … `11_4.pdf`) — build **one** complete chemistry exam first; when I approve it, you'll generate **49 more**.

## Project location & how to run it
- App lives at `/Users/daniel/Haygit` (a Django + React app dockerized). Always run Docker from there: `cd ~/Haygit && docker compose up -d`. Ports: frontend **localhost:3000**, backend **localhost:8000**.
- Containers: `haygit-backend-1` (Django/daphne), `haygit-frontend-1` (Vite), `haygit-db-1` (Postgres, data in a named volume).
- ⚠️ **Backend runs daphne (ASGI) — it does NOT hot-reload.** After ANY backend Python change, run `docker restart haygit-backend-1`. The frontend (Vite) DOES hot-reload.

## Where exam data lives (infra already built — don't rebuild it)
- Exams are JSON files in `backend/apps/mock_exams/data/exams/<subject>/` — per-subject folders. Existing: `math/`, `physics/` (and maybe `biology/` by now). **Create `chemistry/` for the new files.**
- Import command (already recurses subfolders): `docker exec haygit-backend-1 python manage.py import_mock_exams` (idempotent upsert by `exam_id`).
- The DB model already has a `subject` field and a `figure_svg` field (migration applied). The frontend already has a `QuestionFigure` component that renders inline SVG, and `MathText` that renders `$...$` via KaTeX. **No model/renderer changes needed.**
- To add the subject tab: append `{ key: "chemistry", label: "Քիմիա" }` to the `SUBJECTS` list in `frontend/src/pages/MockExamsPage.tsx` (Vite hot-reloads it).

## Exact JSON schema (one file per exam — preserve exactly, don't add/remove/rename/reorder fields)
Top level: `exam_id` (e.g. "AEE-CHEM-001"), `title` (e.g. "Միասնական քննություն — Քիմիա (թեստ 1)"), `question_count`, `subject` ("chemistry"), `questions` (array).
Each question object: `number`, `topic` (Armenian), `group` (null or a shared key for grouped questions), `type` (one of `"single_choice"`, `"free_response"`, `"multi_statement"`), `question` (Armenian text, may contain `$...$` LaTeX), `difficulty` (Armenian: `"հեշտ"` | `"միջին"` | `"բարձր"`), `hint`, `solution_steps` (array of strings), and then type-specific fields:
- single_choice: `options` (array of 4 strings), `correct_option` (Armenian letter `"Ա"`/`"Բ"`/`"Գ"`/`"Դ"`).
- free_response: `answer` (string).
- multi_statement: `statements` (array like `"Ա) …statement…"`), `correct_option` (the TRUE statements' labels joined like `"Ա, Գ և Ե"`).
- Optional on any question: `figure_svg` (an inline `<svg>…</svg>` diagram).

## THE RULES (mandatory — my "TEST MASTER PROMPT")
1. **Originality**: no repeated, paraphrased, or near-duplicate questions across the 50-exam set — no reused wording, sentence structure, number-sets, or solving strategy.
2. **Authenticity**: every question must feel like a real official Armenian Unified Entrance Examination; nothing AI-generated-looking.
3. **Schema**: preserve exactly (schema above).
4. **Structure**: match the official exam's structure from the PDFs — question count, section order, grouped questions, MCQ/free-response/multi-statement sections.
5. **Difficulty**: realistic easy→hard progression.
6. **Verification**: independently re-derive/verify EVERY answer — never guess. Chemistry: verify balanced equations, stoichiometry (mole/mass/volume/concentration calcs), oxidation states, IUPAC/organic naming and reaction mechanisms, periodic-table facts (electron configuration, valence, periodicity).
7. **Language**: all Armenian, official terminology, punctuation, typography. Never mix languages.
8. **Hints** must correspond exactly to each question.
9. **Solutions** (`solution_steps`) must be complete, correct, and reach the verified answer.
10. **Grouped questions** share one scenario (repeat the scenario text in each grouped question, like the official exam and like my physics/biology groups do).
11–12. **Figures**: whenever a question needs one, draw it **programmatically as inline SVG** (`<line>`, `<circle>`, `<rect>`, `<path>`, `<polygon>`, `<text>`, etc.). No bitmaps/PNG/JPG. Take the time to make them clear (see "diagrams found" below).
13. **Viewer compatibility**: must render in the existing MathText/KaTeX + QuestionFigure viewer with no code changes (see chemistry-formula gotcha below — it's the one place this needs a decision).
14. **Validation** before finalizing (see checklist below).
15. Return only the requested output.

## What the real exam ("Test 1", 4 PDFs, 23 pages, 70 questions) actually looks like — already analyzed, don't re-derive from scratch
I extracted this with PyMuPDF (`pip install pymupdf`; poppler is not installed) from `11_1.pdf`. Use it as ground truth for exam #1's structure:
- **70 questions total**, mostly **single_choice** (4 numbered options `1) 2) 3) 4)`).
- **A distinctive chemistry MCQ sub-style**: the question stem lists lettered items (ա, բ, գ, դ, ե...), and the 4 options are each a *combination* of those letters (e.g. "1) բ, դ" / "2) ա, բ, ե" / "3) բ, գ, դ" / "4) գ, ե") — asking "which of the following processes/statements are true, pick the matching combo." This is still just `single_choice` in the schema — the combo text is simply the option string — no schema change, just replicate the style.
- **2 multi_statement questions** near the end, introduced by "**Հաստատել կամ հերքել**" (confirm or refute) rather than physics's "Հաստատեք կամ ժխտեք" — same meaning/schema (5–6 lettered statements, `correct_option` = true labels). Use whichever phrasing matches your specific PDF page.
- **~10 grouped scenarios**, sizes 2 or 3, marked like `(14-15)`, `(23-24)`, `(34-35)`, `(46-47)`, `(48-49)`, `(50-51)`, `(52-53)`, `(54-55)`, `(62-64)`, `(65-67)`. Groups mix `single_choice` sub-questions (e.g. "which electron configuration") and `free_response` calculation sub-questions (numeric answer, e.g. "what volume of O₂ (л)", "what is the mass fraction (%)") — no "multiply by 10^x" convention here, answers are plain numbers with the unit stated in the question text, sometimes rounded ("կլորացրեք...").
- **Real diagrams exist** (5 embedded images in the source, confirmed by their surrounding text): a **reaction energy/progress diagram** ("Ա + Բ → Գ ռեակցիայի..." — is it fast/exothermic/etc., asked from a graph), a **lab apparatus sketch** (two test tubes with metal rods in acid, comparing gas evolution), and similar. Recreate these as clean SVG (energy-vs-reaction-coordinate curves, simple lab-glassware diagrams) — same spirit as the physics circuit/P–V-graph/pulley figures.
- Topics span: general/inorganic (mass conservation law, redox, periodicity, electron configuration, chemical equilibrium, reaction rates, thermochemistry, electrolysis, solutions/concentration) and organic (alkanes/alkenes, alcohols, esters, Wurtz reaction, silver-mirror/aldehyde reactions, IUPAC naming, structural isomer counting).

## ⚠️ Chemistry-specific gotcha: formula rendering (needs a decision before you start)
Chemical formulas (H₂O, SO₄²⁻, CH₃–CH₂–OH) and reaction arrows need subscripts/superscripts. The renderer is plain KaTeX (`MathText.tsx` imports `katex` directly). **KaTeX's `mhchem` extension (`\ce{H2O}` syntax) exists in `node_modules/katex/dist/contrib/mhchem.js` but is NOT imported anywhere in the app** — so `\ce{...}` will throw KaTeX errors right now.
Two options — **pick one and stay consistent across all 50 exams**:
- **(Recommended, zero code change, honors rule 13 literally)**: write formulas as plain LaTeX inside `$...$` using manual subscripts/superscripts, e.g. `$H_2O$`, `$SO_4^{2-}$`, `$CH_3\text{-}CH_2\text{-}OH$`, reaction arrows as `$\rightarrow$` or `$\rightleftharpoons$`. This is exactly the same technique already used for physics unit subscripts (`F_{\text{շփ}}`) — proven to work and validate cleanly in KaTeX strict mode.
- **(Alternative, prettier chemical notation, small approved code change)**: add one import line `import "katex/contrib/mhchem"` to `frontend/src/components/MathText.tsx` (or wherever KaTeX is set up) to enable `\ce{...}` syntax, then use `$\ce{H2O + CO2 -> H2CO3}$`. Only do this if you confirm with the user first — it's a frontend code change, however trivial.
Default to the first option unless told otherwise.

## Established pipeline that worked for math & physics (reuse it)
Write a **seeded parameterized Python generator** that **computes every numeric answer** (so answers are correct by construction) and uses a global `uniq()` dedup set so no two questions across all exams share a parameter tuple. Save generators in `exam_viewer/tests/` (there are `generate.py` for math and `generate_physics.py` for physics you can read as templates — they define the mc/fr/ms builders, SVG figure functions, and the dedup approach).
**Chemistry caveat:** stoichiometry/concentration/gas-law calculations parameterize well (like physics numbers — vary masses, volumes, concentrations, then compute the answer). Nomenclature, mechanism, and periodicity/electron-configuration questions are conceptual and need a large hand-authored, verified bank to reach 50× uniqueness (some conceptual overlap is unavoidable at scale, like any real exam bank). **For the FIRST exam, full originality is easy** — focus on one excellent, fully-verified exam; re-derive every balanced equation and stoichiometric ratio by hand before trusting it.

## Technical gotchas learned (carried over from physics/biology work — important)
- **PDF reading**: poppler isn't installed; use PyMuPDF — `python3 -m pip install pymupdf` then `import fitz`. Extract text per page to map the structure. Note: this particular PDF's font has minor ligature-substitution artifacts in extracted text (e.g. "ու" sometimes extracts as "ɰ", "մ" inside some words maps oddly) — sanity-check extracted Armenian words against expected spelling, don't trust the raw extraction blindly for prose; numbers/formulas extract fine.
- **KaTeX validation**: KaTeX is at `/Users/daniel/Haygit/frontend/node_modules/katex`. Validate every `$...$` segment with `katex.renderToString(seg, {throwOnError:true, strict:'error'})` via node — must be **0 errors**.
- **Armenian letters inside math** (`$...$`) fail KaTeX strict mode — wrap any Armenian in `\text{…}` (e.g. `U_{\text{կաս}}`). Decimal comma inside math: write `{,}` (e.g. `2{,}5`). Outside math, plain Armenian text is fine.
- When writing LaTeX inside Python string literals, use `\\` (double backslash) or raw strings — a single `\t`/`\f` in a normal Python string becomes a tab/formfeed (this caused real bugs before).
- Validate every `figure_svg` as well-formed XML (`xml.dom.minidom.parseString`).
- Distractors: ensure all 4 options are distinct and none equals the correct answer (data-dependent collisions happen — dedup/perturb them, don't pad with whitespace-only variants).

## Concrete task for exam #1
1. Install PyMuPDF, read the attached chemistry PDF(s) (or reuse the structure notes above if they're the same `11_1–11_4.pdf` set), and confirm/refine the exact structure (which numbers are single_choice / free_response / grouped / multi_statement; every question needing a diagram; topic order).
2. Decide the formula-rendering approach (see gotcha above) and confirm with the user if choosing the mhchem code-change route.
3. Build ONE chemistry exam (`chemistry/armenian_entrance_chemistry_01.json`, `exam_id` "AEE-CHEM-001", `subject` "chemistry") matching that structure — all Armenian, every answer independently verified (balance every equation, check every stoichiometric ratio by hand), with clean SVG diagrams where the official has figures.
4. **Validate**: 0 KaTeX errors across all `$...$`; all SVGs well-formed; correct schema; 4 distinct options per MCQ; multi_statement labels parse; difficulty spread sane.
5. Add the "Քիմիա" tab in `frontend/src/pages/MockExamsPage.tsx`.
6. Deploy: put the file in `backend/apps/mock_exams/data/exams/chemistry/`, run `import_mock_exams`.
7. Verify live in the browser (create a temp Django user to log in, then delete it). Show me a rendered sample.
8. Wait for my approval, then generate the other 49 the same way (with the uniqueness/verification/validation guarantees), and confirm 0 duplicate questions + 0 KaTeX/SVG errors across all 50.

The chemistry PDF(s) are attached below (or at `/Users/daniel/Documents/gitus_tests/11_1.pdf` … `11_4.pdf`).
