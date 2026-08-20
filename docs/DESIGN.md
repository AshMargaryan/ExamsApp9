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

---

## Session 2 — Identity + the core learning surfaces

Session 1 was scoped to one surface, which was the wrong scope: only the home
page visibly changed. This session establishes a real visual identity and then
works through the §64 priority order, committing each surface as it lands.

**Brief change mid-session.** The restraint bias in §55/§75 was explicitly
overridden by the user: Haygit should look like a deliberate, distinctive
education product rather than a tidied-up version of generic Tailwind. What
did *not* change, and still binds: no functional regressions, Armenian copy
and Armenian typographic quality untouchable, accessibility (contrast, focus,
never colour-alone, reduced motion) intact, no heavy dependencies. Restraint in
*execution* still applies — the identity should be strong, the interface still
calm enough to study in for three hours.

### The identity

**Colour — Armenian manuscript ink.** The old palette was Tailwind's defaults
verbatim: violet-600 on gray-200 borders over gray-900 text. Two structural
problems, not just taste:

1. `--color-bg` and `--color-surface` were **both `#ffffff`**. A card had no
   ground to sit on and was defined solely by a 1px hairline — the main reason
   the light theme read as flat and cheap.
2. Every neutral was blue-cast slate, so the whole UI sat in one cold corner
   of the wheel with no warmth anywhere.

Now: a deep lapis indigo primary (`#2d3f8f`) — the colour of study rather than
of a startup landing page — answered by **apricot (ծիրան)** as the accent, the
flag's third band and essentially unused in edtech. Light mode has a warm paper
ground (`#faf8f5`) under white surfaces, so elevation is real. Dark mode carries
the ink's blue (`#12141c`/`#191c26`) instead of flat neutral greys.

The primary **inverts in dark mode**: a `#2d3f8f` fill on near-black does not
read as an action, so dark uses a light indigo fill (`#8098f0`) with dark text,
and `--color-primary-contrast` moves with it. Every `bg-primary` /
`text-primary-contrast` pair follows automatically — there were zero hardcoded
`text-white on bg-primary` sites, which is what made this safe.

Contrast was computed, not eyeballed: primary 9.4:1 on white (AAA), muted text
5.9:1, accent 4.6:1, and both dark-mode directions 6.7:1.

**Typography — serif display over sans body.** Body stays **Noto Sans
Armenian**; Armenian rendering quality is not negotiable for a display
flourish. Display headings take **Noto Serif Armenian**, which `index.html`
already loaded, so it costs no new request and has the same complete Armenian
coverage. Same family, harmonious letterforms, and — the actual point — a
heading now reads as a different *level* rather than as larger body text. The
old ramp had a 12% step between body and "large". The scale opens up at the top
(`--text-xl` 1.25→1.375, `2xl` 1.5→1.75, `3xl` 2→2.25, `4xl` 2.5→3, new `5xl`)
and is unchanged at the bottom where dense UI lives.

Verified with `document.fonts.check('600 36px "Noto Serif Armenian"', 'Պարապել')`
rather than by eye.

**Elevation** is tinted with the ink rather than neutral slate — a warm-paper
theme under cold grey shadows looks dirty rather than lifted.

New tokens: `--color-primary-bg`/`-line`, `--color-accent-bg`/`-line`,
`--font-sans`, `--font-display`, `--text-5xl`. `font-display`/`font-sans` are
registered in `@theme inline` so they are real utilities.

### New shared components

- **`ui/PageHeader`** — back link, eyebrow, title, description, actions. Every
  page hand-rolled this and disagreed on all four parts: three different back
  affordances, `text-3xl` vs `text-2xl` titles, `mt-2 mb-6` vs `mb-8` vs `mb-1`.
  Carries the display face, so adopting it is what makes a page look new.
- **`practice/TierStatus`** — one subtopic's three tiers. Three surfaces
  reported the same fact three different ways. Status is never colour-alone.
- **`mockexam/QuestionNavigator`** — the map of an exam in progress.
- **`mockexam/ExamTimer`** — time remaining with quiet/warning/critical states.
- **`assistant/AssistantSuggestions`** — the §37 tutoring moves as one tap each.
- **`lib/scrollToElement`** — see the scroll finding below.

### Surfaces taken through the loop

**Practice** (`redesign: rebuild the practice loop around the question`)

