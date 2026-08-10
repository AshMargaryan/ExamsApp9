export function ProgressBar({
  percent,
  colorClassName = "bg-primary",
  trackClassName = "bg-surface-muted",
  heightClassName = "h-1.5",
  label,
}: {
  percent: number;
  colorClassName?: string;
  trackClassName?: string;
  heightClassName?: string;
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div
      className={`w-full overflow-hidden rounded-full ${heightClassName} ${trackClassName}`}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-500 ${colorClassName}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
