// A small "battery" progress indicator: fill width = % of tiers completed,
// fill color = average score quality on what's been completed so far.
export function Battery({ percent, avgScore }: { percent: number; avgScore: number | null }) {
  const fillColor =
    avgScore === null
      ? "var(--color-border)"
      : avgScore >= 80
        ? "var(--color-correct)"
        : avgScore >= 50
          ? "var(--color-medium)"
          : "var(--color-incorrect)";

  return (
    <span className="inline-flex items-center gap-1.5" title={`${percent}%${avgScore !== null ? ` · միջին միավոր ${avgScore}%` : ""}`}>
      <span className="relative inline-block h-3.5 w-8 rounded-[3px] border-2 border-text-muted">
        <span
          className="absolute inset-y-0 left-0 rounded-[1px] transition-all"
          style={{ width: `${Math.max(percent, 0)}%`, backgroundColor: fillColor }}
        />
        <span className="absolute top-1/2 -right-[3px] h-1.5 w-[2px] -translate-y-1/2 rounded-r-sm bg-text-muted" />
      </span>
      <span className="text-xs text-text-muted">{percent}%</span>
    </span>
  );
}