The navigator was a fixed, full-viewport radial constellation. It photographed
well and failed as an interface. `position:fixed; inset:0; overflow:hidden`
with nodes on a radius meant that at 375×812 the ring did not fit and nodes
below the fold were **clipped away with no scroll — a topic could be literally
unreachable on a phone**. Names were set in Space Grotesk / JetBrains Mono,
neither of which has Armenian glyphs (the font tag's own comment admitted
Armenian "falls back to system-ui per-glyph"), inside fixed-diameter circles,
so six of eight labels broke mid-word into orphans: "Հանրահաշի / վ",
"Հավասարում / ներ". The layout centred on `window.innerWidth` while the 256px
rail covered the left edge, so it sat 128px off-centre. It painted a hard-coded
`#06070b` over any theme.

Replaced by a navigator that scrolls, uses the type system, shows progress
beside every choice, and reveals subtopics inline — removing a whole navigation
from the path to a question. `?domain=&topic=` URL contract preserved exactly,
so assignment deep-links and back/forward are unchanged.

The **solving screen** carried the loop's version of the dashboard's duplicate
decision: two identically weighted `bg-primary` buttons, `Ստուգել` and
`Հաջորդը →`, where `Հաջորդը` did not advance to a next question at all — it
silently submitted the whole set and scored it. Now one primary action whose
label says what it does; submitting with blanks asks first; answers autosave
per subtopic+tier so an interruption does not discard work.

**Mock exams** (`redesign: make the mock exam runner a real exam interface`)

The worst affordance defect found: **two buttons on the same screen both
labelled `Ավարտել`** — one saved a draft, the other irreversibly ended a timed
exam. Renamed the save action; only finish is primary.

Question navigation, answered/unanswered state and flagged questions — all
three required by §36 — did not exist. A 65-question exam was one flat scroll
whose only progress signal was a line of text at the very bottom. All three now
exist. The timer was `text-lg font-semibold`, identical at sixty minutes and
thirty seconds; it now has quiet / 5-minute / 1-minute states.

Two interruption defects (§40): a student returning to an expired attempt had
it auto-submitted the instant the page mounted, landing on 0/20 with no
explanation — arriving late now explains and offers the result; and exiting a
live exam explained itself only through a `title` tooltip, which touch devices
never show.

**AI assistant** (`ux: make the AI assistant behave like a tutor, not a chat box`)

Structurally sound but a generic chat clone, which §37 explicitly forbids. None
of "give me a hint / explain differently / similar problem / test me" existed;
each required the student to compose the request themselves, in Armenian, while
stuck. All four are now one tap under the latest finished answer. A new
conversation offered an empty box under "Ինչի՞ մասին խոսենք այսօր" — the least
helpful possible prompt for someone who does not know how to ask — and now
offers four concrete openings.

**Flashcards** (`redesign: surface what is actually due in flashcards`)

"How much is due right now, and where" was answerable only by reading a badge
inside each of seventeen deck buttons and summing. Now stated at the top (the
seeded account: 84 cards across 17 decks), and each deck's action names its own
count. The page also defined a **local `EmptyState` shadowing the kit component
of the same name**, plus its own skeleton and six pill-button variants, and used
the trap-less `ConfirmModal` to confirm deleting a deck and all its cards.

### Findings worth keeping

**`behavior: "smooth"` cannot be relied on.** While verifying the exam
navigator, `window.scrollTo({top: 5000, behavior: "smooth"})` left `scrollY` at
**0**, while the identical call with `behavior: "auto"` moved to 5000 — and
`prefers-reduced-motion` was *false*. So the exam's jump-to-question did nothing
at all. `lib/scrollToElement` now requests the animated scroll, verifies it
moved, and applies it instantly if the browser ignored it. Any new scripted
scroll should go through it rather than calling `scrollIntoView` directly.

**Adoption, not absence, is the recurring problem.** `useAsyncResource` existed
from session 1 and was used in exactly **one** file while **45** files still
rendered bare `Բեռնվում է...`, most with the same unguarded-promise defect that
leaves a page loading forever on any failure. The same story holds for the UI
kit. Each surface's real work is adoption plus the one or two genuine UX
problems underneath.

**Screenshot capture fails past a few thousand pixels of scroll** on very tall
pages (the 65-question exam is ~30,000px). Verify deep-scroll state with DOM
assertions — `getBoundingClientRect`, `elementFromPoint` — not screenshots.

### Remaining debt (carried forward)

