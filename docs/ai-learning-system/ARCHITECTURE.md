# Gitus AI Learning System — Architecture

This documents the subsystems that make up Gitus's adaptive-learning
pipeline: what owns which data, how they consume each other, and where a
new engine should plug in. It reflects what is actually implemented, not a
target design — update it when a subsystem's contract changes, not on every
internal refactor.

## Data-separation rule

Each concept below has exactly one owner. No other app recomputes or
duplicates it. When in doubt about where a new field belongs, find the
concept it's closest to in this list before creating a new model.

| Concept | Owner | Not owned by |
|---|---|---|
| Learner identity/profile, goals, subjects, exams, availability, pedagogical preferences, raw event log | `apps.profiles` | anything else |
| Knowledge state (mastery %, spaced-repetition schedule for practice topics) | `apps.knowledge` | `apps.profiles`, `apps.practice` |
| Mistakes and their AI-classified error category | `apps.mistakes` | `apps.knowledge` |
| Study plan (what to do next) | `apps.study_plan` | `apps.profiles` |
| AI Tutor conversations | `apps.ai_assistant` | — |

`apps.profiles` deliberately does **not** compute mastery, classify
mistakes, or plan study sessions — it only stores what the student declared
or what happened, for other engines to read.

## 1. Learner Profile foundation (`apps.profiles`)

Extends the existing `Profile` model rather than introducing a competing
`StudentProfile` app. Models:

- **`Profile`** — identity/gamification (XP, level, `target_exam_date`,
  `target_major`). Pre-existing; untouched.
- **`PersonalGoal`** — structured goals (`goal_type`, optional subject,
  `priority`, `deadline`, `metadata`). Progress is always computed live via
  `analytics.goal_progress`, never stored, so it can't drift from the data
  it's based on.
- **`StudentSubject`** — a student's active-subject interest
  (`subject_key`, `priority`, optional linked exam). One row per
  `(user, subject_key)`.
- **`StudentExam`** — an upcoming exam a student is preparing for (name,
  subject, date, target score, importance, status). Does not compute
  urgency/readiness — that belongs to a future Exam Engine.
- **`StudyAvailability`** — student-**declared** study-time preferences
  (preferred days/time, session length bounds, timezone). One row per user.
  Deliberately never reads or writes `apps.activity`/`apps.streaks`
  (system-**observed** behavior) — the gap between what a student says and
  what they actually do is a signal future systems (Schedule Adaptation)
  need to reason about, not something to silently merge away.
- **`LearningPreferences`** — student-declared pedagogical preferences for
  the AI Tutor (`explanation_style`: direct/socratic/mixed,
  `hints_before_answers`, `preferred_language`). One row per user. Distinct
  from `StudyAvailability` (time, not teaching style) and from
  `ai_assistant`'s per-message `conversation_mode` (a one-turn override —
  see §3).
- **`LearningEvent`** — append-only log of discrete learning activity
  (`event_type`, `subject_key`, `topic_label`, `source`, optional `session`
  FK to `apps.activity.StudySession`, `target_id`, `result`, `metadata`,
  `occurred_at`). Indexed on `(user, -occurred_at)`,
  `(user, event_type, -occurred_at)`, `(user, subject_key)`.

  This table does **not** duplicate domain apps' own attempt/result rows
  (`PracticeAttempt`, `MockExamAttempt`, ...) — those remain the source of
  truth for per-question data. It exists for event types with no other
  structured home: hint/explanation requests, AI-Tutor pedagogical modes,
  and exam completion milestones. Written only via
  `apps.profiles.services.record_event(user, event_type, ...)` — never
  exposed for students to write directly (`LearningEventListView` is
  read-only), since a self-reported `test_completed` event would be
  fakeable.

  **Current writers:** `apps.mock_exams.views.FinishAttemptView`
  (`exam_completed`), `apps.ai_assistant.services.message_service`
  (`explanation_requested` for `explain_mode`/`why_am_i_wrong`,
  `concept_reviewed` for `teach_it_to_me`). `practice` and `flashcards` do
  not write to this log yet — their own attempt/review tables already serve
  as the per-answer history; add a call to `record_event` there only when a
  concrete consumer needs a cross-domain timeline event they don't already
  provide.

- **`get_learner_context(user, *, recent_events_limit=20, include_events=True)`**
  (`apps.profiles.context`) — the one place any future AI system should
  call to read this app's data for prompt construction, instead of
  querying the models above directly. Assembles identity, profile, active
  subjects, upcoming exams, incomplete goals, study availability, learning
  preferences, and recent events into one dict. Both limit params exist so
  a caller that only needs "does this student have an availability
  preference" isn't forced to also pay for an events query it won't use.
  Exposed at `GET /api/profile/learner-context/`.

