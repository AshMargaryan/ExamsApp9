# Haygit — Design System & UX Record

Living document for the autonomous design agent. Each session appends its
diagnosis, decisions, and remaining debt so design decisions are made once and
then propagated, never re-litigated.

- **Branch**: `agent/redesign` (never pushed, never merged to master)
- **Isolated stack**: frontend `:3003`, backend `:8003`, Postgres `:5436`
- **Primary language**: Armenian. Never replace Armenian copy with English
  placeholders, and never solve an Armenian layout problem by shrinking type.

---

## Session 1 — Foundations + Dashboard

### What was already good

This codebase is not a greenfield mess, and the diagnosis below should be read
in that light. Before this session it already had:

- A real semantic token layer in `src/theme.css` (`--color-*`, `--space-*`,
  `--text-*`) wired into Tailwind v4 via `@theme inline`, with a genuine
  three-state theme setup (`:root` default, `[data-theme]` override, and a
  `prefers-color-scheme` fallback).
- **Noto Sans Armenian** as the body face — a correct choice with full glyph
  coverage that renders Armenian well at every size tested.
- A ~30-component UI kit in `src/components/ui/`, including well-built
  `Skeleton` / `LoadingRegion`, `ErrorState`, and `EmptyState` primitives with
  thoughtful doc comments.
- Route-level `React.lazy()` splitting for all ~45 protected pages, memoized
  context values, and a documented motion layer honouring
  `prefers-reduced-motion`.

The core problem was therefore **not an absent design system — it was an
unadopted one.** The highest-traffic surface in the product, the dashboard,
predates the kit and uses almost none of it.

### Diagnosis, ranked by impact ÷ complexity

#### P1.1 — The dashboard answers "what should I study next?" five times

The single most damaging problem found. On one screen the student is offered
five separate modules that all attempt to answer the same question:

| # | Module | Destination |
|---|---|---|
| 1 | Greeting subtext (`greetingSubtext()`) | — (text only) |
| 2 | `TodayMissionHero` — gradient hero + CTA | `missionHrefOrFallback(mission)` |
| 3 | `DailyProblemCard` — an inline question | daily problem |
| 4 | `HaygitInsightCard` — "Haygit-ը նկատեց" + CTA | `missionHref(mission)` |
| 5 | "Առաջարկվող վարժություններ" — 5 cards | practice subtopics |

Modules **2 and 4 resolve to the same mission and the same destination**, with
two different CTA labels (`Վերանայել սխալները` vs `Սկսել →`) and two entirely
different visual treatments, roughly 400px apart.

Worse, module 1 renders `insight.coach.situation ?? insight.next_mission.reason`
— which is *the same sentence* that then appears inside module 2 and again
inside module 4. On the live account the string
`«Անհավասարումներ» թեմայում ունեք 1 սխալ պատասխան փորձնական քննություններում`
was rendered **three times on a single screen**.

The result is that a surface whose entire job is to make one decision easy
instead presents five candidate decisions, two of which are secretly identical.
Per the mandate's §34, this means the dashboard effectively answers "what should
I do next?" *zero* times.

#### P1.2 — Dashboard has no error state, and can hang on "Բեռնվում է..." forever

`HomePage` fires five unguarded promises:

```
profileApi.fetchProfile().then(setProfile);
streaksApi.fetchStreak().then(setStreak);
getRecommendedExercises().then(setRecommended);
getWeeklyProgress().then(setWeeklyProgress);
profileApi.fetchHomeInsight().then(setInsight);
```

No `.catch`, no cleanup on unmount, no `AbortController`. The whole page is
gated on `!profile ? "Բեռնվում է..." : …`, so **any** failure of the profile
call — offline, 500, expired token mid-flight — leaves the student staring at a
line of muted text permanently, with no error, no explanation, and no retry.
This is a genuine defect, not merely a visual one, and it is invisible in the
happy path. `ErrorState` (with a retry affordance) already existed in the kit
and was simply never wired up here.

#### P1.3 — Loading is bare text where the kit provides skeletons

`Բեռնվում է...` appears as raw muted text in four places on the dashboard, plus
inside `TodayMissionHero`. The entire page collapses to a single text line while
loading, then reflows into ~2500px of content — a large layout shift and no
sense of what is arriving. `Skeleton`, `SkeletonCard`, `SkeletonRows` and the
accessible `LoadingRegion` wrapper all already existed, unused here.