Session 1's list still stands except items 2 (practice — done) and 5 (emoji —
partly done). Added:

1. **The floating tools dock and chat launcher overlap page content** at the
   bottom corners on every page, including interactive controls (they cover
   exam navigator chips at 375px). This is app-shell furniture and needs a
   layout answer, not a per-page one.
2. **`SubtopicPage`'s lesson stepper renders 7+ long Armenian pills** that wrap
   to four rows above the content, dominating the page before any material is
   read.
3. **`SubjectsPage` (`/subjects`) is a second, parallel subject picker** — a
   dark full-screen "universe" with hardcoded `#05050a`, Spectral/Work Sans and
   inline styles, reaching the same practice content as `/practice` by a
   different route. Two entry points to one destination, in two visual
   languages. It needs an IA decision, not a restyle.
4. `MockExamHistoryPage`, `MockExamResultsPage`, `MockExamDetailPage`,
   `FlashcardStudyPage`, `FlashcardEditorPage`, `FlashcardDeckManagePage` were
   not taken through the loop this session.

---

## Session 3 — the remaining student surfaces

Recorded after the fact (session 3 was cut short by a session limit before it
could write this up). Commits `90a6ddb` → `16c993e` took the profile, notes,
notifications, rankings, teacher dashboard, parent dashboard and the four
authentication screens through the loop, and extracted `ui/DataCard` (from
`profile/ProfileCard`) with 17 components migrated onto it. Each commit
message carries its own full diagnosis; the reusable findings are:

- **`ui/SectionHeader` is deleted** (session 1 debt item 7). All four of its
  call sites are on `ui/Section`, which gives real h2/h3 levels.
- **`ui/RankBadge`** is now the single rank badge; a copy-pasted
  `{1:"🥇",2:"🥈",3:"🥉"}` map existed in three other places. The number is
  always shown and the metal added to it, never instead of it.
- **A 401 from a credential endpoint is not an expired session.** The axios
  interceptor treated every 401 as "refresh, then bounce to /login", so a
  wrong password caused a full page navigation that destroyed the error the
  login page had just set. The five credential endpoints are now exempt.
- **`ui/Field` / `PasswordField` / `FormAlert`** give forms somewhere to put an
  error that is not a modal or a toast.

---

## Session 4 — Settings, dashboard retrofit, and the final pass

Eleven commits. The through-line is that the identity established in session 2
had been applied to the surfaces session 2 and 3 visited and to nothing else,
so the work here is less "design a page" and more "finish being one product":
one icon language, one product name, one subject picker, one button that does
not break the page, one place settings live.

---

### 1. Settings (`redesign: make Settings the place settings actually live`)

Settings held three controls: a password form and two free-form gradient
mixers, under a line reading "the rest of your account settings are on your
profile page". They genuinely were: privacy in a hand-rolled overlay behind a
profile menu, active devices on their own route reachable from a grey text
link, light/dark only as an unlabelled header icon. The page named after
settings held the two least consequential controls in the product.

It is one page now — **Տեսք / Անվտանգություն / Գաղտնիություն** — with an
anchored section rail (a strip pinned under the top bar below `xl`), so a link
can point at the part it means. `/account/sessions` redirects to
`/settings#devices` and its page is deleted rather than left as a second copy.

Three decisions worth carrying forward:

**1a. Personalisation is an index into a table, not a colour.**

The retired mixers wrote runtime values into `--gradient-primary` and
`--gradient-bg`. The second one is why this became a token change:
`--color-text` and `--color-text-muted` are measured against a *known* paper or
ink ground, and an arbitrary gradient behind them voids that measurement across
the whole product at once. The picker's default was a saturated
blue→purple→pink — dense Armenian body copy on exactly the ground §15 forbids —
and its **reset** button restored the *pre-identity* violet, so the one control
students were pointed at could only take the product backwards.

The replacement is `data-accent` on `<html>` plus six preset blocks in
`theme.css`, each a complete `--color-primary*` set for light *and* dark. The
frontend can no longer invent a colour, so a preset cannot be half-applied to
one theme or land under the contrast floor. Lowest ratio in the table is
6.05:1; verified live in the browser afterwards (forest/dark measured 8.20:1
primary-on-surface, 8.63:1 for its contrast text).

The brand band deliberately does **not** follow the accent — see the note
beside `--gradient-brand`: a branded ground that carries white text is a
different concept from the action colour.

**1b. `system` is a state, not the absence of a choice.**

