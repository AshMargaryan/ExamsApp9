import { useId } from "react";
import { cn } from "../../lib/cn";

/*
  Labelled slider with its live value in the label row.

  The `min`/`max` props are the *bounds of this slider*, which callers can make
  depend on a sibling field — that is how the "minimum daily minutes can't
  exceed the maximum" rule is enforced in the UI instead of being discovered
  after a failed save. A control that cannot express an invalid value never
  needs an error message for it.

  Every painted part of the control is ours (see `.ui-range` in index.css); the
  native input underneath is kept purely for its behaviour — arrow/Home/End
  stepping, touch dragging and `aria-valuenow` — none of which is worth
  reimplementing on a div.
*/

export function RangeField({
  label,
  value,
  onChange,
  min,
  max,
  step = 5,
  format = (n) => String(n),
  hint,
  disabled = false,
  className,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
  min: number;
  max: number;
  step?: number;
  format?: (n: number) => string;
  hint?: string;
  disabled?: boolean;
  className?: string;
}) {
  const id = useId();
  const clamped = Math.max(min, Math.min(max, value));
  const fillPercent = max > min ? ((clamped - min) / (max - min)) * 100 : 0;

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 flex items-baseline justify-between gap-3">
        <span className="text-xs font-medium text-text-muted">{label}</span>
        <span className="text-sm font-semibold tabular-nums text-text">{format(clamped)}</span>
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={clamped}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className={cn("ui-range", disabled && "opacity-50")}
        style={{ "--range-fill": `${fillPercent}%` } as React.CSSProperties}
      />
      {hint && <p className="mt-0.5 text-[11px] text-text-muted">{hint}</p>}
    </div>
  );
}
