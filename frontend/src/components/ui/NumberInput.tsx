import { useEffect, useId, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "../../lib/cn";

/*
  Numeric field replacing <input type="number">.

  The native one paints browser spinners that no theme can restyle, and its
  arrows are a 10px hit target. It also lets a student type "e", "+" and "-"
  into a field that is supposed to hold a count, then reports an empty
  `valueAsNumber` on submit.

  This keeps a text input (so typing, selecting and pasting all behave), but
  constrains it to digits, and pairs it with real 44px stepper buttons that
  disable at the bounds so the limit is visible rather than silently enforced.

  Free typing is allowed while focused — clamping mid-keystroke makes "12"
  impossible to type when the minimum is 5 — and the value is normalised on
  blur, which is the moment the student has finished expressing an intent.
*/

export function NumberInput({
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  suffix,
  label,
  id,
  placeholder,
  disabled = false,
  invalid = false,
  className,
}: {
  /** null means "empty" — a real state, distinct from 0. */
  value: number | null;
  onChange: (next: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  label?: string;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
}) {
  const generatedId = useId();
  const inputId = id ?? `number-${generatedId}`;
  const [draft, setDraft] = useState(value == null ? "" : String(value));

  // Follow external changes (stepper clicks, resets) unless the student is
  // mid-edit with an equivalent value already typed.
  useEffect(() => {
    setDraft(value == null ? "" : String(value));
  }, [value]);

  const clamp = (n: number) => Math.max(min, max != null ? Math.min(max, n) : n);
  const atMin = value != null && value <= min;
  const atMax = max != null && value != null && value >= max;

  function commitDraft(raw: string) {
    if (raw === "") {
      onChange(null);
      return;
    }
    const parsed = Number(raw);
    onChange(Number.isFinite(parsed) ? clamp(parsed) : null);
  }

  const stepButton = cn(
    "flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius)] border border-border text-text",
    "transition-colors duration-[var(--motion-fast)] ease-[var(--ease-out)]",
    "hover:border-primary hover:bg-surface-muted",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
    "disabled:pointer-events-none disabled:opacity-40",
  );

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <button
        type="button"
        aria-label="Պակասեցնել"
        disabled={disabled || atMin}
        onClick={() => onChange(clamp((value ?? min) - step))}
        className={stepButton}
      >
        <Minus size={16} strokeWidth={2} />
      </button>

      <div
        className={cn(
          "flex h-11 min-w-0 flex-1 items-center rounded-[var(--radius)] border bg-bg px-3",
          "transition-colors duration-[var(--motion-fast)]",
          /* The ring belongs on the visible box, not on the borderless
             input inside it, so the wrapper carries it — the same idiom
             AppearanceSection's radio labels use. */
          "has-[:focus-visible]:outline has-[:focus-visible]:outline-[length:var(--focus-ring-width)]",
          "has-[:focus-visible]:outline-offset-[var(--focus-ring-offset)] has-[:focus-visible]:outline-[var(--focus-ring-color)]",
          /* The ring belongs on the visible box, not on the borderless input
             inside it — so the wrapper carries it, the same way
             AppearanceSection's radio labels do. */
          "has-[:focus-visible]:outline has-[:focus-visible]:outline-[length:var(--focus-ring-width)]",
          "has-[:focus-visible]:outline-offset-[var(--focus-ring-offset)] has-[:focus-visible]:outline-[var(--focus-ring-color)]",
          /* The ring belongs on the visible box, not on the borderless input
             inside it — so the wrapper carries it, the same way
             AppearanceSection's radio labels do. */
          "has-[:focus-visible]:outline has-[:focus-visible]:outline-[length:var(--focus-ring-width)]",
          "has-[:focus-visible]:outline-offset-[var(--focus-ring-offset)] has-[:focus-visible]:outline-[var(--focus-ring-color)]",
          invalid ? "border-incorrect" : "border-border focus-within:border-primary",
          disabled && "opacity-50",
        )}
      >
        <input
          id={inputId}
          type="text"
          inputMode="numeric"
          aria-label={label}
          aria-invalid={invalid || undefined}
          placeholder={placeholder}
          disabled={disabled}
          value={draft}
          onChange={(e) => {
            // Digits only — no "e", no sign, no separators.
            const next = e.target.value.replace(/[^\d]/g, "");
            setDraft(next);
            if (next !== "") onChange(Number(next));
          }}
          onBlur={(e) => commitDraft(e.target.value.replace(/[^\d]/g, ""))}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp") {
              e.preventDefault();
              onChange(clamp((value ?? min) + step));
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              onChange(clamp((value ?? min) - step));
            }
          }}
          className="min-w-0 flex-1 bg-transparent text-center text-sm font-semibold tabular-nums text-text outline-none placeholder:font-normal placeholder:text-text-muted"
        />
        {suffix && <span className="ml-1 shrink-0 text-xs text-text-muted">{suffix}</span>}
      </div>

      <button
        type="button"
        aria-label="Ավելացնել"
        disabled={disabled || atMax}
        onClick={() => onChange(clamp((value ?? min) + step))}
        className={stepButton}
      >
        <Plus size={16} strokeWidth={2} />
      </button>
    </div>
  );
}