`useTheme` persisted to localStorage from an effect on every mount, so merely
rendering the header converted an OS-following student into a pinned light or
dark choice they could never get back out of. It is a `useSyncExternalStore`
now — one value, one media listener, consumers cannot disagree — and `system`
is stored as the *removal* of the key, which is also what a first-time visitor
has. One representation for one state.

**1c. Optimistic UI without a rollback is a lie.**

The privacy modal kept the optimistic value after a rejected save, so a switch
read "hidden" while the server said "visible" — the worst class of control to
get silently wrong. Any optimistic control in this codebase should follow
`PrivacySection`: apply, await, replace with the server's answer, and on
failure restore the previous value **and say so**.

---

### 2. Dashboard retrofit (`redesign: bring the dashboard onto the identity it predates`)

Rebuilt in session 1, before the display face and the identity existed, so its
`h1` sat in the body face while the `Section` headings *below* it were serif —
the page's most important line was the least distinctive thing on it.

**The mission hero has now been two wrong things.** It began painting
`--gradient-hero`, a saturated magenta ramp built from the old violet primary,
edge to edge with every string in white at ~13px; session 1 correctly killed
that. But the quiet tinted surface it became was its own failure: the card
carries the single next action the whole page exists to produce, and as a pale
wash it was *less* prominent than the daily-problem card beneath it.

The resolution is that the identity built a ground for exactly this.
`--gradient-brand` is theme-invariant and measured (white 8.3:1–11.7:1, muted
5.1:1), so the hero is branded again on a surface whose contrast is known. The
CTA inverts to a light fill — the `bg-primary` button it replaced sat at 1.6:1
against the band's own indigo, which would have made the page's most important
control the least visible thing in its own card. The checklist's done-state
drops `--color-correct` (≈2.6:1 on the band) and carries done-ness with a
filled icon plus strike-through.

Two long-carried debt items closed here, **one by deciding not to do it**:

- `WeeklyProgressChart` stays a hand-rolled bar strip rather than migrating to
  `ui/Chart`. That is a recharts *line* chart, and a line through eight
  discrete weekly counts implies a continuity that is not there; recharts is a
  ~354KB chunk the dashboard — the highest-traffic route — should not pay to
  draw eight rectangles. What was actually wrong is fixed: `title` attributes
  were the only way to read a bar's numbers, so on a phone the chart carried no
  values at all (it has a real text alternative now), and the incorrect portion
  of each bar was painted with `--color-border`, a structural token doing duty
  as a data colour.
- "`16.7% Ճշգրտություն` presented cold" was left in session 1 because "compare
  against what" is a product question. The weekly series already on the page
  answers it honestly: the student against their own earlier weeks. Weeks with
  no activity are **skipped rather than counted as 0%**, so a break from
  studying does not read as a collapse in ability, and no delta is shown below
  five questions on either side — a trend computed from three answers is noise
  wearing a plus sign.

---

### 3. Information architecture: one subject picker

Stated in the form §65 asks for.

**Problem.** Every "subjects" entry point — sidebar item, mobile tab, the
mission hero's fallback, the study plan's empty-state CTA, the learning
profile's mastery panel — pointed at `/subjects`: a nine-panel scrolling
"universe" on a hardcoded `#05050a` ground that ignored the theme, set in
Spectral and Work Sans, neither of which has Armenian glyphs. It showed no
study information at all, and six of its nine panels had no practice content
behind them — they opened a "coming soon" dialog. The main study destination in
the navigation was two-thirds dead ends, nine screen-heights tall. Meanwhile
`/practice` rendered a second picker, with real progress, that nothing linked
to.

**Proposed and shipped.** `/subjects` and `/practice` render the same picker —
the one with progress, domain and subtopic counts, and average score. The
subject-hub page's other two destinations (that subject's mock exams and
flashcards) move onto the card as secondary links. `/subjects/:subject`
redirects.

**Why better.** Reaching a question went from subjects → hub → navigator →
topic → subtopic to subjects → navigator → topic → subtopic, and the first step
now tells you which subject needs the work.

**Risks and cover.** Assignment deep-link resolution lives in this component
and is untouched; both routes render it. `/subjects/:subject` had no inbound
links beyond the universe and its own back button. The six contentless subjects
are named in one quiet line instead of six clickable dead ends.

