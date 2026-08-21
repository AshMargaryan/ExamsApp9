# Gitus — Design System & UX Record

The reference for anyone doing design or frontend work on this product. It
exists so that decisions are made once and then propagated, never
re-litigated. If you are about to change something described here, read the
reasoning first — most of these entries record a defect that was measured, not
a preference that was expressed.

- **Branch**: `agent/redesign` (never pushed, never merged to master)
- **Isolated stack**: frontend `:3003`, backend `:8003`, Postgres `:5436`
- **Primary language**: Armenian. Never replace Armenian copy with English
  placeholders, and never solve an Armenian layout problem by shrinking type.

The landing page (`components/landing/**`, `pages/LandingPage.tsx`) is owned
separately and is out of scope for everything below.

---

## 1. Principles

These are the rules with precedent behind them. Each one was added because
something broke.

1. **Armenian is never set in `uppercase`.** Armenian capitals are far more
   uniform in shape than its lower case, which is unusually rich in ascenders
   and descenders (ղ, ը, պ, ց, ջ). Latin small-caps works because Latin
   capitals still differ from each other at small sizes; Armenian ones flatten
   into a row of similar rectangles, and `text-xs` with `tracking-wide`
   flattens them most. Two Latin exceptions remain deliberately: the game
   room-code input and the landing page's "AI Tutor" kicker.
2. **Icons are lucide.** Emoji and text glyphs (`⋮`, `⧉`, `✕`, `✓`, `→`)
   appear only where the glyph *is* the content — for example the shareable
   profile card, whose emoji are copied to the clipboard and pasted into a
   chat.
3. **A page title uses `PageHeader` and the display face.**
4. **Optimistic writes roll back and say so.** Applying a value, awaiting the
   server, and replacing it with the server's answer — and on failure
   restoring the previous value *and* reporting it. `PrivacySection` is the
   reference. A control that lies about its state is the worst kind to get
   wrong.
5. **`--color-incorrect` is reserved for things that mean wrong**, not for
   things that *count* wrong answers. A workload is neither good nor bad.
6. **Anything painted on `--gradient-brand` uses `--color-on-brand*`**, never
   `--color-text`, which flips with the theme.
7. **Status is never colour alone.** Pair it with an icon, a label or a
   position. This applies most sharply to answer feedback — see §5.
8. **A control's accessible name is written in Armenian, and is never a
   glyph.** A `title` attribute is not a name on touch devices, which never
   display it.
9. **A disabled control says why**, near itself, whenever the reason is
   knowable.
10. **A destructive action that affects other people confirms**, and the
    confirmation counts them.
11. **An error belongs beside the control that produced it** — never in a
    modal the student must dismiss to reach the field they need to fix.
12. **A `Select` needs a visible label.** Its own `label` prop is only an
    accessible name; wrap it in `Field`.
13. **The student is addressed as "դու"; teachers and parents as "Դուք".**
    See §4.
14. **A failed read is not an empty read.** `null` must not mean both "still
    loading" and "failed" — that is how a page ends up showing skeletons for
    ever. Use `useAsyncResource`.
15. **Touch targets are 44px**, or as close as the row allows; where the
    layout genuinely has no room, `.tap-target` grows the target without
    growing the control.

---

## 2. Tokens (`src/theme.css`)

| Group | Tokens |
|---|---|
| Ground | `--color-bg`, `--color-surface`, `--color-surface-muted`, `--color-surface-raised`, `--color-border` |
| Text | `--color-text`, `--color-text-muted` |
| Action | `--color-primary`, `-hover`, `-contrast`, `-bg`, `-line` |
| Accent | `--color-accent`, `-bg`, `-line` |
| Brand band | `--color-brand-1..4`, `--gradient-brand`, `--color-on-brand`, `-muted`, `-fill`, `-line` (theme-**invariant**) |
| Paper | `--color-paper`, `--color-paper-line` (theme-**invariant**; the canvas note's ground) |
| State | `--color-correct/-bg`, `--color-incorrect/-bg`, `--color-success/-bg`, `--color-warning/-bg`, `--color-info/-bg` |
| Difficulty | `--color-easy`, `--color-medium/-bg`, `--color-hard` |
| Rank tiers | `--color-gold/-bg/-line`, `--color-silver/…`, `--color-bronze/…` |
| Decorative | `--color-purple`, `--color-pink` (gradient stops only) |
| Type | `--text-2xs…5xl` with matching `--leading-*`, `--tracking-tight/normal/wide`, `--measure-*`, `--font-sans`, `--font-display`. `--text-2xs` (10px) is for **tick labels only** — numerals and short abbreviations, never Armenian prose. |
| Space | `--space-*`, `--section-gap`, `--section-gap-lg` |
| Radius | `--radius-xs/sm/md/lg/xl/2xl/full` (`--radius` aliases `-lg`). Roles: `md` inputs, list rows, menu cells, thumbnails, small icon buttons; `lg` cards, panels, popovers, dialogs, buttons; `xl` chat bubbles and the native shell, which sits one step up the same scale. `rounded-full` stays a Tailwind utility on purpose — a circle carries no decision to centralise. |
| Elevation | `--shadow-xs/sm/md/lg` |
| Focus | `--focus-ring-width/-color/-offset` + a global `:where(...):focus-visible` floor |
| Motion | `--motion-micro/fast/normal/emphasis/celebration`, `--ease-out`, `--ease-spring` |
| Personalisation | `[data-accent]` × 6 presets × 2 themes |

### The identity

**Colour — Armenian manuscript ink.** A deep lapis indigo primary (`#2d3f8f`)
— the colour of study rather than of a startup landing page — answered by
**apricot (ծիրան)**, the flag's third band, essentially unused in edtech.
Light mode has a warm paper ground (`#faf8f5`) under white surfaces, so
elevation is real; before this, `--color-bg` and `--color-surface` were *both*
`#ffffff` and a card was defined solely by a 1px hairline, which is why the
light theme read as flat. Dark mode carries the ink's blue (`#12141c` /
`#191c26`) rather than neutral grey, and the primary **inverts** to a light
indigo (`#8098f0`) with dark text, because a `#2d3f8f` fill on near-black does
not read as an action. Elevation is tinted with the ink: a warm-paper theme
under cold grey shadows looks dirty rather than lifted.

