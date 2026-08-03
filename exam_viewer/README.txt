================================================================
  ARMENIAN MATH EXAM VIEWER — GUIDE
================================================================

WHAT'S IN THIS FOLDER
---------------------
  exam_standalone.html   <- OPEN THIS. Works by double-clicking.
  data.json              <- YOUR QUESTIONS. Edit this file.
  build_standalone.py    <- Run after editing data.json.
  index.html             <- Template (don't edit unless changing design)
  render.js              <- Logic (don't edit unless changing behavior)
  katex_assets/          <- Math fonts. Must stay in this folder.


================================================================
  HOW TO USE YOUR OWN QUESTIONS
================================================================

STEP 1 — Replace data.json with your own file
   Keep the same filename: data.json
   Keep the same structure (see below).

STEP 2 — Rebuild
   Open a terminal in this folder and run:

       python3 build_standalone.py

   You'll see: "Built exam_standalone.html — Questions: N"

STEP 3 — Open exam_standalone.html
   Double-click it. Done.

   (If you skip Step 2, the HTML still shows the OLD questions.
    You must rebuild every time you change data.json.)


================================================================
  data.json STRUCTURE
================================================================

{
  "test_title": "Your test name",
  "language": "hy",
  "total_questions": 65,
  "questions": [ ... ]
}

--- MULTIPLE-CHOICE QUESTION ---

{
  "id": 1,
  "difficulty": "easy",
  "topic": "թվաբանություն",
  "group": "1-4",
  "question": "Գտնել 45-ի և 60-ի ամենամեծ ընդհանուր բաժանարարը։",
  "hint": "Վերլուծեք երկու թվերը պարզ արտադրիչների...",
  "solution_steps": [
    "45 = 3² · 5",
    "60 = 2² · 3 · 5",
    "ԱԸԲ = 3 · 5 = 15"
  ],
  "options": ["10", "15", "5", "180"],
  "correct_option": 2,
  "answer": "15"
}

--- FREE-RESPONSE QUESTION (no options) ---

{
  "id": 37,
  "difficulty": "hard",
  "topic": "երկրաչափության_հիմունքներ",
  "group": "37-40",
  "question": "Գտնել պրիզմայի անկյունագծի քառակուսին։",
  "hint": "Օգտագործեք d² = a² + a² + h² բանաձևը։",
  "answer": "100",
  "solution_steps": ["a² = 32", "d² = 32 + 32 + 36 = 100"]
}

Just omit "options" and "correct_option" for free-response.
These questions are skipped in the score count.


FIELD REFERENCE
---------------
  id              Number. Must be unique.
  difficulty      "easy" | "medium" | "hard"
                  (shows as հեշտ / միջին / դժվար)
  topic           Any text. Used for internal grouping only.
  group           Text like "1-4". Questions sharing a group
                  that also share an opening sentence will show
                  that sentence ONCE in a box above the group.
                  Use a unique value (e.g. "12") for standalone
                  questions.
  question        The question text. Use \n for line breaks
                  (useful for numbered sub-statements).
  hint            Shown when the user clicks "Հուշում".
  solution_steps  Array of strings. Shown when the user clicks
                  "Լուծման ընթացք". Use "" for a blank spacer
                  line, and start a line with ★ to make it a
                  red section header.
  options         Array of EXACTLY 4 strings (MCQ only).
  correct_option  1, 2, 3, or 4 — which option is right.
                  IMPORTANT: 1-indexed, not 0-indexed.
  answer          The correct answer as text. Shown in the
                  feedback after "Check Answers".


================================================================
  WRITING MATH
================================================================

Write math in normal Unicode. It converts automatically.

  You type          You get
  --------          -------
  x²                x squared (raised)
  bₙ                b with subscript n
  √(x+1)            proper square root sign
  1/4               stacked fraction
  (a+b)/(c-d)       stacked fraction
  π                 pi symbol
  60°               degree symbol
  ·                 multiplication dot
  ≤ ≥ ≠ ∞ ∪ ∈       render correctly
  cos, sin, tg      upright function names with proper spacing
  log_a(b)          log with subscript base
  |x|               absolute value
  {-7; 4}           vector coordinates (braces stay visible)

Notes:
  - Use comma for decimals (3,5 not 3.5) — Armenian convention.
  - Armenian text mixed with math works fine; the converter
    detects Armenian letters and leaves them as plain text.
  - Units glued to numbers (15գ, 50%-անոց, 12 սմ) stay as
    normal text — they won't be italicized as math.


================================================================
  FEATURES
================================================================

  * Click an answer     -> neutral highlight (no feedback yet)
  * "Ստուգել պատասխանները" -> reveals all correct/incorrect
                              + score summary
  * "Հուշում"           -> shows the hint
  * "Լուծման ընթացք"    -> shows full solution steps
  * AI button (bottom-right) -> opens 70/30 split panel
                                (placeholder — not wired up yet)


================================================================
  ALTERNATIVE: RUN WITH A LOCAL SERVER
================================================================

If you'd rather not rebuild each time, you can run a server and
use index.html directly (it loads data.json live):

    python3 -m http.server 8000

Then open:  http://localhost:8000/index.html

With this method, editing data.json + refreshing the page is
enough — no rebuild step. But it requires the server running.


================================================================
  CONNECTING THE AI PANEL LATER
================================================================

In render.js, find setupAIPanel().

  - Input field:   class "ai-input"   (currently disabled)
  - Send button:   class "ai-send-btn" (currently disabled)
  - Message area:  class "ai-pane-body"

Remove the disabled attributes, wire the send button to your
AI API, and append messages into .ai-pane-body.

The user's current answers are available in APP_STATE.selections
(an object like {1: 2, 5: 3} meaning question 1 -> option 2).

================================================================