Deleted: `SubjectsPage`, `SubjectHubPage`, `OrbitField`, `subjectsUniverse.css`,
`lib/subjectsUniverse.ts`, and `public/subjects-universe/` — 1.2MB of portraits
that were the entire contents of `public/`, copied into every build. All
recoverable from git if the universe is ever wanted on the marketing page,
which is where its visual language belongs.

---

### 4. Product-wide coherence passes

**Armenian is never set in capitals** (`typography: stop setting Armenian in
capitals`). A rule the codebase had discovered twice without generalising.
Armenian capitals are far more uniform in shape than Armenian lowercase, which
is unusually rich in ascenders and descenders (ղ, ը, պ, ց, ջ). Latin small-caps
works because Latin capitals still differ from each other at small sizes;
Armenian ones flatten into a row of similar rectangles, and `text-xs` with
`tracking-wide` flattens them most. All thirty Armenian `uppercase` sites are
gone. Two Latin ones remain deliberately: the game room-code input and the
landing page's "AI Tutor" kicker.

**One product name.** The logo, tab title, auth screens and settings said
*Gitus*; twenty user-facing strings said *Haygit*. `HaygitInsightCard` is
renamed rather than left rendering "Gitus-ը նկատեց". Two pages were also both
titled "Բարի վերադարձ, {name}" — the study plan is titled after itself now.

**One icon language.** `SubjectMeta.icon` held `"∑" | "⚛" | "🧬" | "⚗" | "🇬🇧"` —
two maths symbols that render in the text font, two colour emoji, and a *flag*.
One field fed thirteen call sites across seven surfaces, so it was the
highest-leverage fix available; it is a `LucideIcon` now. Then the shared
chrome: every toast in the product opened with `✅ `/`⚠️ ` *inside* its
`role="status"` region, so a screen reader announced "white heavy check mark"
before the sentence; the generic modals used the same glyphs at `text-4xl`;
plus the hint button, the reading-note callout, the notepad, the tools dock,
both `AttachmentChip` copies, the speech controls, and roughly a dozen `✕`
close buttons — of which **five had no accessible name at all** and three were
labelled "Close" in an Armenian interface.

---

### 5. What the final pass found

**Two routes scrolled sideways at 375px, and one cause was in the shared
button.** `buttonClasses` set `whitespace-nowrap` on a fixed height, so a label
too long for its container widened the button and the button widened the
document. Measured on the study plan: a 468px CTA in a 343px column, giving the
page a 484px scrollWidth. Armenian is where this bites — Armenian labels run
considerably longer than their English equivalents — and clipping is no more
acceptable than shrinking. Buttons wrap now: `min-h` replaces `h`, so every
short label keeps its exact previous height and only an unfittable one takes a
second line. The games page repeated the rankings header defect (an unshrinkable
`h1` beside a fixed-width CTA in `justify-between`) and moved to `PageHeader`.

**The floating launchers were standing on the content.** Two 64px circles
pinned to opposite bottom corners of every authenticated page; because they are
fixed, whatever is beneath them is beneath them permanently — observed covering
the daily problem's submit button at 768px. Both are 52px now (still clear of
the 44px floor), and `AppChrome` reserves 84px below the content, which is the
only place that knows whether the launchers are mounted at all.

**A card whose most button-like object could not be clicked.** `ExamCard` was a
`role="button"` div wrapping a `pointer-events-none` filled Button. It is a
real stretched `<Link>` now, which also restores ⌘-clicking an exam into a new
tab.

**Hover-only actions on the AI assistant.** Copy / edit / listen / regenerate
were `opacity-0 group-hover:opacity-100`. A phone has no hover, so on the
platform most students read answers on, all four were invisible and
unreachable; a keyboard user could tab into an undrawn button. Visible by
default below `sm`, `group-focus-within` added above it.

**The mistake notebook designed away its own ordering.** Topics are sorted
worst-first and then every row got an identical filled button — sixty-nine of
them on a real account. Only the lead row in each subject is primary now. Its
open-mistake count also came in alarm red as the first thing on the page;
`Metric`'s own doc reserves that tone for numbers that *mean* good or bad, and
a workload is neither.

---

### Verified

- **Breakpoints**: 375 / 390 / 768 / 1024 / 1280 / 1440. All eighteen student
  routes assert `scrollWidth === clientWidth` at 375 after the button fix.
  1024 specifically caught the settings rail, which turns on at `xl` rather
  than `lg` because the app's own 200px sidebar is already showing there.