**Typography — serif display over sans body.** Body is **Noto Sans Armenian**;
Armenian rendering quality is not negotiable for a display flourish. Headings
take **Noto Serif Armenian**, already loaded by `index.html`, so it costs no
new request and has the same complete coverage. The point is that a heading
now reads as a different *level* rather than as larger body text — the old
ramp had a 12% step between body and "large". The scale opens up at the top
and is unchanged at the bottom where dense UI lives. Every `--text-*` step has
a matching `--leading-*` tuned for Armenian: display sizes get looser leading
than a Latin scale would use (1.25 rather than 1.1) to keep accents off the
line above.

Verify font loading with `document.fonts.check('600 36px "Noto Serif
Armenian"', 'Պարապել')`, not by eye.

### Three rules about the colour tokens

**a. A state ink must clear 4.5:1 on *two* grounds.** `text-correct` and
`text-incorrect` alone appear on ~180 call sites. They are text colours before
they are anything else, so they must pass against `--color-surface` **and**
against their own `-bg` tint. The tint is always the tighter of the two, which
is why an earlier check against the surface alone missed that
`--color-correct` was 3.41:1 on white and 3.06:1 on its own mint, and
`--color-medium` 2.47:1. The light-mode values are now the *minimum* darkening
that clears 4.5:1 on both, with hue and saturation held exactly. Dark mode was
measured at 5.6–10.7:1 throughout and is unchanged.

**b. Tint with the named `-bg` token, never with an alpha of the ink.**
`bg-correct/15 text-correct` lands at 3.9–4.4:1 *whatever the ink is*, because
darkening the ink darkens the tint with it. It is also not theme-aware. Every
state colour has a `-bg`; `--color-medium-bg` was added to complete the set.

**c. A colour that is not declared in every theme block is not a token.**
`--color-purple` and `--color-pink` existed only in the light block, so dark
mode inherited the light values. The study plan's coach card set its heading
in `--color-purple` inline and rendered a dark violet on a near-black ground
at **2.04:1** — the title of the card was invisible in dark mode — and the
same stop dimmed the middle of every large `ProgressRing`.

### Personalisation

`data-accent` on `<html>` selects one of six preset blocks, each a complete
`--color-primary*` set for light *and* dark. The frontend can no longer invent
a colour, so a preset cannot be half-applied to one theme or land under the
contrast floor; the lowest ratio in the table is 6.05:1.

This replaced two free-form gradient mixers. The second of them wrote a
runtime value into `--gradient-bg`, and that is what made this a token change:
`--color-text` and `--color-text-muted` are measured against a *known* ground,
and an arbitrary gradient behind them voids that measurement across the whole
product at once. Its default was a saturated blue→purple→pink under dense
Armenian body copy, and its **reset** button restored the *pre-identity*
violet — so the one control students were pointed at could only take the
product backwards.

The brand band deliberately does **not** follow the accent. A branded ground
that carries white text is a different concept from the action colour, and it
must stay fixed for its contrast to stay known.

### Theme resolution

Three states, and `system` is one of them, not the absence of one. `useTheme`
is a `useSyncExternalStore` over a shared store — one value, one media
listener, consumers cannot disagree — and `system` is stored as the *removal*
of the localStorage key, which is also what a first-time visitor has. One
representation for one state. Before this, an effect persisted on every mount,
so merely rendering the header converted an OS-following student into a pinned
choice they could never get back out of.

The bare `:root` block is the **light** palette and the
`@media (prefers-color-scheme: dark)` block supplies dark, guarded as
`:root:not([data-theme='light'])`. It used to be the other way round, which
meant a first-time visitor whose OS preferred light matched neither the
`[data-theme]` block nor the media query and landed on a dark background that
contradicted their OS.

---

## 3. Shared components

