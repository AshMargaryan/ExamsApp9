import { useEffect, useId, useRef, useState } from "react";
import { Clock, X } from "lucide-react";
import { cn } from "../../lib/cn";
import { Popover } from "./Popover";

/*
  Hour/minute picker replacing <input type="time">.

  Same reason as the date picker: the native control brings its own OS chrome,
  its own locale (a 12-hour AM/PM field appears for some users on a 24-hour
  app), and a spinner that is genuinely hard to use on a phone.

  Two columns instead of a free-text field because the value is coarse by
  nature — "when do you usually start studying" is a 5-minute-resolution
  question, and a list you scroll beats a field you can typo.
*/

const MINUTE_STEP = 5;
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 / MINUTE_STEP }, (_, i) => i * MINUTE_STEP);

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Accepts "HH:MM" and Django's "HH:MM:SS", which the API returns. */
function parseTime(value: string): { hour: number; minute: number } | null {
  const m = /^(\d{1,2}):(\d{2})/.exec(value);
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

export function formatTime(value: string): string {
  const t = parseTime(value);
  return t ? `${pad(t.hour)}:${pad(t.minute)}` : "";
}

function Column({
  values,
  selected,
  onSelect,
  label,
  format,
}: {
  values: number[];
  selected: number | null;
  onSelect: (value: number) => void;
  label: string;
  format: (n: number) => string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Open with the current value in view rather than at midnight.
  useEffect(() => {
    const el = ref.current?.querySelector<HTMLElement>('[data-selected="true"]');
    el?.scrollIntoView({ block: "center" });
  }, []);

  return (
    <div className="flex min-w-0 flex-col">
      <p className="mb-1 px-1 text-[10.5px] font-semibold tracking-[0.08em] text-text-muted">{label}</p>
      <div
        ref={ref}
        role="listbox"
        aria-label={label}
        className="max-h-[196px] w-[68px] overflow-y-auto overscroll-contain rounded-md [scrollbar-width:thin]"
      >
        {values.map((v) => {
          const isSelected = v === selected;
          return (
            <button
              key={v}
              type="button"
              role="option"
              aria-selected={isSelected}
              data-selected={isSelected ? "true" : undefined}
              onClick={() => onSelect(v)}
              className={cn(
                "block w-full rounded-md px-2 py-1.5 text-center text-sm tabular-nums transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                isSelected
                  ? "bg-primary font-semibold text-primary-contrast"
                  : "text-text hover:bg-surface-muted",
              )}
            >
              {format(v)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function TimePicker({
  value,
  onChange,
  label,
  id,
  placeholder = "Ընտրիր ժամը",
  clearable = true,
  disabled = false,
  className,
}: {
  /** "HH:MM" (also tolerates "HH:MM:SS" from the API), or "" for empty. */
  value: string;
  onChange: (value: string) => void;
  label?: string;
  id?: string;
  placeholder?: string;
  clearable?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const generatedId = useId();
  const triggerId = id ?? `time-${generatedId}`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  const parsed = parseTime(value);
  const hour = parsed?.hour ?? null;
  const minute = parsed?.minute ?? null;

  function commit(nextHour: number | null, nextMinute: number | null) {
    // Picking one column before the other shouldn't produce an empty value —
    // the unset half defaults so the control always emits something valid.
    const h = nextHour ?? hour ?? 0;
    const m = nextMinute ?? minute ?? 0;
    onChange(`${pad(h)}:${pad(m)}`);
  }

  return (
    <div className={cn("relative", className)}>
      <div className="flex items-center gap-1.5">
        <button
          ref={triggerRef}
          id={triggerId}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={label}
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "flex h-11 min-w-0 flex-1 items-center justify-between gap-2 rounded-[var(--radius)] border bg-bg px-3 text-left text-sm",
            "transition-colors duration-[var(--motion-fast)] ease-[var(--ease-out)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            "disabled:cursor-not-allowed disabled:opacity-50",
            open ? "border-primary" : "border-border hover:border-primary/60",
          )}
        >
          <span className={cn("truncate tabular-nums", parsed ? "text-text" : "text-text-muted")}>
            {parsed ? formatTime(value) : placeholder}
          </span>
          <Clock size={16} strokeWidth={1.75} aria-hidden className="shrink-0 text-text-muted" />
        </button>

        {clearable && parsed && !disabled && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="Մաքրել ժամը"
            className="flex h-11 w-9 shrink-0 items-center justify-center rounded-[var(--radius)] text-text-muted transition-colors hover:bg-surface-muted hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X size={15} strokeWidth={2} />
          </button>
        )}
      </div>

      <Popover open={open} onClose={() => setOpen(false)} triggerRef={triggerRef} minWidthFromTrigger={false} className="p-2.5">
        <div className="flex gap-2">
          <Column
            label="ԺԱՄ"
            values={HOURS}
            selected={hour}
            format={pad}
            onSelect={(h) => commit(h, minute)}
          />
          <Column
            label="ՐՈՊԵ"
            values={MINUTES}
            selected={minute}
            format={pad}
            onSelect={(m) => commit(hour, m)}
          />
        </div>
        <div className="mt-2 flex justify-end border-t border-border pt-2">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              triggerRef.current?.focus();
            }}
            className="rounded-md px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Պատրաստ է
          </button>
        </div>
      </Popover>
    </div>
  );
}
