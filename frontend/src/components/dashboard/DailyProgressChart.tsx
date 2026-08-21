import type { ActivityDay } from "../../api/profile";
import { BarChart, type BarChartPoint } from "../ui/BarChart";

const WEEKDAY_LABELS = ["Կրկ", "Երկ", "Երք", "Չրք", "Հնգ", "Ուրբ", "Շբթ"];
const CHART_HEIGHT = 90;

function lastNDays(n: number): string[] {
  const days: string[] = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

/*
  Last seven days of questions solved, filling in the zero days the heatmap
  omits.

  This was the second hand-rolled copy of the dashboard's weekly strip, and it
  had none of the fixes the first one received: its bars were `bg-text` over
  `bg-border` — a structural token used as a data colour, so the two halves
  were nearly indistinguishable — and the only way to read a bar's numbers was
  a `title` attribute, which a touch device never shows. It draws through
  `ui/BarChart` now, so it inherits the primary-plus-tint fill, the spoken
  summary and the visually-hidden per-day readout.
*/
export function DailyProgressChart({ days }: { days: ActivityDay[] }) {
  const byDate = new Map(days.map((d) => [d.date, d]));
  const points = lastNDays(7).map((date) => {
    const day = byDate.get(date);
    const weekday = WEEKDAY_LABELS[new Date(`${date}T00:00:00`).getDay()];
    return { date, weekday, solved: day?.questions_solved ?? 0, correct: day?.correct_answers ?? 0 };
  });
  const totalSolved = points.reduce((sum, p) => sum + p.solved, 0);
  const totalCorrect = points.reduce((sum, p) => sum + p.correct, 0);

  const bars: BarChartPoint[] = points.map((p) => ({
    id: p.date,
    label: p.weekday,
    value: p.solved,
    highlight: p.correct,
    readout: `${p.weekday}՝ ${p.solved} հարց, ${p.correct} ճիշտ`,
  }));

  return (
    <BarChart
      points={bars}
      height={CHART_HEIGHT}
      /* Four pixels, not twelve. This strip lives in one cell of the stat
         row: at `gap-3` its seven gaps ate 72 of the 82px the plot had, and
         every bar rendered 1px wide — the chart had been drawing nothing
         legible on this page. */
      gapClassName="gap-1"
      summary={`Վերջին 7 օրում լուծված է ${totalSolved} հարց, որից ${totalCorrect} ճիշտ։`}
      empty={
        <div
          className="flex items-center justify-center text-[length:var(--text-sm)] text-text-muted"
          style={{ height: CHART_HEIGHT }}
        >
          Այս շաբաթ դեռ առաջընթաց չկա։
        </div>
      }
    />
  );
}
