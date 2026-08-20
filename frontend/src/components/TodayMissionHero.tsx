import { Link } from "react-router-dom";
import { Circle, CheckCircle2, Flame, Play, Target } from "lucide-react";
import type { HomeInsight } from "../api/profile";
import type { LearningStreak } from "../api/streaks";
import { missionHrefOrFallback } from "../lib/missionHref";
import type { NextMission } from "../api/profile";
import { Card } from "./ui/Card";
import { LoadingRegion, Skeleton } from "./ui/Skeleton";

const CHECKLIST_LABELS: Record<string, string> = {
  practice: "պարապողական հարց",
  mistakes: "սխալի վերանայում",
  daily_problem: "Օրվա խնդիրը",
};

/** The button should name the thing it opens. A single generic label was how
 *  "start today's practice" ended up launching a full mock-exam list. */
function missionCtaLabel(mission: NextMission): string {
  if (!mission.available) return "Սկսել";
  switch (mission.cta.type) {
    case "mistake_review":
      return "Վերանայել սխալները";
    case "mock_exams":
      return "Անցնել ամբողջական թեստ";
    default:
      return "Սկսել այսօրվա պարապմունքը";
  }
}

export function TodayMissionHero({
  insight,
  streak,
}: {
  insight: HomeInsight | null;
  streak: LearningStreak | null;
}) {
  if (insight === null) {
    return (
      <LoadingRegion label="Այսօրվա պարապմունքը բեռնվում է" className="lg:col-span-2">
        <div className="rounded-[var(--radius-xl)] border border-border p-[var(--space-6)] sm:p-[var(--space-8)]">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="mt-[var(--space-3)] h-6 w-2/3" />
          <Skeleton className="mt-[var(--space-2)] h-3.5 w-full" />
          <div className="mt-[var(--space-5)] flex flex-col gap-[var(--space-2)]">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-3.5 w-1/3" />
            ))}
          </div>
          <Skeleton className="mt-[var(--space-6)] h-11 w-56 rounded-[var(--radius-full)]" />
        </div>
      </LoadingRegion>
    );
  }

  const { next_mission: mission, checklist } = insight;

  if (!mission.available) {
    return (
      <Card className="lg:col-span-2 border-dashed text-center">
        <Target className="mx-auto text-text-muted" size={28} strokeWidth={1.75} />
        <h2 className="mt-2 text-lg font-semibold text-text">Եկ կառուցենք քո ուսումնական պլանը</h2>
        <p className="mt-1 text-sm text-text-muted">
          Սկսիր առաջին խնդրից, և Haygit-ը կսկսի հասկանալ քո մակարդակը և կառաջարկի քեզ հարմար ծրագիր։
        </p>
        <Link
          to="/subjects"
          className="mt-4 inline-block rounded-md bg-primary px-6 py-2 font-medium text-primary-contrast transition-colors hover:bg-primary-hover"
        >
          Սկսել →
        </Link>
      </Card>
    );
  }

  if (checklist.all_complete) {
    return (
      <div
        className="rounded-[var(--radius)] p-5 lg:col-span-2"
        style={{ border: "1px solid var(--color-correct)", backgroundColor: "var(--color-surface)" }}
      >
        <h2 className="flex items-center gap-2 text-lg font-semibold text-text">
          <CheckCircle2 className="text-correct" size={20} strokeWidth={1.75} /> Այսօրվա պարապմունքն ավարտված է
        </h2>
        <ul className="mt-3 space-y-1 text-sm text-text">
          {checklist.items.map((item) => (
            <li key={item.key} className="flex items-center gap-2">
              <CheckCircle2 className="text-correct" size={16} strokeWidth={1.75} />
              {item.key === "daily_problem"
                ? CHECKLIST_LABELS[item.key]
                : `${item.done} ${CHECKLIST_LABELS[item.key]}`}
            </li>
          ))}
        </ul>
        {streak && (
          <p className="mt-3 flex items-center gap-1.5 text-sm text-text-muted">
            <Flame size={15} strokeWidth={1.75} /> {streak.current_streak}-օրյա շարքը շարունակվում է։
          </p>
        )}
        <p className="mt-3 text-sm text-text-muted">Gitus-ի հաջորդ խորհուրդը՝ վաղը շարունակիր նույն թափով։</p>
      </div>
    );
  }

  const percent = checklist.total_count > 0 ? (checklist.completed_count / checklist.total_count) * 100 : 0;

  const steps = checklist.items.filter((item) => item.target > 0);

  /*
    The one branded object on the dashboard.

    History matters here, because this card has now been two wrong things.
    Originally it painted `--gradient-hero` — a saturated magenta→purple ramp
    built out of `--color-primary` and `--color-purple` — edge to edge, with
    every string on it in white at ~13px. Session 1 correctly killed that:
    dense Armenian copy on an unmeasured saturated ground is hard to read, and
    the loudest thing in the card was its own backdrop rather than its CTA. It
    became a quiet tinted surface instead.

    But quiet turned out to be its own failure. The card carries the single
    next action the whole page exists to produce, and as a pale wash it was
    *less* prominent than the daily-problem card beneath it — the page's
    primary object was not the most prominent object on the page.

    The resolution is that the identity work built a ground for exactly this.
    `--gradient-brand` is theme-invariant and measured: white sits on it at
    8.3:1–11.7:1 and `--color-on-brand-muted` at 5.1:1, in both themes. So the
    hero is branded again, but on a surface whose contrast is known rather
    than assumed, and the CTA inverts to a light fill so the brightest element
    in the card is still the button.

    Anything added here must use `--color-on-brand*`, never `--color-text`,
    which flips with the theme while this band does not.
  */
  return (
    <div
      className="grid items-center gap-[var(--space-7)] overflow-hidden rounded-[var(--radius-xl)] p-[var(--space-6)] shadow-[var(--shadow-md)] sm:grid-cols-[1fr_auto] sm:p-[var(--space-8)] lg:col-span-2"
      style={{ background: "var(--gradient-brand)" }}
    >
      <div className="min-w-0">
        {/* Not `uppercase`. Armenian capitals carry far less shape variety
            than lowercase, so a tracked-out 11px caps eyebrow is the least
            legible text on a screen — see the same note on the practice
            breadcrumb. Sentence case with wide tracking reads as an eyebrow
            without costing legibility. */}
        <p className="mb-[var(--space-2)] flex items-center gap-1.5 text-[length:var(--text-xs)] font-semibold tracking-[var(--tracking-wide)] text-on-brand-muted">
          <Target size={13} strokeWidth={1.75} /> Այսօրվա պարապմունքը
        </p>
        <h2 className="font-display text-[length:var(--text-2xl)] font-semibold leading-[var(--leading-display)] tracking-[var(--tracking-tight)] text-on-brand sm:text-[length:var(--text-3xl)]">
          {mission.title}
        </h2>
        <p className="mt-[var(--space-3)] max-w-[var(--measure-base)] text-[length:var(--text-sm)] leading-[var(--leading-body)] text-on-brand-muted">
          {mission.reason}
          {mission.estimated_minutes != null && ` · Մոտավոր տևողությունը՝ ${mission.estimated_minutes} րոպե`}
        </p>

        <ul className="mt-[var(--space-5)] space-y-1.5 text-[length:var(--text-sm)] text-on-brand">
          {steps.map((item) => (
            <li key={item.key} className="flex items-center gap-[var(--space-2)]">
              {/* `--color-correct` is a mid green tuned for the app surface and
                  drops to ~2.6:1 on the band's darkest stop. Done-ness is
                  carried by the filled icon and the strike-through instead,
                  both of which survive greyscale. */}
              {item.complete ? (
                <CheckCircle2 size={15} strokeWidth={2} className="shrink-0 text-on-brand" />
              ) : (
                <Circle size={15} strokeWidth={1.75} className="shrink-0 text-on-brand-muted" />
              )}
              <span className={item.complete ? "text-on-brand-muted line-through" : undefined}>
                {item.key === "daily_problem"
                  ? CHECKLIST_LABELS[item.key]
                  : `${item.done} / ${item.target} ${CHECKLIST_LABELS[item.key]}`}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-[var(--space-4)] flex flex-wrap items-center gap-[var(--space-2)]">
          {steps.map((item) => (
            /* The track is on-brand fill, not a surface token: the band is
               theme-invariant, so a token that flips with the theme would
               vanish in one of them. */
            <span
              key={item.key}
              className="h-1.5 w-9 rounded-[var(--radius-full)]"
              style={{
                background: item.complete ? "var(--color-on-brand)" : "var(--color-on-brand-fill)",
              }}
            />
          ))}
          <span className="ml-[var(--space-2)] text-[length:var(--text-xs)] text-on-brand-muted">
            {checklist.completed_count}/{checklist.total_count} առաջադրանք ավարտված
          </span>
        </div>

        <Link
          to={missionHrefOrFallback(mission)}
          // Inverted on the band: a light fill with brand-coloured text. The
          // filled `bg-primary` button this replaces sat at 1.6:1 against the
          // band's own indigo, so the page's single most important control was
          // the least visible thing in its own card.
          // Full width on a phone. Armenian CTA labels are long enough to wrap
          // at 375px, and a wrapped label inside an auto-width pill left the
          // icon stranded against a wide left gutter with the text ragged
          // beside it.
          className="mt-[var(--space-6)] flex w-full items-center justify-center gap-[var(--space-2)] rounded-[var(--radius-full)] bg-[var(--color-on-brand)] px-[var(--space-6)] py-[var(--space-3)] text-center font-semibold text-[var(--color-brand-2)] transition-opacity hover:opacity-90 sm:inline-flex sm:w-auto sm:px-[var(--space-7)]"
        >
          {/* Hidden below sm: once the Armenian label wraps to two lines the
              icon is left floating beside a centred block rather than reading
              as part of the label. The label already names the action. */}
          <Play size={16} strokeWidth={1.75} className="hidden shrink-0 sm:block" aria-hidden />
          {missionCtaLabel(mission)}
        </Link>
      </div>

      {/*
        The ring is progress feedback, so it only earns its space once there is
        progress to show. At 0% it was a large circle whose entire message was
        "you have not started" — stated more kindly, and in less room, by the
        step list above.
      */}
      {percent > 0 && (
        <div
          className="hidden h-[120px] w-[120px] shrink-0 items-center justify-center rounded-[var(--radius-full)] sm:flex"
          style={{
            background: `conic-gradient(var(--color-on-brand) 0% ${percent}%, var(--color-on-brand-fill) ${percent}% 100%)`,
          }}
          role="img"
          aria-label={`Այսօրվա պարապմունքը ${Math.round(percent)} տոկոսով ավարտված է`}
        >
          <div
            className="flex h-24 w-24 flex-col items-center justify-center rounded-[var(--radius-full)]"
            style={{ background: "var(--color-brand-2)" }}
          >
            <span className="text-[length:var(--text-2xl)] font-semibold tabular-nums text-on-brand">
              {Math.round(percent)}%
            </span>
            <span className="text-[length:var(--text-xs)] text-on-brand-muted">ավարտված</span>
          </div>
        </div>
      )}
    </div>
  );
}
