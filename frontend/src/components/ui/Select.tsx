import { useId, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "../../lib/cn";
import { Popover } from "./Popover";

/*
  Custom listbox replacing <select>.

  A native select renders as an OS widget: it ignores the app's font, colours,
  radius and dark theme, and looks different on every platform — which on a
  page where everything else is designed reads as a bug. This is the same
  control, drawn by us.

  Semantics follow the ARIA combobox/listbox pattern rather than being
  approximated: the trigger is a `combobox` owning a `listbox`, the highlighted
  option is tracked with `aria-activedescendant` (so focus never leaves the
  trigger and Escape/Tab behave), and the full keyboard contract is here —
  Up/Down, Home/End, Enter/Space, Escape, and type-ahead, which is the one
  people miss and the one that makes a 20-item list usable.
*/

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  /** Optional leading visual — an icon or subject glyph. */
  icon?: ReactNode;
  disabled?: boolean;
}

const TYPEAHEAD_RESET_MS = 700;

export function Select<T extends string>({
  value,
  onChange,
  options,
  placeholder = "Ընտրիր",
  label,
  id,
  disabled = false,
  invalid = false,
  className,
}: {
  value: T | "";
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  placeholder?: string;
  /** Accessible name. Pass this OR wire `id` to a visible <label>. */
  label?: string;
  id?: string;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
}) {
  const generatedId = useId();
  const triggerId = id ?? `select-${generatedId}`;
  const listId = `${triggerId}-list`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const typeahead = useRef({ buffer: "", at: 0 });

  const selectedIndex = options.findIndex((o) => o.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null;

  function firstEnabled(list: SelectOption<T>[]): number {
    return list.findIndex((o) => !o.disabled);
  }

  /**
   * Open, landing on the current value rather than the top of the list.
   *
   * Deliberately not an effect keyed on `[open, options]`: callers build
   * `options` inline, so it is a fresh array on every render, and the effect
   * would re-run after each keystroke and snap the highlight back to the
   * selected item — arrow keys would appear to do nothing. Seeding once, here,
   * is both correct and easier to follow.
   */
  function openList() {
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : firstEnabled(options));
    setOpen(true);
  }

  function step(from: number, delta: number): number {
    const count = options.length;
    for (let i = 1; i <= count; i++) {
      const next = (from + delta * i + count * count) % count;
      if (!options[next].disabled) return next;
    }
    return from;
  }

  function commit(index: number) {
    const option = options[index];
    if (!option || option.disabled) return;
    onChange(option.value);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (disabled) return;

    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openList();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => step(i < 0 ? -1 : i, 1));
        return;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => step(i < 0 ? 0 : i, -1));
        return;
      case "Home":
        e.preventDefault();
        setActiveIndex(firstEnabled(options));
        return;
      case "End":
        e.preventDefault();
        setActiveIndex(step(0, -1));
        return;
      case "Enter":
      case " ":
        e.preventDefault();
        commit(activeIndex);
        return;
      case "Tab":
        setOpen(false);
        return;
      default:
        break;
    }

    // Type-ahead: printable keys jump to the first option starting with the
    // accumulated buffer, which resets after a short pause.
    if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && !e.altKey) {
      const now = Date.now();
      typeahead.current.buffer =
        now - typeahead.current.at > TYPEAHEAD_RESET_MS ? e.key : typeahead.current.buffer + e.key;
      typeahead.current.at = now;
      const query = typeahead.current.buffer.toLocaleLowerCase("hy-AM");
      const match = options.findIndex(
        (o) => !o.disabled && o.label.toLocaleLowerCase("hy-AM").startsWith(query),
      );
      if (match >= 0) setActiveIndex(match);
    }
  }

  return (
    <div className={cn("relative", className)}>
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-haspopup="listbox"
        aria-label={label}
        aria-activedescendant={open && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        className={cn(
          "flex h-11 w-full items-center justify-between gap-2 rounded-[var(--radius)] border bg-bg px-3 text-left text-sm",
          "transition-colors duration-[var(--motion-fast)] ease-[var(--ease-out)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          "disabled:cursor-not-allowed disabled:opacity-50",
          invalid ? "border-incorrect" : open ? "border-primary" : "border-border hover:border-primary/60",
        )}
      >
        <span className={cn("flex min-w-0 items-center gap-2", selected ? "text-text" : "text-text-muted")}>
          {selected?.icon && <span className="flex shrink-0">{selected.icon}</span>}
          <span className="truncate">{selected ? selected.label : placeholder}</span>
        </span>
        <ChevronDown
          size={16}
          strokeWidth={2}
          aria-hidden
          className={cn(
            "shrink-0 text-text-muted transition-transform duration-[var(--motion-fast)]",
            open && "rotate-180",
          )}
        />
      </button>

      <Popover open={open} onClose={() => setOpen(false)} triggerRef={triggerRef} role="listbox">
        <ul id={listId} role="none">
          {options.map((option, index) => {
            const isSelected = option.value === value;
            const isActive = index === activeIndex;
            return (
              <li key={option.value} role="none">
                <div
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={option.disabled || undefined}
                  onPointerEnter={() => !option.disabled && setActiveIndex(index)}
                  onClick={() => commit(index)}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-[var(--radius-md)] px-2.5 py-2 text-sm",
                    option.disabled && "cursor-not-allowed opacity-40",
                    isActive && !option.disabled ? "bg-surface-muted text-text" : "text-text",
                  )}
                >
                  {option.icon && <span className="flex shrink-0 text-text-muted">{option.icon}</span>}
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  {isSelected && <Check size={15} strokeWidth={2.5} className="shrink-0 text-primary" />}
                </div>
              </li>
            );
          })}
        </ul>
      </Popover>
    </div>
  );
}
