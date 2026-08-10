export function StatTile({
  label,
  value,
  hint,
  delta,
}: {
  label: string;
  value: string;
  hint?: string;
  /** Signed change vs. a prior period, e.g. "+4.2%". Colored by sign. */
  delta?: string;
}) {
  const deltaTone = delta?.startsWith("-") ? "text-incorrect" : delta ? "text-correct" : "";
  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-5 text-center">
      <p className="text-2xl font-semibold text-text">{value}</p>
      <p className="mt-1 text-sm text-text-muted">{label}</p>
      {delta && <p className={`mt-0.5 text-xs font-medium ${deltaTone}`}>{delta}</p>}
      {hint && !delta && <p className="mt-0.5 text-xs text-text-muted">{hint}</p>}
    </div>
  );
}
