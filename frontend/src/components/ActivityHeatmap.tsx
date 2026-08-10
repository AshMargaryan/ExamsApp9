export interface HeatmapPoint {
  date: string;
  count: number;
  tooltip?: string;
}

/**
 * GitHub-style contribution grid. `points` may be sparse (backend only
 * returns days with activity) — missing days in the [today-rangeDays, today]
 * window are filled in as zero so the grid always covers the full range.
 */
export function ActivityHeatmap({
  points,
  rangeDays = 365,
}: {
  points: HeatmapPoint[];
  rangeDays?: number;
}) {
  const byDate = new Map(points.map((p) => [p.date, p]));
  const max = points.reduce((m, p) => Math.max(m, p.count), 0);

  const today = new Date();
  const days: HeatmapPoint[] = [];
  for (let i = rangeDays - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    days.push(byDate.get(iso) ?? { date: iso, count: 0 });
  }

  // Group into weeks (columns), Sunday-start, so it reads left-to-right like GitHub's graph.
  const firstDow = new Date(days[0].date).getDay();
  const padded: (HeatmapPoint | null)[] = [...Array(firstDow).fill(null), ...days];
  const weeks: (HeatmapPoint | null)[][] = [];
  for (let i = 0; i < padded.length; i += 7) {
    weeks.push(padded.slice(i, i + 7));
  }

  function levelClass(count: number) {
    if (count === 0) return "bg-surface-muted";
    const ratio = count / (max || 1);
    if (ratio <= 0.33) return "bg-primary/30";
    if (ratio <= 0.66) return "bg-primary/60";
    return "bg-primary";
  }

  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex gap-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((p, di) =>
              p ? (
                <div
                  key={p.date}
                  title={p.tooltip ?? `${p.date}՝ ${p.count}`}
                  className={`h-3 w-3 rounded-sm ${levelClass(p.count)}`}
                />
              ) : (
                <div key={di} className="h-3 w-3" />
              )
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
