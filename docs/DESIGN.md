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

### Settings (`redesign: make Settings the place settings actually live`)

The full diagnosis is in the commit message. Three decisions worth carrying:

**1. Personalisation is now an index into a table, not a colour.**

The retired mixers wrote runtime values into `--gradient-primary` and
`--gradient-bg`. The second one is the one that mattered: `--color-text-muted`
is measured at 5.9:1 against a *known* ground, and an arbitrary gradient
behind it voids that measurement across the whole product at once. The
replacement is a `data-accent` attribute on `<html>` and six preset blocks in
`theme.css`, each a complete `--color-primary*` set for light and dark. The
frontend can no longer invent a colour, so a preset cannot be half-applied to
one theme or land outside the contrast floor (lowest in the table: 6.05:1).

The brand band does **not** follow the accent, consistent with the note beside
`--gradient-brand`: a branded ground that carries white text is a different
concept from the action colour.

**2. `system` is a state, not the absence of a choice.**

`useTheme` used to persist to localStorage from an effect on every mount, so
rendering the header once converted an OS-following student into a pinned
light/dark choice with no way back. It is a `useSyncExternalStore` now — one
value, one media listener, consumers cannot disagree — and `system` is stored
as the removal of the key, matching what a first-time visitor has.

**3. Optimistic UI needs a rollback or it is a lie.**

The privacy modal kept the optimistic value after a rejected save, so a switch
read "hidden" while the server said "visible". Any optimistic control in this
codebase should follow `PrivacySection`: apply, await, replace with the
server's answer, and on failure restore the previous value *and say so*.

### New / changed shared components

- **`components/settings/{AppearanceSection,SecuritySection,PrivacySection}`** —
  content components; the page composes them with `Section` + `Card`.
- **`lib/accentTheme.ts`** — `ACCENTS`, `getStoredAccent`, `saveAccent`,
  `applyStoredAccent` (which also clears the two retired gradient keys, so a
  student who saved a magenta ground is not left on it).
- **`ui/SectionNav` / `SectionNavBar` gained `offset`** — a nav pinned under a
  fixed header was scrolling headings to underneath itself.

### Verification note for future sessions

The browser pane used for live checks is frequently `document.hidden`. In that
state **CSS animations never tick and `requestAnimationFrame` never fires**.
Two consequences:

1. A Radix dialog that has closed stays mounted and visible, because
   `Presence` is waiting for an `animationend` that cannot arrive. This looks
   exactly like "Escape does not close the dialog" and is not a product bug —
   check `data-state` before believing it.
2. Anything scheduled with `rAF` silently does not run. The settings
   hash-scroll originally used one and did nothing; it uses `setTimeout` now,
   which is both more robust and testable here.

Screenshots are also unreliable after a scripted scroll — prefer
`getBoundingClientRect` / `elementFromPoint` assertions.