## 2. Knowledge Engine (`apps.knowledge`)

Owns mastery, kept out of `apps.profiles` per the data-separation rule.

- **`SubjectMastery`** / **`TopicMastery`** — `mastery_score` (0-100 or
  null), `attempts_count`, `correct_count`, `data_sufficiency`
  (low/medium/high), `last_activity_at`. `TopicMastery` additionally carries
  SM-2 spaced-repetition state (`ease_factor`, `interval_days`,
  `next_review_at`), only populated for subjects with practice content
  (math, english today).
- **`scoring.compute_mastery`** — recency-weighted (30-day half-life)
  scoring over raw answer events; not a simple lifetime accuracy average, so
  a student who improved recently scores higher than their all-time ratio.
- **`signals.py`** — recomputes on every `AttemptAnswer`, `MockExamAnswer`
  (skips drafts), and `FlashcardReview` save. Triggered by domain-app
  writes, not by `LearningEvent` — the event log is not the mastery input.
- **`management/commands/backfill_mastery.py`** — idempotent full rescan,
  needed because signals only fire on *new* saves; a returning user's
  pre-existing history needs this to populate mastery once.
- API: `GET /api/knowledge/subjects/`, `GET /api/knowledge/topics/`.

`apps.profiles.analytics.subject_mastery()`'s headline `mastery` number
reads from here — there is exactly one mastery number in the product, not
two independently-computed ones.

## 3. AI Tutor integration (`apps.ai_assistant`)

- **`CONVERSATION_MODE_FRAMING`** (`prompts.py`) — per-turn framing text
  keyed by `conversation_mode`, sent by the frontend in
  `educational_context` for one specific message
  (`explain_mode`, `teach_it_to_me`, `why_am_i_wrong`, plus the original
  `solving_question`/`learning`/`revision`/`general_chat`/`homework_solver`).
  This is an explicit **per-message** override, always taking priority over
  the student's standing `LearningPreferences` default.
- **`PromptBuilder._build_system_prompt`** — composes, in order: base
  system prompt → explicit per-turn mode framing (if set) → standing
  preference directives (only applied when no explicit mode was set for
  this turn — `explanation_style=direct` falls back to the `explain_mode`
  framing, `hints_before_answers=False` relaxes the Socratic-first default,
  `preferred_language` overrides "reply in the student's own language") →
  a compact `get_learner_context()` summary (goals/subjects/exams/
  availability/recent activity, capped at a few items each so the system
  prompt stays cheap in tokens) → RAG-retrieved educational chunks.
- **`message_service._record_learning_event`** — after a successful reply,
  maps `explain_mode`/`why_am_i_wrong` → `LearningEvent.EXPLANATION_REQUESTED`
  and `teach_it_to_me` → `LearningEvent.CONCEPT_REVIEWED`. Fired from both
  `send_message` and `regenerate`.

## 4. Mistake Intelligence (`apps.mistakes`)

`MistakeEntry.error_category`/`error_explanation`/`classified_at` — lazy,
best-effort AI classification (`classification.py`) triggered by
`POST /api/mistakes/<id>/classify/`, not on every mistake write (keeps the
hot path cheap; classification only runs when something actually reads it).
Once `classified_at` is set it's never reclassified.

## 5. Consumers

- **`apps.study_plan.services`** — skips topics already mastered
  (`SubjectMastery`/`TopicMastery`, `MASTERED_SCORE_THRESHOLD`) and biases
  candidate selection toward a student's dominant classified error category.
- **`apps.mock_exams` Exam Autopsy** (`GET /attempts/<id>/autopsy/`) —
  correlates a completed attempt's wrong answers to `MistakeEntry`
  classification and current `SubjectMastery`. Pure read/correlation, no
  new AI calls.

## Adding a new engine

1. Read, don't recompute — call `get_learner_context()` for profile data,
   query `apps.knowledge` for mastery, `apps.mistakes` for error history.
   Don't re-derive any of those from raw event/answer rows.
2. If your engine needs a discrete event type the domain apps' own tables
   don't capture, add a `LearningEventType` choice and call `record_event`
   at the point it happens — don't invent a parallel log.
3. Own your own output. A Study Planner, Exam Engine, or Confidence Engine
   writes to its own model, not back into `apps.profiles` or
   `apps.knowledge`.
