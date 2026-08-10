interface Option<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

// Two-or-more-way toggle with a sliding active-indicator pill (translateX
// over equal-width segments) instead of just recoloring the pressed button.
export function SegmentedControl<T extends string>({ options, value, onChange, className }: Props<T>) {
  const activeIndex = Math.max(0, options.findIndex((o) => o.value === value));

  return (
    <div
      className={`relative inline-grid rounded-full border border-border bg-surface p-1 ${className ?? ""}`}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      <div
        aria-hidden
        className="btn-fx-glow absolute inset-y-1 rounded-full bg-primary shadow-[var(--shadow-sm)] transition-transform duration-300"
        style={{
          width: `calc((100% - 0.5rem) / ${options.length})`,
          transform: `translateX(calc(${activeIndex} * 100%))`,
        }}
      />
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`btn-fx relative z-10 rounded-full px-4 py-1.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
            value === o.value ? "text-primary-contrast" : "text-text hover:text-primary"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
