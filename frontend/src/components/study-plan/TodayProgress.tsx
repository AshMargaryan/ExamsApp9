import type { CoachToday } from "../../api/studyPlan";
import { Metric } from "../ui/Metric";
import { ProgressRing } from "../ui/ProgressRing";
import { formatMinutes } from "./planFormat";

/*
  Today at a glance.

  Two different things were being conflated in one progress bar: how much of
  the *plan* is done (tasks, estimated minutes) and how the *work itself* went
  (questions, accuracy). The ring owns the first, the metrics own the second,
  and the estimated-minutes line is labelled as an estimate because that is
  what it is — the sum of the plan's own guesses, not measured study time.
*/

export function TodayProgress({ today }: { today: CoachToday }) {
  const pct = today.total_count > 0 ? (today.done_count / today.total_count) * 100 : 0;

  return (
    <section className="rounded-[var(--radius)] border border-border bg-surface p-5 sm:p-6">
      <h3 className="mb-4 text-sm font-semibold text-text">Այսօրվա առաջընթացը</h3>

      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <ProgressRing value={pct} size={96} thickness={8} label="Այսօրվա առաջընթաց">
            <span className="text-lg leading-none font-semibold tabular-nums text-text">{Math.round(pct)}%</span>
          </ProgressRing>
          <div>
            <p className="text-[15px] font-semibold text-text">
              {today.done_count} / {today.total_count} առաջադրանք
            </p>
            <p className="mt-0.5 text-xs text-text-muted">
              {formatMinutes(today.minutes_done)} / {formatMinutes(today.minutes_total)} (գնահատված)
            </p>
          </div>
        </div>

        <div className="grid flex-1 grid-cols-2 gap-4 border-border sm:grid-cols-4 sm:border-l sm:pl-6">
          <Metric label="ճշտություն" value={`${today.accuracy}%`} size="sm" />
          <Metric label="հարց" value={today.questions} size="sm" />
          <Metric label="ճիշտ" value={today.correct} tone="correct" size="sm" />
          <Metric label="սխալ" value={today.mistakes} tone="incorrect" size="sm" />
        </div>
      </div>
    </section>
  );
}
