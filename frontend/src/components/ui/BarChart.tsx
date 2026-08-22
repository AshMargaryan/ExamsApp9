import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

/*
  A bar chart with no charting library behind it.

  Why this is a separate module from `ui/Chart`
  ---------------------------------------------
  It cannot be a `variant` prop on `Chart`, and that is the whole point.
  `Chart` imports recharts, so *any* module that imports `Chart` pulls the
  ~354KB recharts chunk with it — including the dashboard, which is the
  highest-traffic route in the product and the one whose bundle every student
  pays for first. A bar variant living in the same file would have quietly
  undone the route-splitting that keeps recharts off that page. Two modules,
  one kit: `Chart` for continuous trends on analytics surfaces, `BarChart` for
  a small categorical summary anywhere.

  It also stays bars rather than becoming a line: a line through eight weekly
  counts — most of them zero for a typical account — implies continuity
  between values that are discrete and independent. "How much in each week" is
  a bar question.

  Why it exists at all
  --------------------
  Two surfaces had already hand-rolled this exact strip, and the second one
  had every defect the first had fixed:

  - `WeeklyProgressChart` (dashboard, 8 weeks) — 120/90px, 32px bars, the
    primary for the highlighted portion, `role="img"` with a spoken summary
    and a visually-hidden per-bar list.
  - `DailyProgressChart` (student dashboard, 7 days) — 90/70px, 16px bars,
    `bg-text` over `bg-border` (a *structural* token doing duty as a data
    colour, so the two halves of a bar were nearly indistinguishable), and
    `title` attributes as the only way to read a bar's numbers — which a touch
    device never displays, so on a phone that chart carried no values at all
    and a screen reader got nothing but weekday labels.

  Both are this component now, so the accessibility and the tokens are decided
  once. The two remaining differences — size and bar width — are props,
  because a seven-day strip inside a stat card genuinely is smaller than an
  eight-week strip that owns its card.
*/

export interface BarChartPoint {
  /** Stable identity for the bar. */
  id: string;
  /** The label under the bar. A tick, not a word: eight of these share a
   *  343px card on a phone and they are set at `--text-2xs`. */
  label: string;
  /** Bar height, in whatever unit the series shares. */
  value: number;
  /**
   * The part of `value` drawn in the solid fill; the remainder is drawn as a
   * tint of it. Use it for a "of which correct" split — omit for a plain bar.
   */
  highlight?: number;
  /**
   * One row of the text alternative, e.g. "5 օգս՝ 12 հարց, 9 ճիշտ".
   * Written out rather than derived, because only the caller knows what the
   * numbers are called.
   */
  readout: string;
}

/**
 * A bar is never shorter than this once it carries a non-zero value, so "a
 * little" never renders as "nothing".
 */
const MIN_VISIBLE_BAR = 4;

export function BarChart({
  points,
  summary,
  empty,
  height = 120,
  maxBarHeight = height - 30,
  maxBarWidth = 32,
  gapClassName = "gap-1 sm:gap-2",
  className,
}: {
  points: BarChartPoint[];
  /** The whole figure's accessible name — the sentence the chart is making. */
  summary: string;
  /** Rendered instead of the plot when every value is zero. */
  empty: ReactNode;
  height?: number;
  /** Leaves room for the labels under the bars; override only if they wrap. */
  maxBarHeight?: number;
  maxBarWidth?: number;
  /**
   * Tighter below `sm` by default: eight columns and seven 8px gaps left 30px
   * per label on a 375px phone, three short of the 33px "Aug 10" needs, so the
   * last two ticks truncated.
   */
  gapClassName?: string;
  className?: string;
}) {
  const max = Math.max(1, ...points.map((p) => p.value));
  const total = points.reduce((sum, p) => sum + p.value, 0);

  if (total === 0) return <>{empty}</>;

  return (
    <div className={className}>
      {/*
        `role="img"` with a spoken summary, rather than per-bar `title`s. A
        `title` is not shown on a touch device and is not a reliable name, so
        the numbers live in the list below — which is the actual text
        alternative, and is why the bars themselves need no semantics.
      */}
      <div
        className={cn("flex items-end", gapClassName)}
        style={{ height }}
        role="img"
        aria-label={summary}
      >
        {points.map((p) => {
          const barHeight = Math.round((p.value / max) * maxBarHeight);
          const drawn = p.value > 0 ? Math.max(barHeight, MIN_VISIBLE_BAR) : 0;
          const highlight = p.highlight ?? p.value;
          const solidHeight = p.value > 0 ? Math.round((highlight / p.value) * drawn) : 0;
          return (
            <div key={p.id} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
              <div
                className="flex w-full flex-col justify-end overflow-hidden rounded-t-[var(--radius-xs)] bg-surface-muted"
                style={{ height: drawn, maxWidth: maxBarWidth }}
              >
                {/* The highlighted portion is the primary, so the chart follows
                    a student's chosen accent like everything else, and the
                    remainder is a tint of the same hue rather than a border
                    colour — one data colour, two weights. */}
                <div className="w-full bg-primary" style={{ height: solidHeight }} />
                <div className="w-full bg-primary/25" style={{ height: Math.max(drawn - solidHeight, 0) }} />
              </div>
              <span className="max-w-full truncate text-[length:var(--text-2xs)] text-text-muted">
                {p.label}
              </span>
            </div>
          );
        })}
      </div>

      <ul className="sr-only">
        {points.map((p) => (
          <li key={p.id}>{p.readout}</li>
        ))}
      </ul>
    </div>
  );
}
