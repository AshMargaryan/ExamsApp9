import type { ActivityDay } from "../../api/profile";

const CHART_HEIGHT = 90;
const BAR_MAX_HEIGHT = 70;
const WEEKDAY_LABELS = ["Կրկ", "Երկ", "Երք", "Չրք", "Հնգ", "Ուրբ", "Շբթ"];

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

/** Last-7-days bar chart of questions solved, filling in zero days the heatmap omits. */
export function DailyProgressChart({ days }: { days: ActivityDay[] }) {
  const byDate = new Map(days.map((d) => [d.date, d]));
  const points = lastNDays(7).map((date) => {
    const day = byDate.get(date);
    const weekday = WEEKDAY_LABELS[new Date(`${date}T00:00:00`).getDay()];
    return { date, weekday, solved: day?.questions_solved ?? 0, correct: day?.correct_answers ?? 0 };
  });
  const max = Math.max(1, ...points.map((p) => p.solved));
  const totalSolved = points.reduce((sum, p) => sum + p.solved, 0);

  if (totalSolved === 0) {
    return (
      <div className="flex items-center justify-center text-sm text-text-muted" style={{ height: CHART_HEIGHT }}>
        Այս շաբաթ դեռ առաջընթաց չկա։
      </div>
    );
  }

  return (
    <div className="flex items-end gap-3" style={{ height: CHART_HEIGHT }}>
      {points.map((p) => {
        const barHeight = Math.round((p.solved / max) * BAR_MAX_HEIGHT);
        const correctHeight = p.solved > 0 ? Math.round((p.correct / p.solved) * barHeight) : 0;
        return (
          <div key={p.date} className="flex flex-1 flex-col items-center justify-end gap-2">
            <div
              title={`${p.weekday}՝ ${p.solved} հարց, ${p.correct} ճիշտ`}
              className="flex w-full max-w-4 flex-col justify-end overflow-hidden rounded-t-md bg-surface-muted"
              style={{ height: Math.max(barHeight, p.solved > 0 ? 4 : 0) }}
            >
              <div className="w-full bg-text" style={{ height: correctHeight }} />
              <div className="w-full bg-border" style={{ height: Math.max(barHeight - correctHeight, 0) }} />
            </div>
            <span className="text-[11px] text-text-muted">{p.weekday}</span>
          </div>
        );
      })}
    </div>
  );
}
