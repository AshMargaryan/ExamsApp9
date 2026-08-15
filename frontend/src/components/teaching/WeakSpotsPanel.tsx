import type { WeakSpot } from "../../api/teaching";

export function WeakSpotsPanel({ spots }: { spots: WeakSpot[] }) {
  if (spots.length === 0) {
    return (
      <p className="rounded-[var(--radius)] border border-border bg-surface p-5 text-text-muted">
        Դեռ բավարար տվյալ չկա դասարանի սխալների վերաբերյալ։
      </p>
    );
  }

  const max = Math.max(...spots.map((s) => s.count));

  return (
    <div className="flex flex-col gap-2.5">
      {spots.map((s, i) => (
        <div key={`${s.subject_name}-${s.topic_label}-${i}`}>
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="truncate text-sm text-text">
              <span className="font-medium">{s.subject_name}</span>
              {s.topic_label && <span className="text-text-muted"> · {s.topic_label}</span>}
            </span>
            <span className="shrink-0 text-xs font-medium text-text-muted">{s.count}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full rounded-full bg-incorrect"
              style={{ width: `${Math.max(6, Math.round((s.count / max) * 100))}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