- **Themes**: light, dark, and `system` (which now resolves live), each with a
  non-default accent applied, checked in the browser rather than by inspection.
- **States**: populated, skeleton, per-region error with a working retry
  (a dead `/auth/sessions` costs the device list and nothing else), empty,
  and long-content.
- **Accessibility**: zero unnamed interactive controls on the audited routes;
  focus tokens resolve (2px, 2px offset); the accent radiogroup is one tab stop
  with arrow keys; `ConfirmDialog` traps focus and closes on Escape; reduced
  motion is handled by a global `*` rule so every transition added this session
  collapses automatically.
- **Bundle**, measured by building the pre-session commit against the same
  `node_modules`: main chunk 698.39 kB → 707.07 kB raw, **195.02 → 196.93 kB
  gzip (+1.9 kB)**, CSS +1 kB, minus a 1.12 kB route chunk and minus 1.2 MB of
  public assets. `package.json` is byte-identical to the pre-session commit —
  **no dependency was added**.
- 127 frontend tests pass (up from 124: two `AccountSessionsPage` tests were
  replaced by five covering the settings sections), `tsc -b` clean, production
  build succeeds.

---

### Design system — current state

**Tokens** (`src/theme.css`)

| Group | Tokens |
|---|---|
| Ground | `--color-bg`, `--color-surface`, `--color-surface-muted`, `--color-surface-raised`, `--color-border` |
| Text | `--color-text`, `--color-text-muted` |
| Action | `--color-primary`, `-hover`, `-contrast`, `-bg`, `-line` |
| Accent | `--color-accent`, `-bg`, `-line` |
| Brand band | `--color-brand-1..4`, `--gradient-brand`, `--color-on-brand`, `-muted`, `-fill`, `-line` (theme-**invariant**) |
| State | `--color-correct/-bg`, `--color-incorrect/-bg`, `--color-success`, `--color-warning`, `--color-info` (+ `-bg`) |
| Type | `--text-xs…5xl` with matching `--leading-*`, `--tracking-tight/normal/wide`, `--measure-*`, `--font-sans`, `--font-display` |
| Space | `--space-*`, `--section-gap`, `--section-gap-lg` |
| Radius | `--radius-xs/sm/md/lg/xl/2xl/full` (`--radius` aliases `-lg`) |
| Elevation | `--shadow-xs/sm/md/lg` |
| Focus | `--focus-ring-width/-color/-offset` + a global `:where(...):focus-visible` floor |
| Motion | `--motion-micro/fast/normal/emphasis/celebration`, `--ease-out`, `--ease-spring` |
| Personalisation | `[data-accent]` × 6 presets × 2 themes |

**Shared components and their contracts**

| Component | Use it for |
|---|---|
| `ui/PageHeader` | The top of every page: back link, eyebrow, title (display face), description, actions. Actions wrap under the title, which is what keeps long Armenian titles from breaking the row. |
| `ui/Section` | An `h2`/`h3` section with description, trailing action and vertical rhythm. Level 2 takes the display face. |
| `ui/SectionNav` / `SectionNavBar` | Anchored nav for a long page; rail on wide, strip on narrow. **Pass `offset`** when the nav itself is pinned under the header. |
| `ui/DataCard` | A card of data: lucide icon, title, description, trailing control. Never an emoji. |
| `ui/Card` | A plain bordered surface, when the header is being composed separately. |
| `ui/StatTile` / `ui/Metric` | Bordered vs. unbordered metric. `tone` is semantic: `incorrect` means the number *means* bad, not that it counts bad things. |
| `ui/Field` / `PasswordField` / `FormAlert` | Labelled input with hint, error and `aria-invalid`. Errors land on the field, never in a toast or modal. |
| `ui/Switch`, `Select`, `Tabs`, `Badge`, `ProgressBar`, `RankBadge`, `Skeleton`, `LoadingRegion`, `ErrorState`, `EmptyState`, `ConfirmDialog`, `Modal` | The rest of the kit. `EmptyState.icon` takes a node — pass a lucide element. |
| `hooks/useAsyncResource` | One async read with all four states and a retry. Replaces `.then(setX)`. |
| `hooks/useTheme` | `{ theme, preference, setPreference, toggleTheme }` over a shared store. |
| `lib/accentTheme` | `ACCENTS`, `getStoredAccent`, `saveAccent`, `applyStoredAccent`. |
| `lib/subjects` | `SUBJECTS` with a `LucideIcon`, `subjectMeta`, `subjectMetaForName`, `subjectIconForName`, `localizeSubjectName`. |
| `lib/scrollToElement` | Any scripted scroll. Never call `scrollIntoView` directly. |