#### P1.4 — The exam countdown is rendered twice

`190 օր մինչև քննությունը · February 25` appears as a stat pill near the top,
and again ~1200px lower as a dedicated `ExamCountdown` card
(`190 օր մնացել է` / `February 25, 2027`). Same fact, same screen, twice.

#### P2.1 — No radius scale; eight competing radii

Measured across `src/**/*.tsx`:

```
372  rounded-full          301  rounded-md            301  rounded-[var(--radius)]
 41  rounded-2xl            27  rounded-xl             22  rounded-lg
  8  rounded-[calc(var(--radius)*1.15)]                 8  rounded-3xl
  +  rounded-[18px], rounded-[10px], rounded-t-[24px], rounded-t-[22px]
```

`rounded-md` (0.375rem) and `rounded-[var(--radius)]` (0.75rem) are used almost
exactly as often as each other, for the same kinds of element. There was one
radius token where a scale was needed, so every component invented its own.

#### P2.2 — Focus is undefined for most interactive elements

Only **41 of 321** `.tsx` files declare any focus style, across **561**
`<button>`/`<Link>` sites. Two competing idioms coexist (`focus-visible:ring-2
ring-primary` in 63 places, `focus-visible:outline-2 outline-primary` in 21),
and `focus-visible:outline-none` appears 57 times — sometimes without a
replacement. Keyboard users cannot reliably see where they are. (§29, §50)

#### P2.3 — Colour carries no meaning on the dashboard

The six quick-action tiles use four different accent hues (primary, accent,
purple, pink) assigned in source order, not by meaning. The mission hero is a
full-bleed saturated magenta→purple gradient carrying dense Armenian body copy
at ~13px — the mandate's §15 explicitly warns against saturated backgrounds
behind dense text, and it is the loudest object on a page where it competes
with, rather than wins over, four other CTAs.

#### P2.4 — No section rhythm, and section headings barely outrank body text

Eight consecutive top-level blocks are separated by an identical `mt-6`, with no
grouping and no visual pause between "what to do now" and "how I've been doing".
Section headings are `text-lg` (1.125rem) against `text-base` body — a 12%
step, which is not enough to read as a level change. (§11, §43)

#### P2.5 — Mixed icon languages

`lucide-react` icons (consistent, 1.75 stroke) coexist with emoji used as UI
iconography: `🎯` in the exam countdown, `🤖` in the insight card, `📅`/`🔥` in
places. Emoji render with per-platform colour and weight and break the otherwise
disciplined monochrome icon language. (§45)

#### P2.6 — Charts that report rather than help