| Component | Use it for |
|---|---|
| `ui/PageHeader` | The top of every page: back link, eyebrow, title (display face), description, actions. Actions wrap under the title, which is what keeps long Armenian titles from breaking the row. `size="prose"` for a title the *student* wrote (a ticket subject, a note's first line) — a 60-character Armenian sentence at `--text-3xl` measured 550px tall at 375px. |
| `ui/Section` | An `h2`/`h3` section with description, trailing action and vertical rhythm. Level 2 takes the display face. |
| `ui/SectionNav` / `SectionNavBar` | Anchored nav for a long page; rail on wide, strip on narrow. **Pass `offset`** when the nav itself is pinned under the header. Turns on at `xl`, not `lg` — see §7. |
| `ui/DataCard` | A card of data: lucide icon, title, description, trailing control. |
| `ui/Card` | A plain bordered surface, when the header is composed separately. |
| `ui/StatTile` / `ui/Metric` | Bordered vs. unbordered metric. `tone` is semantic (rule 5). |
| `ui/Field` / `PasswordField` / `FormAlert` | Labelled input with hint, error and `aria-invalid`. Errors land on the field. `fieldInputClass` is the input surface for custom controls — `min-h-11`, so an input is the same height as the `Select` and the `Button` beside it, and clears the 44px touch floor. |
| `ui/SearchField` | Any search box. Leading magnifier, a required Armenian `label` (a placeholder is not a name), and a clear button that restores focus to the field. Do **not** add `.tap-target` to something absolutely positioned — that utility sets `position: relative` from an unlayered rule and beats Tailwind's `.absolute`. |
| `ui/BarChart` | A bar chart with no library behind it: `points`, a spoken `summary`, an `empty` node, and a per-bar `readout` that becomes the visually-hidden text alternative. Use it for a categorical summary anywhere, and **especially** where `ui/Chart` cannot go — importing `Chart` pulls the 354 kB recharts chunk onto that route. |
| `ui/Button` / `LinkButton` / `IconButton` | `buttonClasses(variant, size, extra)` is the shared shape. Buttons **wrap** rather than overflow: `min-h` not `h`, so a short label keeps its exact height and only an unfittable one takes a second line. |
| `ui/Modal` | Any dialog. Radix underneath: focus trap, Escape, focus restoration, scroll lock. Centred card on the web, bottom sheet in the native shell, with the footer reversed so the primary action sits nearest the thumb. The way out is a **labelled footer action**, not an "✕". |
| `ui/ConfirmDialog` | A destructive confirmation. Never `window.confirm`. |
| `ui/Dropdown` | A menu button. Portals its menu, implements the WAI-ARIA pattern: first item focused on open, Up/Down/Home/End with wrap, Tab dismisses, Escape returns focus to the trigger. Item fields include `hint` (state a setting's cost where the person is deciding to pay it), `checked` + `selection` (`radio` \| `checkbox`), `disabled`, `divider`. |
| `ui/Badge` | A status pill. `shrink-0` deliberately — it is almost always the trailing item of a row whose leading item is long Armenian text. The *row* must therefore be allowed to wrap; see §7. |
| `ui/EmptyState` / `ErrorState` / `Skeleton` / `LoadingRegion` | The four non-populated states. `EmptyState.icon` takes a node — pass a lucide element. `tone="positive"` for empty states that are good news. |
| `ui/RankBadge` | The single rank badge. The number is always shown and the metal added to it, never instead of it. |
| `ui/Chart` | A recharts **line** chart, for a continuous trend on a surface that already earns the 354 kB. Not for bars, and not for the dashboard. |
| `lib/inFlight` | `dedupe(key, run)` — joins concurrent callers onto one promise and forgets it the moment it settles. An in-flight join, never a cache. See §13. |
| `ui/Switch`, `Select`, `Tabs`, `ProgressBar`, `ProgressRing`, `Avatar`, `Tooltip`, `Popover`, `FilterChips`, `NumberInput`, `RangeSlider`, `DatePicker`, `TimePicker`, `FilePicker` | The rest of the kit. |
| `questions/answerState` | The one vocabulary for answer status. See §5. |
| `practice/TierStatus` | One subtopic's three tiers, reported one way. |
| `mockexam/QuestionNavigator` / `ExamTimer` | The map of an exam, and time remaining with quiet / warning / critical states. |
| `games/GameCountdown` | Per-question countdown, same three-state discipline at a fifteen-second scale. Fixed size across all three states — the old one grew a font size at the threshold and reflowed the header mid-question. |
| `assistant/AssistantSuggestions` | The tutoring moves as one tap each. |
| `hooks/useAsyncResource` | One async read with all four states and a retry. Replaces `.then(setX)`. |
| `hooks/useTheme` | `{ theme, preference, setPreference, toggleTheme }` over a shared store. |
| `hooks/useReducedMotion` | For effects that decide whether to run **in JS** — a confetti burst, a count-up loop. CSS animations are already handled globally. |
| `lib/accentTheme` | `ACCENTS`, `getStoredAccent`, `saveAccent`, `applyStoredAccent`. |
| `lib/subjects` | `SUBJECTS` with a `LucideIcon`, `subjectMeta`, `subjectMetaForName`, `subjectIconForName`, `localizeSubjectName`. |
| `lib/scrollToElement` | Any scripted scroll. Never call `scrollIntoView` directly. |

### Two CSS utilities

- **`.tap-target`** (`index.css`) grows a control's touch target without
  growing the control: a centred pseudo-element, costing no layout, defaulting
  to 40×44 and adjustable with `--tap-w` / `--tap-h`. The defaults tile the
  header's `gap-1.5` exactly, so adjacent targets meet with neither overlap
  nor a dead strip.
- **`.math-scroll`** wraps before it scrolls. KaTeX emits break opportunities
  between top-level relations and binary operators, and `displayMode` then
  sets `white-space: nowrap` over them; much of the content bank is authored
  as `$$…$$`. Measured: a 438px answer inside a 244px option with 194px hidden
  behind an invisible scroll.

---

## 4. Voice

Gitus addresses the **student as "դու"**, and **teachers and parents as
"Դուք"**, capitalised.

This is not an inconsistency; it is the register Armenian actually uses. A
study companion speaking to a sixteen-year-old as "Դուք" is stiff, and a
platform addressing a teacher as "դու" is over-familiar. The split also
carries information: it tells a reader whose screen they are on.

Before this rule the product could not decide, and the mix was not between
surfaces but *inside single cards* — `AcademicIdentityCard`'s empty state read
"Ընտրիր քո նպատակային բուհը" over the hint "Ասացեք Gitus-ին, թե ուր եք
գնում"; `TeachersSection` had it exactly inverted, familiar to the adult and
formal to the teenager.

Two things this touches that are easy to miss:

- **The backend generates student-facing Armenian too.** The single most-read
  sentence in the product — the dashboard's mission title and its reason — is
  built in `apps/profiles/analytics.py`. The coach's situation / weakness /
  opportunity lines, the OAuth and username-cooldown messages, the chat, group,
  game and call errors, and the two transactional emails are all display
  strings, and all follow the same rule.
- **Not every `եք` is formal.** Friends' "Դուք և {name} այժմ ընկերներ եք" is
  two people, not politeness. A blanket sweep will get this wrong.

Punctuation is Armenian too: `։` not `.`, `՞` over the interrogative word
(`Ե՞րբ է…`, not `Երբ է…?`), `՜` for emphasis.

**The product is called Gitus.** The logo, the tab title, the auth screens and
twenty-odd user-facing strings agree on it.

---

## 5. Answer feedback

The single most consequential status in an education product is whether the
answer you just gave was correct. It used to be carried by green versus red
and nothing else, on six surfaces at once — the daily problem, tier practice,
the mistake retry panel, a live mock-exam attempt, mock-exam results and
multiplayer gameplay — because each question component decided status the same
way and made the same mistake.

`components/questions/answerState.tsx` is now the one vocabulary. Every state
carries a mark and a spoken label as well as a tint: a tick for the right
answer, a cross for the student's wrong one, a filled radio for a pending
choice, and unchosen wrong options **dimmed rather than tinted**, so the eye
goes to the two rows that matter.

The mark needs two vocabularies, not one. On a multiple-choice option
"correct" identifies *which option* is right; on a true/false row the student
has already answered and the mark judges that answer. Applying the option
wording to a true/false row produced "Սխալ է (ճիշտ պատասխանը)" — "it is false
(the correct answer)" — two claims in one breath that mean neither.
`meaning="verdict"` gives the second case its own words.

Multiple-choice and cloze options are **native radios in a labelled group**,
following the idiom `AppearanceSection`'s accent picker established: the input
is `sr-only` and the visible label carries the focus ring via
`has-[:focus-visible]`, because the element actually holding focus is 1px
square. That turns four unnamed tab stops into one, gives the group a name and
each option a "2 of 4" position, and makes arrow keys work — they previously
did nothing. The radio circles also fixed an affordance problem nobody had
named: the old options were bare rectangles indistinguishable from the
read-only rows above them.

---

## 6. Information architecture decisions

**One subject picker.** Every "subjects" entry point used to lead to
`/subjects`: a nine-panel scrolling "universe" on a hardcoded `#05050a` ground
that ignored the theme, set in faces with no Armenian glyphs, showing no study
information, and with six of its nine panels opening a "coming soon" dialog.
The main study destination in the navigation was two-thirds dead ends, nine
screen-heights tall — while `/practice` rendered a second picker, with real
progress, that nothing linked to. Both routes now render the picker with the
data. Reaching a question went from subjects → hub → navigator → topic →
subtopic to subjects → navigator → topic → subtopic, and the first step now
tells you which subject needs the work. The universe's assets are recoverable
from git; its visual language belongs on the marketing page.

**One place settings live.** Settings used to hold a password form and two
gradient mixers, under a line saying the rest was on the profile page — where
privacy sat in a hand-rolled overlay behind a menu, active devices had their
own route reachable from a grey text link, and light/dark was an unlabelled
header icon. It is one page now (Տեսք / Անվտանգություն / Գաղտնիություն) with
an anchored section rail, so a link can point at the part it means.
`/account/sessions` redirects to `/settings#devices`.

**One product name, one icon language, one section primitive.** `SubjectMeta.icon`
once held `"∑" | "⚛" | "🧬" | "⚗" | "🇬🇧"` — two maths symbols that render in
the text font, two colour emoji and a flag — feeding thirteen call sites
across seven surfaces. It is a `LucideIcon`. `ui/SectionHeader` was deleted in
favour of `ui/Section`.

**Unknown URLs have a page.** There was no catch-all route, so any address
react-router did not match rendered an entirely empty document — no chrome, no
message, no link — with only a console warning. `NotFoundPage` sits inside
`ProtectedRoute` so a signed-in student keeps the sidebar (the real recovery
path) and a signed-out visitor is still sent to `/login`.

---

## 7. Layout rules learned the hard way

- **`lg` is not a wide layout.** At 1024px the app's own 200px navigation rail
  is already showing, so a three-column grid at `lg` gives 221px cards. Both
  the settings rail and the mock-exam grid turn on at `xl` for this reason.
  Intermediate widths are where this bites; 1024 specifically.
- **`min-w-0` is not always the fix for a flex overflow.** It lets the box
  shrink, but Armenian words do not break, so the text then overflows its own
  box and paints *over* its neighbour. Overlapping text is worse than a
  scrollbar. Use `flex-wrap` when the trailing item is `shrink-0`; use
  `min-w-0` only where the child also clamps or truncates (`line-clamp`,
  `truncate`), because a flex child's default min-width is its min-content
  width and a clamp otherwise never gets the chance to apply.
- **Armenian labels run long.** `whitespace-nowrap` on a fixed-height button
  widened the button, which widened the document: measured as a 468px CTA in a
  343px column giving the page a 484px `scrollWidth` at 375px.
- **Fixed overlays stand on content permanently.** `AppChrome` reserves 84px
  below the page for the floating launchers, because no amount of scrolling
  moves a fixed element and a page's final action would otherwise be
  unreachable. Those two numbers are `--chrome-top` and `--chrome-bottom`; a
  page that wants exactly what is left of the viewport subtracts both from
  `100dvh` rather than guessing. `ChatPage` was a flat `h-screen` inside that
  padding and overflowed by precisely their sum, which put the message
  composer one viewport below the fold on every conversation.
- **A `fr` track will not shrink below its content.** Grid tracks default to
  `min-width: auto`, so replacing a narrow native control with a kit one can
  push a whole row past the viewport — measured at 1317px in a 1280px window
  when a `DatePicker` replaced an `<input type="date">`. Give `minmax(0, …)`
  only to the cell whose content actually truncates: giving it to *every*
  track clipped "1-րդ մակարդակ" in the neighbour, because Armenian does not
  break.

---

## 8. Motion and feedback

CSS animation is handled globally: `index.css` collapses every duration under
`prefers-reduced-motion`. Two consequences worth knowing:

- **Check a keyframe's end state.** Under the global rule an animation snaps
  to its `forwards` end state instantly. The confetti and firework bursts are
  safe because they end off-screen and at opacity 0 respectively. An animation
  that ends *visible* would freeze on screen instead of playing — which is
  exactly how `Reveal` once left content permanently invisible.
- **JS-driven motion needs `useReducedMotion`.** `canvas-confetti` paints to a
  canvas, so the CSS rule cannot touch it. A perfect practice score used to
  fire 1.2 seconds of particles from both edges of the screen at a student who
  had asked the system for less motion, and the rAF loop never cancelled, so
  closing the modal mid-burst left it firing over the page.

**`behavior: "smooth"` cannot be relied on.** `window.scrollTo({top: 5000,
behavior: "smooth"})` was observed leaving `scrollY` at **0** while the
identical call with `behavior: "auto"` worked, with `prefers-reduced-motion`
false — so the exam's jump-to-question did nothing at all.
`lib/scrollToElement` requests the animated scroll, verifies it moved, and
applies it instantly if the browser ignored it.

---

## 9. Verifying this app

The browser pane used for live checks is frequently `document.hidden`. In that
state **CSS animations never tick and `requestAnimationFrame` never fires**:

1. A Radix dialog that has closed can stay mounted and visible, because
   `Presence` waits for an `animationend` that cannot arrive. This looks
   exactly like "Escape does not close the dialog" — check `data-state`
   before believing it.
2. Anything scheduled with `rAF` silently does not run. `setTimeout` is both
   more robust and more testable.
3. Screenshots after a scripted scroll return stale or blank frames. Take them
   at scroll 0 with a tall viewport instead.

Four measurement traps:

- **`getComputedStyle().outlineWidth` / `.outlineColor` are useless for focus
  rings.** Every element reports `1.5px currentColor` regardless of focus.
  Confirm focus rings visually.
- **Screenshot capture fails past a few thousand pixels of scroll.** The
  65-question exam is ~30,000px tall. Verify deep-scroll state with
  `getBoundingClientRect` / `elementFromPoint` assertions.
- **The review browser has no Armenian locale data.**
  `Intl.DateTimeFormat.supportedLocalesOf(['hy-AM','hy'])` returns `[]` in it,
  so all twenty-eight `toLocaleDateString("hy-AM", …)` call sites render
  English there — "Aug 17", not "17 օգս". The *code* is correct and a normal
  Chrome resolves `hy`; what this means is that **Armenian date layout cannot
  be judged in this browser**, and that a user whose runtime lacks `hy` (some
  Android WebViews, a Capacitor shell built with a trimmed ICU) silently gets
  English dates. See §12.
- **Counting requests in the dev server counts them twice.** `main.tsx` wraps
  the app in `StrictMode`, which double-invokes effects in development, so
  every fetch fires two identical times. Halve any request count taken from
  `npm run dev` before drawing a conclusion — and note that an endpoint
  appearing *four* times is the interesting case: that is two real callers,
  doubled.

What is worth automating, because every finding that mattered came from
measuring the DOM rather than reading code:

- `scrollWidth === clientWidth` per route per breakpoint (375 / 390 / 768 /
  **1024** / 1280 / 1440).
- Contrast per text node, compositing the real background through its alpha
  layers, in both themes. Exclude the brand band and the segmented control's
  sliding pill, whose ground is painted by an absolutely positioned sibling.
- Every interactive element has an accessible name.
- Patch `XMLHttpRequest` to fail `/api/` and mount each route cold: every one
  should show a `role="alert"` with a working retry, and none should sit on
  "Բեռնվում է…".

---

## 10. Verified state at the end of this work

- **Breakpoints**: twenty-two routes assert `scrollWidth === clientWidth` at
  375, 390, 768, 1024, 1280 and 1440.
- **Contrast**: zero failures across eighteen routes in **both** themes,
  against 4.5:1 for body text and 3:1 for large.
- **Names**: zero unnamed interactive controls on the audited routes.
- **Focus**: one treatment everywhere — the global 2px ring at 2px offset —
  after removing `outline-none` from `fieldInputClass` and twenty-five
  hand-rolled inputs.
- **Register**: a DOM scan for formal markers returns zero hits on all
  eighteen student routes.
- **Failure**: fourteen routes mounted against a forced 500; all show an error
  and a retry that recovers.
- **Radii**: every Tailwind `rounded-*` utility outside the landing page is on
  the scale. Six routes measured in both themes report exactly two
  non-circular radii across the whole document (12px and 8px), where before
  they reported four or five. `rounded-full` is exempt and stays — see §2.
- **Inputs**: no bespoke input surface remains. Ten deliberate exceptions are
  named in the commit that finished the migration (borderless editors, the OTP
  boxes, a colour swatch, a tone-carrying pill, the native-shell fields).
- **Tests**: 149 frontend, 499 backend. `tsc --noEmit` clean, production build
  succeeds.
- **Bundle**: no dependency added. `ui/BarChart` is library-free, and the
  production build confirms the property that matters — `HomePage-*.js` and
  `StudentDashboardPage-*.js` contain no reference to the 354 kB
  `LineChart-*.js` chunk, which is pulled only by `ui/Chart`, the two radar
  charts and `ProfilePage`.

---

## 11. Open questions for the product owner

These are decisions, not defects. They are deliberately not made here.

1. **`ReloadButton` is rendered on the wrong platform.** `AppChrome` mounts it
   only on the **web**, where the browser already provides reload, and not in
   the native shell, where there is no browser chrome and it would earn its
   place. Removing it from the web takes a fourth permanent overlay off every
   page and returns 44px to the most contested row in the app. This is a
   product call.
2. **How much belongs in a phone's top bar?** At 375px that row carries seven
   interactive things — hamburger, reload, assignments, streak, notifications,
   theme, account. It is why the notification and theme buttons are 34px
   visually with a 40×44 target rather than a full 44px: the width does not
   exist. The theme toggle in particular now has a proper home in Settings →
   Տեսք, so it is the obvious candidate to drop below `sm`. Related to (1).
3. **True/false has no "unanswered" value.** `selectedIds` is the set of
   statements marked *true*, so an untouched statement renders as "Սխալ" — the
   interface asserts an answer the student never gave. Distinguishing them is
   a backend contract change. `TierPage` is at least honest about the
   consequence before submitting ("Չպատասխանվածները կհաշվվեն սխալ։").
4. **The help centre has no content pipeline.** Its articles live only in the
   database — no seed file, no fixture, no data in `0001_initial`, unlike every
   other body of content here (`apps/*/data/*.json` + an idempotent importer).
   Their register has been converted with a management command (below), but the
   next edit has the same problem: nothing about the copy is under review, and
   two databases can disagree for ever. Whether the help centre deserves a
   `data/articles.json` and an importer is a product call.

   To apply the register fix to a database this session did not touch:

   ```
   python manage.py fix_help_register --dry-run   # report first
   python manage.py fix_help_register             # then apply
   ```

   It is idempotent, it rewrites only reviewed exact strings, and it *reports*
   anything else that still reads as formal rather than guessing — because
   "Դուք և {name} այժմ ընկերներ եք" is a genuine plural and a sweep over `-եք`
   would break it (§4).

---

## 12. Remaining design debt

Ordered by value ÷ risk.

1. **`AppChrome` remounts when you cross `/`.** Measured, and the single
   highest-value item here — see §13, which records the numbers. It is a
   routing change with a real trap in it (the landing page must *not* end up
   inside the chrome), and the landing page is owned separately, so it is
   written up rather than done.
2. **Two endpoints are fetched twice on one mount.**
   `GET /teaching/assignments/notifications/` is read by both the sidebar badge
   and the notification bell. `GET /profile/me/` had the same shape and is now
   deduped as the proof of concept in §13; the same treatment fits here, but
   the general fix is a shared provider, which needs a refresh contract.
3. **Armenian dates depend on the runtime having `hy`.** Twenty-eight call
   sites format dates through `Intl`; eight of them ask for a month *name*
   (`month: "short"`/`"long"`) and therefore render English words wherever
   `hy` is missing — which is measurable right now in the review browser (§9).
   A `lib/armenianDate.ts` with an explicit month table behind a
   `supportedLocalesOf` check would make Armenian dates unconditional. The
   other twenty sites degrade to a different numeric order, not to English.
4. **`--text-2xs` has one consumer and ~40 candidates.** The step was added for
   chart tick labels; `text-[10px]` / `text-[11px]` still appears about forty
   times. Migrating them is mechanical, but each one needs the same judgement
   the token's comment demands: a tick may shrink, a word may not.
5. **A hand-rolled button is still a hand-rolled button.** The radius pass put
   ~25 of them on the scale without putting them on `Button`, so they render at
   the right radius but still reinvent hover, active, disabled and loading.
   `ConfirmModal`, `MessageModal`, `SuccessModal`, `MessageRequestsModal` and
   `ShowcasePickerModal` are the clearest cases.
6. **A disabled control that does not say why.** `AssignmentPicker`'s
   "Հանձնարարել" disables until a student is picked and explains nothing,
   which is principle 9 unmet on a surface a teacher uses daily.
7. **`NewConversationModal` is still a hand-rolled dialog.** It has an "✕" for
   a way out rather than a labelled footer action, and does not use `ui/Modal`,
   so it has no focus trap and no scroll lock. Its four form fields are
   labelled only by placeholder.
8. **The weekly chart plots eight weeks to show one bar** for a typical
   account. The accuracy trend beside it gives the card a reason to exist, but
   a range that adapts to available data would be better.
9. **Dismissing a menu on a polling list loses focus.** `ui/Dropdown` restores
   focus to its trigger correctly (verified on the account menu), but the chat
   conversation list re-renders on a 15-second poll, and if that lands just
   after Escape the restored button is unmounted and focus falls to `<body>`.
   Narrow, but real.
10. **Per-topic difficulty in the mistake notebook.** With a seeded account
    every topic shows the same count, so "worst first" conveys nothing. A
    secondary sort (recency, or error category) would make the order legible
    when counts tie.
11. **`greetingSubtext()` retains a motivational-fallback branch** for when no
    real insight exists. It is grounded in real data today; keep it that way.
12. **A visual-regression harness.** The checks in §9 are cheap to automate and
    would catch the next 1024px overflow before a human sees it.

---

## 13. Memo: should the app cache reads across navigations?

`CLAUDE.md` records "no Redux, no React Query" as a deliberate repo-wide
decision, and the debt list carried "no cross-page data cache — the dashboard
alone makes five parallel calls on every mount" against it. This section is the
measurement and the options. **It is a proposal; the decision is the product
owner's.**

### What was measured

A logged-in student account, XHR and `fetch` patched to record every
`/api/` call, walking a realistic trail with in-app links (no page reloads):
`/subjects → / → /rankings → / → /mistake-notebook → / → /mock-exams → /`, then
a second trail that never touches `/`. Dev server, backend on localhost, so
network latency is ~0 and every number below is a *floor*. Request counts are
halved from the raw figures because `StrictMode` double-invokes effects in
development (§9).

**The premise turned out to be half right.**

| Navigation | Requests on mount |
|---|---|
| protected → protected (`/rankings → /mock-exams`) | 2 — the page's own data, nothing else |
| protected → protected (`/mock-exams → /mistake-notebook`) | 1 |
| returning to a page already visited (`/mistake-notebook → /rankings`) | 5 — all of them refetched |
| anything ↔ `/` | the page's data **plus 8 chrome requests** |

So navigating *between* protected routes already costs only the page's own
data. There is no general "everything refetches" problem to solve. Two
specific things are real:

**1. Crossing `/` remounts the entire app chrome.** `App.tsx` renders `/`
through `RootRoute` and everything else through `ProtectedRoute`, and *both*
render their own `<AppChrome>`. They are sibling routes, so React unmounts one
tree and mounts the other every time a student goes to or leaves the dashboard
— which is the most travelled edge in the product. Eight requests fire again
(`profile/me`, `notifications`, `friends/requests`, `parents/requests`,
`teaching/invitations`, `teaching/assignments`,
`teaching/assignments/notifications`, `chat/conversations/unread-count`), every
polling interval restarts, and the header and sidebar lose their state. This is
not a caching problem. It is one routing change, and it is worth more than any
cache.

**2. Two endpoints are requested twice in the same tick.** `GET /profile/me/`
by `HeaderStrip` and by `HomePage`; `GET /teaching/assignments/notifications/`
by the sidebar badge and by the notification bell. Identical requests, ~1ms
apart, identical responses.

**What it costs the student.** Time from click to real dashboard content, three
runs, warm cache, localhost: **258 / 252 / 243 ms** — every time. Payloads are
small (the eight chrome calls total ~2 kB, five of them returning `[]`), so the
cost is round trips, not bytes: on a phone at ~150 ms RTT the same mount is
roughly 0.5–1 s of skeleton, repeated on every return to the dashboard.

### The options

**(a) A small in-house cache, no new dependency.** A `Map` of
`key → { value, at }` behind `useAsyncResource`, serving a stale value
immediately and revalidating behind it, for a named allowlist of endpoints.
*Bundle:* ~1 kB. *Migration:* small — `useAsyncResource` is already the one
async-read primitive. *Invalidation risk:* this is the whole cost, and it is
not small. Every mutation in the product would have to know which keys it
invalidates, and getting it wrong shows a student stale XP after they earned
it, or a stale rank after a season rolled over. `apps/rankings` also has
per-request server side effects (rank-history snapshots, season-ending
notifications, noted in `CLAUDE.md`), so calling it *less often* changes
behaviour rather than just latency.

**(b) React Query or SWR.** *Bundle:* ~13 kB gzip for `@tanstack/react-query`
v5 core — not measured here, since installing it to find out would be the
decision. *Migration:* every `useAsyncResource` call site, ~45 files, plus a
provider. *Invalidation risk:* lower than (a) in the sense that the library
has thought about it, higher in the sense that it introduces a second state
model beside the five Contexts. It also contradicts a recorded repo-wide
decision, which is a reason to raise it rather than to route around it.

**(c) Do nothing about caching.** *Bundle:* 0. *Risk:* 0. Leaves the 250 ms
re-mount cost on repeat visits to the same page.

### Recommendation

**(c) for now, and fix the two structural problems instead** — in this order:

1. **Render one `AppChrome`.** Removes 8 requests from the most common
   navigation in the app and stops the header, sidebar and every poll
   restarting. No staleness semantics, no invalidation design. Blocked here
   only because the fix touches how `/` is routed and `/` renders the landing
   page for signed-out visitors, which another owner holds.
2. **Dedupe the two double-fetches.** Done for `profile/me` below as a proof of
   concept; `teaching/assignments/notifications` wants a shared provider,
   because both call sites also need to refresh it.
3. **Then re-measure.** With those two done, the remaining cost is a page
   refetching its own data on a return visit — 1–5 requests. That is a real but
   modest prize, and it is the *only* part that needs a caching decision. If it
   is still wanted, prefer (a) with an explicit allowlist over (b): the
   endpoints worth caching are few and known (`profile/analytics`, the parent
   dashboard's `build_child_dashboard`, `practice/hierarchy`), and an allowlist
   keeps the invalidation surface countable.

### The proof of concept

`lib/inFlight.ts` — `dedupe(key, run)` joins concurrent callers onto one
promise and **deletes the entry as soon as it settles**. It is not a cache:
nothing is retained, so the next read always goes to the network and no stale
profile can ever be served. Applied to `fetchProfile()` only.

Measured on a dashboard mount, dev server (so counts are doubled):
`GET /profile/me/` went **4 → 1**, while `GET
/teaching/assignments/notifications/` stayed at 4 as an untouched control. Four
unit tests pin the behaviour, including the one that keeps it honest — that a
settled request is forgotten.

---

## Appendix — how this document was built

Six sessions of work, each committed as it landed; every commit message
carries its own full diagnosis, and `git log` is the detailed record.

The recurring finding across all of them is worth stating once, because it
will be the finding again: **adoption, not absence, is the problem.** This
codebase had a real token layer, a ~30-component kit with thoughtful doc
comments, route-level code splitting and memoized contexts before any of this
work started. What it did not have was surfaces that used them.
`useAsyncResource` existed from session 1 and was used in exactly one file
while forty-five others still rendered a bare `Բեռնվում է...`, most with the
unguarded-promise defect that leaves a page loading for ever on any failure.
Each surface's real work is adoption, plus the one or two genuine UX problems
underneath it.

| Session | Scope |
|---|---|
| 1 | Tokens, radius/type/focus scales, the dashboard's duplicate-recommendation problem |
| 2 | The identity (colour, display face), practice, mock exams, AI assistant, flashcards |
| 3 | Profile, notes, notifications, rankings, teacher and parent dashboards, auth; `ui/DataCard` |
| 4 | Settings, the dashboard retrofit, one subject picker, one icon language, one product name |
| 5 | The surfaces nobody had visited: flashcard study/manage/editor, games, multiplayer |
| 6 | The final review: voice, answer feedback, contrast, focus, touch targets, silent failures, the 404 |
| 7 | The debt list: the bespoke inputs, the radius migration, `ui/BarChart`, the help-centre register, and the caching memo in §13 |