**Rules that now have precedent**

1. Armenian is never set in `uppercase`.
2. Icons are lucide. Emoji appear only where the emoji *is* the content.
3. A page title uses `PageHeader` and the display face.
4. Optimistic writes roll back and say so.
5. `tone`/`--color-incorrect` is reserved for things that mean wrong, not for
   things that count wrong answers.
6. Anything painted on `--gradient-brand` uses `--color-on-brand*`.
7. Status is never colour alone — pair it with an icon, a label, or a position.
8. A control's accessible name is written in Armenian, and is never a glyph.

---

### Remaining design debt

Ordered by value ÷ risk.

1. **The long tail of emoji in unvisited surfaces.** The shared chrome is
   clean; `FlashcardStudyPage`, `GameplayPage`/`ResultsPage`, the todo pages,
   `UserProfilePage` and `notes/canvas/CanvasEditor` still use emoji as
   iconography. Fix them *as part of* taking each surface through the loop, not
   as a sweep — chasing glyphs without the UX pass is the cosmetics-first order
   §63 warns about.
2. **Surfaces never taken through the loop**: flashcard study / editor / deck
   management, mock-exam results and history, the games and multiplayer flow,
   `/todo/*`, help centre articles and tickets, `UserProfilePage`,
   `AssignmentReviewPage`, `/subscription`, `/verify-email`.
3. **`ReloadButton` is rendered on the wrong platform.** `AppChrome` mounts it
   only on the **web**, where the browser already provides reload, and not in
   the native shell, where there is no browser chrome and it would earn its
   place. Removing it from the web takes a fourth permanent overlay off every
   page. This is a product call, not a design one.
4. **`SubtopicPage`'s lesson stepper** renders 7+ long Armenian pills wrapping
   to four rows above the content (carried from session 2).
5. **Radius migration is incomplete.** The scale exists; several hundred
   `rounded-md` / `rounded-xl` / `rounded-2xl` call sites still bypass it.
   Migrate opportunistically per surface.
6. **No cross-page data cache.** Every navigation refetches. Flagged in
   `CLAUDE.md` as a deliberate repo-wide decision; worth revisiting, but not a
   unilateral design change.
7. **The weekly chart still plots eight weeks to show one bar** for a typical
   account. The accuracy trend beside it now gives the card a reason to exist,
   but a range that adapts to available data would be better.
8. **`greetingSubtext()` retains a motivational-fallback branch** for when no
   real insight exists. It is grounded in real data today; keep it that way.

### Future opportunities

- **The retired universe belongs on the landing page.** It is genuinely the
  most distinctive thing the codebase has ever contained; it was only in the
  wrong place. `LandingPage` already has its own visual language and its own
  campaign gradient hook.
- **Per-topic difficulty in the mistake notebook.** With a seeded account every
  topic shows the same count, so "worst first" conveys nothing. Real accounts
  differentiate — but a secondary sort (recency, or error category) would make
  the order legible even when counts tie.
- **`ui/Chart` needs a bar variant** before any other surface wants one, or the
  next person will either hand-roll a second bar strip or pull recharts onto a
  page that cannot afford it.
- **A visual-regression harness.** Every finding in this session that mattered
  — the 484px scrollWidth, the 1.6:1 CTA, the invisible mobile actions — was
  found by measuring the DOM, not by reading code. Those measurements are cheap
  to automate and would catch the next one before a human sees it.

### A note on verifying this app

The browser pane used for live checks is frequently `document.hidden`. In that
state **CSS animations never tick and `requestAnimationFrame` never fires**:

1. A Radix dialog that has closed stays mounted and visible, because `Presence`
   waits for an `animationend` that cannot arrive. This looks exactly like
   "Escape does not close the dialog" — check `data-state` before believing it.
2. Anything scheduled with `rAF` silently does not run. The settings
   hash-scroll originally used one and did nothing; `setTimeout` is both more
   robust and testable here.
3. Screenshots after a scripted scroll return stale or blank frames.

Prefer `getBoundingClientRect` / `elementFromPoint` / `getComputedStyle`
assertions, and take screenshots at scroll-0 with a tall viewport.

---

## Session 5 — the surfaces nobody had visited

