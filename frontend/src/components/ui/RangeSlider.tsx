import { useId } from "react";
import { cn } from "../../lib/cn";

/*
  One control for a min/max pair.

  Two separate sliders stacked in a column is the wrong shape for a range: it
  shows two numbers and no relationship, so "minimum 55" and "maximum 135" read
  as unrelated settings and the student has to hold the constraint between them
  in their head. Worse, the constraint then has to be explained in prose
  underneath ("the minimum always stays below the maximum") — a sentence that
  exists only because the control couldn't express the rule itself.

  A single track with two handles shows the *span*: the filled segment is the
  answer. The invalid region is unreachable by construction, so the explanatory
  sentence disappears with it.

  Handles push rather than block — dragging the low handle past the high one
  carries it along, so you can never get wedged against an invisible wall.
*/

export function RangeSlider({
  label,
  minValue,
  maxValue,
  onChange,
  min,
  max,
  step = 5,
  format = (n) => String(n),
  formatRange,
  minLabel = "Նվազագույն",
  maxLabel = "Առավելագույն",
  disabled = false,
  className,
}: {
  label: string;
  minValue: number;
  maxValue: number;
  onChange: (next: { min: number; max: number }) => void;
  min: number;
  max: number;
  step?: number;
  format?: (n: number) => string;
  /** Headline readout; defaults to "min–max" using `format`. */
  formatRange?: (lo: number, hi: number) => string;
  minLabel?: string;
  maxLabel?: string;
  disabled?: boolean;
  className?: string;
}) {
  const id = useId();
  const span = Math.max(1, max - min);
  const lo = Math.min(minValue, maxValue);
  const hi = Math.max(minValue, maxValue);
  const loPct = ((lo - min) / span) * 100;
  const hiPct = ((hi - min) / span) * 100;

  // When both handles sit on the same spot the later input in DOM order wins
  // every pointer event, which would strand the low handle at the top of the
  // track. Lifting it above once it passes the midpoint keeps both grabbable.
  const loOnTop = lo > min + span / 2;

  return (
    <div className={className}>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="text-xs font-medium text-text-muted">{label}</span>
        <span className="text-sm font-semibold tabular-nums text-text">
          {formatRange ? formatRange(lo, hi) : `${format(lo)}–${format(hi)}`}
        </span>
      </div>

      <div className={cn("ui-dual", disabled && "pointer-events-none opacity-50")}>
        <span className="ui-dual__track" aria-hidden />
        <span
          className="ui-dual__fill"
          aria-hidden
          style={{ left: `${loPct}%`, width: `${Math.max(0, hiPct - loPct)}%` }}
        />
        <input
          id={`${id}-min`}
          type="range"
          min={min}
          max={max}
          step={step}
          value={lo}
          disabled={disabled}
          aria-label={minLabel}
          aria-valuetext={format(lo)}
          style={{ zIndex: loOnTop ? 4 : 3 }}
          onChange={(e) => {
            const next = Number(e.target.value);
            onChange({ min: next, max: Math.max(next, hi) });
          }}
        />
        <input
          id={`${id}-max`}
          type="range"
          min={min}
          max={max}
          step={step}
          value={hi}
          disabled={disabled}
          aria-label={maxLabel}
          aria-valuetext={format(hi)}
          style={{ zIndex: loOnTop ? 3 : 4 }}
          onChange={(e) => {
            const next = Number(e.target.value);
            onChange({ min: Math.min(next, lo), max: next });
          }}
        />
      </div>

      <div className="mt-1.5 flex justify-between text-[11px] text-text-muted">
        <span>
          {minLabel} <span className="font-medium text-text">{format(lo)}</span>
        </span>
        <span>
          {maxLabel} <span className="font-medium text-text">{format(hi)}</span>
        </span>
      </div>
    </div>
  );
}
