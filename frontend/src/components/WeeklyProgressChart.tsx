import type { WeeklyProgressPoint } from "../api/practice";

/*
  Eight weeks of "questions solved", split into correct and incorrect.

  Why this is still a hand-rolled bar strip and not `ui/Chart`
  -----------------------------------------------------------
  `ui/Chart` documents itself as the replacement for this component, and the
  design record carried that as debt for two sessions. Resolving it properly
  means *not* migrating:

  - `ui/Chart` is a recharts **line** chart. A line through eight weekly
    counts, most of which are zero for a typical account, implies continuity
    between values that are discrete and independent. Bars are the correct
    mark for "how much in each week".
  - recharts is a ~354KB chunk. It is already loaded on the profile and
    analytics pages, where the charts justify it. Pulling it onto the
    dashboard — the highest-traffic route in the product, and the one whose
    bundle everyone pays on first load — to draw eight rectangles fails §51.

  So the split is: `ui/Chart` for continuous trends on analytics surfaces, a
  zero-dependency bar strip for a small categorical summary. What was genuinely
  wrong here, and is fixed below, was the accessibility and the tokens, not the
  chart type.
*/

const CHART_HEIGHT = 120;
const BAR_MAX_HEIGHT = 90;

function weekLabel(weekStart: string): string {
  return new Date(weekStart).toLocaleDateString("hy-AM", { day: "numeric", month: "short" });
}

export function WeeklyProgressChart({ points }: { points: WeeklyProgressPoint[] }) {
  const max = Math.max(1, ...points.map((p) => p.solved));
  const totalSolved = points.reduce((sum, p) => sum + p.solved, 0);
  const totalCorrect = points.reduce((sum, p) => sum + p.correct, 0);
  const activeWeeks = points.filter((p) => p.solved > 0).length;

  if (totalSolved === 0) {
    return (
      <div className="flex h-[120px] flex-col items-center justify-center gap-[var(--space-1)] rounded-[var(--radius-lg)] border border-dashed border-border px-[var(--space-4)] text-center">
        <p className="text-[length:var(--text-sm)] font-medium text-text">Այս 8 շաբաթում դեռ պարապմունք չկա</p>
        <p className="text-[length:var(--text-xs)] text-text-muted">
          Առաջին իսկ լուծված հարցից հետո այստեղ կհայտնվի շաբաթական սյունակը։
        </p>
      </div>
    );
  }

  return (
    <div>
      <div
        className="flex items-end gap-2"
        style={{ height: CHART_HEIGHT }}
        /* `title` attributes were the only way to read a bar's numbers, and a
           touch device never shows them — so on a phone this chart carried no
           values at all, and a screen reader got nothing but week labels. The
           figure is announced as one summary, and the per-week numbers live in
           the visually-hidden list below, which is the actual text
           alternative. */
        role="img"
        aria-label={`Վերջին 8 շաբաթում լուծված է ${totalSolved} հարց, որից ${totalCorrect} ճիշտ։ Պարապել եք ${activeWeeks} շաբաթ։`}
      >
        {points.map((p) => {
          const barHeight = Math.round((p.solved / max) * BAR_MAX_HEIGHT);
          const correctHeight = p.solved > 0 ? Math.round((p.correct / p.solved) * barHeight) : 0;
          return (
            <div key={p.week_start} className="flex flex-1 flex-col items-center justify-end gap-1.5">
              <div
                className="flex w-full max-w-8 flex-col justify-end overflow-hidden rounded-t-[var(--radius-sm)] bg-surface-muted"
                style={{ height: Math.max(barHeight, p.solved > 0 ? 4 : 0) }}
              >
                {/* The correct portion is the primary, so the chart follows a
                    student's chosen accent like everything else. The remainder
                    used to be painted with `--color-border` — a structural
                    token doing duty as a data colour, which is why the two
                    halves of a bar were nearly indistinguishable in dark
                    mode. */}
                <div className="w-full bg-primary" style={{ height: correctHeight }} />
                <div
                  className="w-full bg-primary/25"
                  style={{ height: Math.max(barHeight - correctHeight, 0) }}
                />
              </div>
              <span className="text-[10px] text-text-muted">{weekLabel(p.week_start)}</span>
            </div>
          );
        })}
      </div>

      <ul className="sr-only">
        {points.map((p) => (
          <li key={p.week_start}>
            {weekLabel(p.week_start)}՝ {p.solved} հարց, {p.correct} ճիշտ
          </li>
        ))}
      </ul>
    </div>
  );
}
