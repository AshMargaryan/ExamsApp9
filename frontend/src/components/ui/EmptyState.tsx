export function EmptyState({
  icon,
  title,
  hint,
  cta,
}: {
  icon: string;
  title: string;
  hint?: string;
  cta?: { label: string; onClick: () => void };
}) {
  return (
    <div className="rounded-[var(--radius)] border border-dashed border-border bg-surface p-6 text-center">
      <p className="text-2xl">{icon}</p>
      <p className="mt-2 text-sm font-medium text-text">{title}</p>
      {hint && <p className="mt-1 text-xs text-text-muted">{hint}</p>}
      {cta && (
        <button
          type="button"
          onClick={cta.onClick}
          className="mt-3 text-sm font-medium text-primary hover:underline"
        >
          {cta.label} →
        </button>
      )}
    </div>
  );
}
