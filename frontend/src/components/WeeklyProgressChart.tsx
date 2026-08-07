import type { WeeklyProgressPoint } from "../api/practice";

const CHART_HEIGHT = 120;
const BAR_MAX_HEIGHT = 90;

function weekLabel(weekStart: string): string {
  return new Date(weekStart).toLocaleDateString("hy-AM", { day: "numeric", month: "short" });
}

export function WeeklyProgressChart({ points }: { points: WeeklyProgressPoint[] }) {
  const max = Math.max(1, ...points.map((p) => p.solved));
  const totalSolved = points.reduce((sum, p) => sum + p.solved, 0);

  if (totalSolved === 0) {
    return (
      <div className="flex h-[120px] items-center justify-center text-sm text-text-muted">
        Դեռ առաջընթաց չկա այս շաբաթների ընթացքում։ Սկսեք պարապել՝ գրաֆիկը լրացնելու համար։
      </div>
    );
  }

  return (
    <div className="flex items-end gap-2" style={{ height: CHART_HEIGHT }}>
      {points.map((p) => {
        const barHeight = Math.round((p.solved / max) * BAR_MAX_HEIGHT);
        const correctHeight = p.solved > 0 ? Math.round((p.correct / p.solved) * barHeight) : 0;
        return (
          <div key={p.week_start} className="flex flex-1 flex-col items-center justify-end gap-1.5">
            <div
              title={`${weekLabel(p.week_start)}՝ ${p.solved} հարց, ${p.correct} ճիշտ`}
              className="flex w-full max-w-8 flex-col justify-end overflow-hidden rounded-t-md bg-surface-muted"
              style={{ height: Math.max(barHeight, p.solved > 0 ? 4 : 0) }}
            >
              <div className="w-full bg-accent" style={{ height: correctHeight }} />
              <div
                className="w-full bg-primary"
                style={{ height: Math.max(barHeight - correctHeight, 0) }}
              />
            </div>
            <span className="text-[10px] text-text-muted">{weekLabel(p.week_start)}</span>
          </div>
        );
      })}
    </div>
  );
}