Session 4 closed out the primary student journey. This session works down
debt item 2 — the list of screens that had never been through the loop — and
handles debt item 1 (emoji-as-iconography) inside each one rather than as a
glyph sweep.

The recurring shape of these surfaces is the same one session 2 named:
**adoption, not absence.** Each had an unguarded `.then(setX)` that leaves the
page loading for ever on any failure, a hand-rolled `animate-pulse` skeleton
beside the kit's `Skeleton`, native `<select>`s, `<label>`s with no `htmlFor`,
and a `MessageModal` or a toast where an inline error belongs. Underneath
that, each had one or two problems that were genuinely about the product.

### Shared components changed

**`ui/Dropdown` had no keyboard.** It portals its menu to `document.body`, so
the menu is the last element in the document regardless of where its trigger
sits — Tab never reaches it. Opening the account menu with the keyboard left
focus on the avatar and the only way in was to tab through the whole page.
Ten call sites, including the one holding "Ելք".

It now follows the WAI-ARIA menu-button pattern: first enabled item focused on
open, Up/Down/Home/End with wrap, Tab dismisses, Escape returns focus to the
trigger. New item fields: `hint` (a line of consequence under the label — a
menu is where a setting's cost should be stated), `checked` + `selection`
(`"radio"` default, `"checkbox"` for a standalone toggle — announcing a lone
on/off as a radio implies a sibling that does not exist), `disabled`, and
`divider`.

**`.math-scroll` now wraps before it scrolls.** KaTeX emits break
opportunities between top-level relations and binary operators; `displayMode`
then sets `white-space: nowrap` over them, and much of the content bank is
authored as `$$…$$`. Measured: a 438px answer inside a 244px option with 194px
behind an invisible scroll. Wrapping breaks it at the `=` signs. The vertical
axis is `hidden` now rather than the `auto` it inherited from `overflow-x`,
which was painting a full-height scrollbar track down the right of every
formula in the product, scrolling nothing.

**`games/GameCountdown`** — per-question countdown with the same three-state
discipline as `mockexam/ExamTimer` at a fifteen-second scale rather than a
sixty-minute one. Fixed size across all three states: the old one grew a font
size at the threshold and reflowed the header in the middle of a question.

**`flashcards/DeckFormModal`** is on `ui/Modal` rather than a hand-rolled
`fixed inset-0` with no focus trap, no Escape and no dialog role.

### Surfaces taken through the loop

**Flashcard study / manage / editor** (`a691460`, `c3f9f2e`)

Study's three permanent settings rows pushed the question to 62% down a
375×812 screen. They are a menu now — and a menu can state that changing the
mode discards the queue, which the pills silently did. Beyond layout: the card
transition gated *all* input on an `animationend` that a backgrounded tab or
an interrupted animation can swallow, stranding the student on a card that
ignored every click (there is a watchdog now, and only the exit half blocks);
the progress bar read 0/7 while showing the result of card one; the finish
screen's only forward action was to repeat all seven cards including the three
already known; and the classic card flipped on a `div` with an `onClick`,
announced as nothing, with both faces permanently in the accessibility tree so
a screen reader read the answer aloud with the question.

Manage printed the card's LaTeX source — the one screen in the product showing
`$\sin 2\alpha$` instead of mathematics — and offered eleven write controls on
a shared library deck where every one of them answers 404, four behind a
confirmation promising something irreversible. It is a card browser for a
library deck now.

The editor never showed what the LaTeX it asks for would look like, so the
only way to check a formula was to save the card and study it. It renders as
you type.

**Games and multiplayer** (`67d0467`, `9bb0778`)

The score — the point of a competitive game — was a grey line at the bottom of
the gameplay page, below the fold on a phone. Leaving a live game was one
click on a text link. The lobby opened with a nine-field configuration form
in which two fields configured a difficulty that can never appear, while
joining with a code sat in a small card beside it and quick match was a header
button. Results carried the fourth copy of the `{1:"🥇"}` medal map, put three
of its six leaderboard columns off the right edge of a phone, and did not mark
the reader's own row.

### Rules added to the precedent list

9. A disabled control says why, near itself, whenever the reason is knowable.
10. A destructive action that affects other people confirms, and the
    confirmation counts them.
11. An error belongs beside the control that produced it — never in a modal
    the student must dismiss to reach the field they need to fix.
12. A `Select` needs a visible label. Its own `label` prop is only an
    accessible name; wrap it in `Field`.