The weekly progress chart plots 8 weeks in which this account has a single
non-zero bar, inside a large bordered card — a lot of real estate to communicate
"almost nothing happened". Beneath it, `16.7% Ճշգրտություն` is presented cold,
with no context, comparison, or path to improvement. That is a discouraging
number delivered without help. (§38, and §7's emotional axis)

### What changed this session

#### Tokens — `src/theme.css`

Extended the existing token layer rather than replacing it, so nothing already
consuming `--radius`, `--space-*`, `--text-*` or the colour tokens breaks.

- **Radius scale**: `--radius-xs/sm/md/lg/xl/2xl/full`. `--radius` is retained
  as an alias of `--radius-lg`, so all 301 existing `rounded-[var(--radius)]`
  call sites keep their exact current rendering.
- **Type scale**: every `--text-*` step gained a matching `--leading-*` tuned
  for Armenian. Noto Sans Armenian has a tall x-height and frequent
  descenders (ղ, ը, պ, ց, ջ), so display sizes get looser leading than a Latin
  scale would use (1.25 rather than 1.1) to keep accents off the line above.
  Added `--tracking-tight/normal/wide` and `--measure-*` max line lengths.
- **Semantic state colours**: `--color-success`, `--color-warning`,
  `--color-info` and their `-bg`/`-line` variants, in all three theme blocks.
  Previously only `correct`/`incorrect` existed, so anything that was a warning
  or neutral notice had to borrow a colour that already meant "wrong answer".
- **Elevation**: `--color-surface-raised` plus `--shadow-xs`, so "card on a
  card" has a real token instead of a one-off `color-mix`.
- **Focus**: `--focus-ring-width`, `--focus-ring-color`, `--focus-ring-offset`,
  and a single global `:focus-visible` rule so every interactive element has a
  visible focus indicator by default — the app no longer depends on 561
  call sites each remembering to add one. The rule is written with `:where()`
  (zero specificity) so it is a floor any component can override, and with
  **outline longhands rather than the `outline:` shorthand**: one failed
  `var()` substitution makes a whole shorthand declaration invalid at
  computed-value time, which silently drops `outline-color` back to its
  initial `currentColor` — a white ring on a primary-filled button. That was
  observed and fixed during verification.
- **Rhythm**: `--section-gap` / `--section-gap-lg` for spacing *between*
  sections, distinct from `--space-*` for spacing *within* them.

**Theming bug fixed while mapping the tokens.** The bare `:root` block held the
*dark* palette, but `applyStoredTheme()` only stamps `data-theme` when
localStorage already contains a choice. A first-time visitor whose OS prefers
light therefore matched neither `[data-theme]` block nor the
`prefers-color-scheme: dark` media query and fell through to `:root` — landing
on a dark background that contradicted their OS preference, and carrying that
block's light-mode `--color-correct-bg` (a pale mint) on top of it. `:root` is
now the light palette, which makes the CSS agree with `getInitialTheme()`'s own
"no stored value → follow the OS" rule; the existing media query supplies dark.

#### New shared components

- **`ui/Section.tsx`** — one section wrapper carrying the heading level, optional
  description and optional trailing action, plus consistent vertical rhythm.
  Replaces hand-rolled `<section className="mt-6"><h2 className="mb-3 text-lg…">`
  blocks so section spacing and heading hierarchy are defined once. (§58)

#### Dashboard — `pages/HomePage.tsx`

Restructured around a single decision, in four zones of descending priority:

1. **Now** — one mission card. The coach's reasoning is merged *into* it as the
   "why" rather than repeated in a second card below, and the mission reason is
   no longer also printed as greeting subtext. One recommendation, stated once.
2. **Warm-up** — the daily problem, which is a genuinely different activity
   (one question, ~1 minute) rather than a competing version of the same one.
3. **Alternatives** — recommended exercises, for the student who rejects the
   suggestion. Framed as a browse path, not a fifth demand for attention.
4. **Progress** — retrospective, lowest priority, moved below the fold by design.

Specific changes:

- `HaygitInsightCard` **removed from the dashboard** (kept in the codebase — it
  is still the primary content of `StudyPlanPage`, where it does not compete).
  This resolves the duplicate-CTA problem at its root.
- Greeting subtext no longer echoes the mission reason shown in the hero.
- Duplicate `ExamCountdown` card removed; the countdown now lives only in the
  stat strip, and the date-setting affordance appears only when no date is set.
- All five fetches now have error handling with a **retry** action, are
  cancelled on unmount, and degrade **per-region**: a failed streak call no
  longer blanks the entire page.
- Loading now renders skeletons matching the final layout, wrapped in
  `LoadingRegion` so assistive tech is told the region is busy.
- Hero de-saturated: surface background with a primary accent edge instead of a
  full-bleed magenta gradient, so body copy sits on a calm ground and the CTA is
  the brightest thing in the card rather than competing with its own backdrop.
- Quick actions hidden at `lg` and above, where all six destinations already
  exist in the persistent navigation rail; retained below `lg`, where there is
  no rail. Recoloured to a single neutral treatment — the tiles are peers, and
  four hues implied a categorisation that does not exist.
- Emoji iconography replaced with `lucide-react` equivalents.
- Recommendation cards had inverted hierarchy: a three-line grey
  subject/domain/topic breadcrumb sat *above* the subtopic name, so the
  metadata dominated the card and the thing being chosen came second. The
  subtopic name now leads and the breadcrumb is a single clamped line beneath.
- Recommendations capped at 3 with a "Բոլորը" action to the full list; the
  endpoint returns 5, which left the three-column grid with a ragged 3+2 row.

#### Also fixed (found while verifying, same defect class)

- **`DailyProblemCard`** carried HomePage's bug in a sharper form: its `catch`
  was `setProblem(null)` — the same value as "still loading" — so a failed
  fetch rendered a card reading `Բեռնվում է...` permanently. Failure is now
  tracked separately from absence, with a scoped `ErrorState`, a retry, and
  unmount cancellation. It and `TodayMissionHero` now render layout-shaped
  skeletons instead of bare muted text.
- **`HeaderStrip` clipped the account menu on every page at 375px.** It
  reserved a fixed `pl-36` (144px) to clear the two fixed overlays it sits
  behind, leaving 223px for a right-hand cluster needing 222px *plus* the
  logo — so the avatar/account button overflowed the viewport by ~19px. The
  narrowest breakpoint now uses `pl-32` (128px, the tightest value that still
  clears those overlays) and drops the standalone logo link below `sm`. Home
  remains reachable on mobile via the drawer's "Գլխավոր" item, opened by the
  hamburger immediately to its left.

### Verified live

At `http://localhost:3003`, logged in as a seeded student with real history
(49 practice + mock attempts).

- **Breakpoints**: 375, 390, 768, 1024, 1280, 1440. No horizontal overflow at
  any width (`scrollWidth === clientWidth` asserted at 375 and 390).
- **States**: populated; full-page loading skeleton; scoped per-region error;
  retry recovering to populated; empty recommendations. Loading and error were
  produced by patching `XMLHttpRequest` in the page to delay or fail specific
  endpoints, which also confirmed the key property of the restructure — with
  only `/practice/dashboard/*` failing, the mission and daily problem still
  render normally and just those two regions show their own error and retry,
  rather than the whole page going down.
- **Themes**: light and dark both checked.
- **Keyboard**: tabbing to the mission CTA paints the new focus ring at the
  correct width and offset. Note that `getComputedStyle().outlineColor` is
  unreliable for verifying this — `transition-colors` includes `outline-color`,
  and the property reported `currentColor` even for an `!important` literal,
  so confirm focus rings visually rather than by computed style.

Dashboard height at 1280px went from ~2545px to ~2200px, with the duplicated
recommendation and duplicated countdown removed rather than merely compacted.

### Remaining design debt

Carried forward for the next session, roughly in priority order:

1. **Radius migration is not complete.** The scale now exists and the dashboard
   uses it, but ~370 `rounded-md` / `rounded-2xl` / `rounded-xl` call sites
   elsewhere still bypass it. Migrate opportunistically per surface rather than
   in one sweeping commit.
2. **Practice and mock-exam surfaces are untouched** — next in priority order
   (§64). The exam runner especially needs the focused, low-distraction
   treatment described in §36.
3. **`WeeklyProgressChart` is a hand-rolled flexbox bar chart** while
   `ui/Chart.tsx` exists and explicitly documents itself as the replacement.
   Consolidate.
4. **No cross-page data cache.** Every navigation refetches from scratch; the
   dashboard alone makes five parallel calls on every mount. Flagged in
   `CLAUDE.md` as a deliberate repo-wide decision — worth revisiting, but not a
   unilateral design change.
5. **Emoji-as-icon persists outside the dashboard** (settings, chat, help).
6. **`greetingSubtext()` still has a motivational-fallback branch** that fires
   when no real insight exists. It is grounded in real data today; keep it that
   way.
7. **`ui/SectionHeader` is now redundant with `ui/Section`.** Both exist; the
   former has no description, spacing or heading-level control. Migrate its
   call sites to `Section` and delete it, rather than leaving two ways to open
   a section.
8. **`16.7% Ճշգրտություն` is still presented cold.** A low accuracy figure with
   no comparison, no context and no path to improvement is discouraging rather
   than informative. Fixing it properly is a product question (compare against
   what — the student's own past, a target, peers?), so it is deliberately left
   rather than papered over.
9. **The weekly chart still plots eight weeks to show one bar** for a typical
   account. It occupies a large card to report "almost nothing happened".
   Consider a smaller default, or a range that adapts to available data.

### Starting point for session 2

Take **Practice** (`PracticeSubjectsPage` → `PracticeSubjectPage` →
`SubtopicPage` → `TierPage`) as the next surface, applying the tokens and
`Section` primitive established here. Before designing, run the same exercise
that produced this document: log in as the seeded student, walk the flow end to
end, and look specifically for the practice-loop equivalent of the dashboard's
duplicate-recommendation problem — places where the interface asks the student
to make the same decision more than once.
