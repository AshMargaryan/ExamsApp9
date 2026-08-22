import { useEffect, useRef } from "react";

/*
  The code field for email verification.

  The web OtpInput renders six separate <input>s, which on iOS means six
  focus changes, six keyboard re-anchors, and a SMS/email autofill that only
  ever fills the first box. This uses the pattern native apps use instead:
  one real (invisible) input holding the whole code, with six drawn cells on
  top of it. Autofill, paste, and the delete key then all behave normally,
  because there is only one field for them to act on.
*/

interface Props {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  autoFocus?: boolean;
}

export function NativeOtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled,
  invalid,
  autoFocus,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const completedFor = useRef<string | null>(null);

  useEffect(() => {
    if (value.length === length && completedFor.current !== value) {
      completedFor.current = value;
      onComplete?.(value);
    }
    if (value.length < length) completedFor.current = null;
  }, [value, length, onComplete]);

  const cells = Array.from({ length }, (_, i) => value[i] ?? "");
  // The cell that will receive the next digit, so exactly one cell shows a caret.
  const activeIndex = Math.min(value.length, length - 1);

  return (
    <div
      className="relative"
      onClick={() => inputRef.current?.focus()}
      role="presentation"
    >
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, length))}
        inputMode="numeric"
        // The pair iOS looks for to offer the emailed code from the QuickType
        // bar instead of making the user switch to Mail and memorise it.
        autoComplete="one-time-code"
        maxLength={length}
        disabled={disabled}
        autoFocus={autoFocus}
        aria-label="Հաստատման կոդ"
        // Invisible but genuinely focused: opacity-0 rather than display:none,
        // which would make it unfocusable and kill the keyboard entirely.
        className="absolute inset-0 h-full w-full cursor-default opacity-0"
      />
      <div className="flex justify-between gap-2" aria-hidden>
        {cells.map((digit, i) => {
          const filled = digit !== "";
          const active = !disabled && i === activeIndex && value.length < length;
          return (
            <div
              key={i}
              className={`flex h-16 flex-1 items-center justify-center rounded-[var(--radius-xl)] border text-[26px] font-semibold tabular-nums transition-all duration-200 ${
                invalid
                  ? "border-incorrect bg-incorrect-bg text-incorrect"
                  : filled
                    ? "border-primary bg-primary/10 text-text"
                    : active
                      ? "border-primary bg-surface text-text shadow-[0_0_0_4px_color-mix(in_srgb,var(--color-primary)_16%,transparent)]"
                      : "border-border bg-surface text-text"
              }`}
            >
              {digit || (active ? <span className="h-7 w-px animate-pulse bg-primary" /> : "")}
            </div>
          );
        })}
      </div>
    </div>
  );
}
