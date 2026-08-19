import { useEffect, useId, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "../../lib/cn";
import { Popover } from "./Popover";

/*
  Armenian calendar picker replacing <input type="date">.

  The native control is the worst offender in the form: it renders an
  OS-chrome popup, shows `dd/mm/yyyy` in the browser's locale rather than the
  app's, and looks completely different in Chrome, Safari and Firefox.

  Dates are handled as plain `YYYY-MM-DD` strings and parsed field-by-field
  into *local* dates. Deliberately never `new Date("2026-08-17")` — that parses
  as UTC midnight, so anyone west of Greenwich gets the 16th back. The same
  rule applies on the way out: the value is rebuilt from local get*() calls,
  never from toISOString().
*/

const MONTHS = [
  "Հունվար", "Փետրվար", "Մարտ", "Ապրիլ", "Մայիս", "Հունիս",
  "Հուլիս", "Օգոստոս", "Սեպտեմբեր", "Հոկտեմբեր", "Նոյեմբեր", "Դեկտեմբեր",
];

/** Monday-first, matching how the week is written in Armenian calendars (and
 *  the 0=Monday convention StudyAvailability.preferred_days already uses). */
const WEEKDAYS = ["Երկ", "Երք", "Չրք", "Հնգ", "Ուրբ", "Շբթ", "Կիր"];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseISODate(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const [, y, mo, d] = m;
  const date = new Date(Number(y), Number(mo) - 1, Number(d));
  // Rejects impossible dates that JS would silently roll over (2026-02-31).
  return date.getMonth() === Number(mo) - 1 ? date : null;
}

export function formatArmenianDate(value: string): string {
  const d = parseISODate(value);
  if (!d) return "";
  return `${d.getDate()} ${MONTHS[d.getMonth()]}, ${d.getFullYear()}`;
}

/** Monday-first offset of the 1st of the month. */
function leadingBlanks(year: number, month: number): number {
  const jsDay = new Date(year, month, 1).getDay(); // 0=Sunday
  return (jsDay + 6) % 7;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

function addMonths(d: Date, n: number): Date {
  const target = new Date(d.getFullYear(), d.getMonth() + n, 1);
  // Clamp the day so 31 Jan + 1 month lands on 28/29 Feb, not 3 March.
  target.setDate(Math.min(d.getDate(), daysInMonth(target.getFullYear(), target.getMonth())));
  return target;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}

export function DatePicker({
  value,
  onChange,
  label,
  id,
  placeholder = "Ընտրիր ամսաթիվը",
  min,
  max,
  clearable = true,
  disabled = false,
  invalid = false,
  className,
}: {
  /** `YYYY-MM-DD`, or "" for empty. */
  value: string;
  onChange: (value: string) => void;
  label?: string;
  id?: string;
  placeholder?: string;
  min?: string;
  max?: string;
  clearable?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
}) {
  const generatedId = useId();
  const triggerId = id ?? `date-${generatedId}`;
  const gridLabelId = `${triggerId}-month`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const today = new Date();
  const selected = parseISODate(value);
  const minDate = min ? parseISODate(min) : null;
  const maxDate = max ? parseISODate(max) : null;

  // The keyboard cursor. Starts on the selection, or today when empty.
  const [cursor, setCursor] = useState<Date>(selected ?? today);

  useEffect(() => {
    if (open) setCursor(parseISODate(value) ?? new Date());
  }, [open, value]);

  // Move DOM focus with the cursor so arrow keys read out correctly.
  useEffect(() => {
    if (!open) return;
    const el = gridRef.current?.querySelector<HTMLButtonElement>('[data-cursor="true"]');
    el?.focus();
  }, [open, cursor]);

  function isDisabled(d: Date): boolean {
    if (minDate && d < minDate) return true;
    if (maxDate && d > maxDate) return true;
    return false;
  }

  function select(d: Date) {
    if (isDisabled(d)) return;
    onChange(toISODate(d));
    setOpen(false);
    triggerRef.current?.focus();
  }

  function onGridKeyDown(e: React.KeyboardEvent) {
    const moves: Record<string, () => Date> = {
      ArrowLeft: () => addDays(cursor, -1),
      ArrowRight: () => addDays(cursor, 1),
      ArrowUp: () => addDays(cursor, -7),
      ArrowDown: () => addDays(cursor, 7),
      PageUp: () => addMonths(cursor, -1),
      PageDown: () => addMonths(cursor, 1),
      Home: () => addDays(cursor, -((cursor.getDay() + 6) % 7)),
      End: () => addDays(cursor, 6 - ((cursor.getDay() + 6) % 7)),
    };

    if (moves[e.key]) {
      e.preventDefault();
      setCursor(moves[e.key]());
      return;
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      select(cursor);
    }
  }

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const blanks = leadingBlanks(year, month);
  const total = daysInMonth(year, month);
  const cells: (Date | null)[] = [
    ...Array.from({ length: blanks }, () => null),
    ...Array.from({ length: total }, (_, i) => new Date(year, month, i + 1)),
  ];

  const navButton =
    "flex h-8 w-8 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-muted hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

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
          aria-invalid={invalid || undefined}
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "flex h-11 min-w-0 flex-1 items-center justify-between gap-2 rounded-[var(--radius)] border bg-bg px-3 text-left text-sm",
            "transition-colors duration-[var(--motion-fast)] ease-[var(--ease-out)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            "disabled:cursor-not-allowed disabled:opacity-50",
            invalid ? "border-incorrect" : open ? "border-primary" : "border-border hover:border-primary/60",
          )}
        >
          <span className={cn("truncate", value ? "text-text" : "text-text-muted")}>
            {value ? formatArmenianDate(value) : placeholder}
          </span>
          <CalendarDays size={16} strokeWidth={1.75} aria-hidden className="shrink-0 text-text-muted" />
        </button>

        {clearable && value && !disabled && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="Մաքրել ամսաթիվը"
            className="flex h-11 w-9 shrink-0 items-center justify-center rounded-[var(--radius)] text-text-muted transition-colors hover:bg-surface-muted hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X size={15} strokeWidth={2} />
          </button>
        )}
      </div>

      <Popover
        open={open}
        onClose={() => setOpen(false)}
        triggerRef={triggerRef}
        labelledBy={gridLabelId}
        minWidthFromTrigger={false}
        className="p-3"
      >
        <div className="flex items-center justify-between gap-2">
          <button type="button" className={navButton} aria-label="Նախորդ ամիս" onClick={() => setCursor(addMonths(cursor, -1))}>
            <ChevronLeft size={17} strokeWidth={2} />
          </button>
          <p id={gridLabelId} aria-live="polite" className="text-sm font-semibold text-text">
            {MONTHS[month]} {year}
          </p>
          <button type="button" className={navButton} aria-label="Հաջորդ ամիս" onClick={() => setCursor(addMonths(cursor, 1))}>
            <ChevronRight size={17} strokeWidth={2} />
          </button>
        </div>

        <div className="mt-2.5 grid grid-cols-7 gap-0.5" aria-hidden="true">
          {WEEKDAYS.map((d) => (
            <span key={d} className="flex h-7 items-center justify-center text-[11px] font-medium text-text-muted">
              {d}
            </span>
          ))}
        </div>

        <div
          ref={gridRef}
          role="grid"
          aria-labelledby={gridLabelId}
          onKeyDown={onGridKeyDown}
          className="grid grid-cols-7 gap-0.5"
        >
          {cells.map((date, i) => {
            if (!date) return <span key={`blank-${i}`} aria-hidden />;
            const isSelected = selected != null && sameDay(date, selected);
            const isToday = sameDay(date, today);
            const isCursor = sameDay(date, cursor);
            const off = isDisabled(date);
            return (
              <button
                key={toISODate(date)}
                type="button"
                role="gridcell"
                data-cursor={isCursor ? "true" : undefined}
                tabIndex={isCursor ? 0 : -1}
                aria-selected={isSelected}
                aria-current={isToday ? "date" : undefined}
                disabled={off}
                onClick={() => select(date)}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-md text-[13px] tabular-nums",
                  "transition-colors duration-[var(--motion-micro)]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  "disabled:cursor-not-allowed disabled:opacity-30",
                  isSelected
                    ? "bg-primary font-semibold text-primary-contrast"
                    : isToday
                      ? "font-semibold text-primary ring-1 ring-primary/40 ring-inset"
                      : "text-text hover:bg-surface-muted",
                )}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>

        <div className="mt-2.5 flex justify-between gap-2 border-t border-border pt-2.5">
          <button
            type="button"
            onClick={() => select(new Date())}
            disabled={isDisabled(new Date())}
            className="rounded-md px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-surface-muted disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Այսօր
          </button>
          {clearable && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
                triggerRef.current?.focus();
              }}
              className="rounded-md px-2.5 py-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              Մաքրել
            </button>
          )}
        </div>
      </Popover>
    </div>
  );
}
