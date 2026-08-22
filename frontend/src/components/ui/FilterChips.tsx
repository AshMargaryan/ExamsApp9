import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

/*
  A row of mutually exclusive filter chips.

  Why this exists
  ---------------
  Five surfaces on the profile alone hand-rolled this control, and no two
  agreed: `rounded-md px-2 py-1` with a filled active state in one place,
  `rounded-full border px-2.5 py-0.5` with an outlined active state in the
  next, `rounded-full px-3 py-1` in a third — all in the same column, some of
  them stacked directly on top of each other. The same control looked like
  three different controls depending on which card it was in.

  It is also a genuine accessibility fix rather than a tidy-up. Every one of
  those hand-rolled versions was a bare `<button>` whose only signal of
  selectedness was colour: no `aria-pressed`, no `role`, nothing a screen
  reader could report and nothing that survives greyscale. Here the row is a
  `radiogroup` and each chip a `radio` carrying `aria-checked`, so the
  selection is announced, and the active chip is additionally weighted and
  outlined so it is not colour-alone.

  Arrow-key navigation follows the radiogroup pattern: the group holds one tab
  stop, and Left/Right move (and select) within it.
*/

export interface FilterChipOption<T extends string> {
  value: T;
  label: ReactNode;
  /** Optional trailing count, e.g. "12". Rendered dimmer than the label. */
  count?: number | string;
}

export function FilterChips<T extends string>({
  options,
  value,
  onChange,
  label,
  size = "md",
  className,
}: {
  options: FilterChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name for the group — what is being filtered. */
  label: string;
  size?: "sm" | "md";
  className?: string;
}) {
  function move(delta: number) {
    const index = options.findIndex((o) => o.value === value);
    if (index === -1) return;
    const next = options[(index + delta + options.length) % options.length];
    onChange(next.value);
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("flex flex-wrap gap-[var(--space-2)]", className)}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight" || e.key === "ArrowDown") {
          e.preventDefault();
          move(1);
        } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
          e.preventDefault();
          move(-1);
        }
      }}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            // One tab stop for the whole group, per the radiogroup pattern.
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-[var(--radius-full)] border whitespace-nowrap transition-colors",
              "duration-[var(--motion-fast)] ease-[var(--ease-out)]",
              size === "sm"
                ? "px-[var(--space-3)] py-[2px] text-[length:var(--text-xs)]"
                : "px-[var(--space-3)] py-[var(--space-1)] text-[length:var(--text-sm)]",
              active
                // Weight and a filled ground, not just a hue — the selection
                // has to survive greyscale.
                ? "border-primary bg-primary-bg font-semibold text-primary"
                : "border-border font-medium text-text-muted hover:border-primary-line hover:text-text",
            )}
          >
            {option.label}
            {option.count !== undefined && (
              <span className={cn("ml-[var(--space-2)] tabular-nums", active ? "opacity-70" : "opacity-60")}>
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
