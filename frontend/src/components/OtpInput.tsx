import { useId, useRef } from "react";
import type { ClipboardEvent, KeyboardEvent } from "react";
import { cn } from "../lib/cn";

/*
  Six one-character boxes that behave like one field.

  What they did not do before:

  - **carry a name.** Six `<input>`s with no label, no `aria-label` and no
    grouping, so assistive tech announced six unnamed textboxes in a row and
    the visible "Հաստատման կոդ" above them was loose text pointing at
    nothing. They are a labelled `role="group"` now, and each box says which
    digit it is.
  - **accept the emailed code from the browser.** Without
    `autocomplete="one-time-code"` neither Safari nor Chrome offers it, so
    the student on the web had to copy the code by hand — the one screen
    where the platform will do it for you.
  - **submit themselves.** The native screen submits when the sixth digit
    lands; on the web you typed six digits and then hunted for a button.
    `onComplete` closes that gap without changing the button's behaviour.

  `required` was also on all six boxes. It never fired, because the submit
  button is disabled below six digits — but if it ever had, the browser
  would have popped its own validation bubble, in the *browser's* language,
  in the middle of an Armenian form. Same defect class as the native file
  input; removed for the same reason.
*/

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  /** Fires once the last box is filled — with the complete value. */
  onComplete?: (value: string) => void;
  /** Visible label for the group. */
  label: string;
  /** Paints the boxes as rejected and sets `aria-invalid` on the group. */
  invalid?: boolean;
  autoFocus?: boolean;
  disabled?: boolean;
}

export function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  label,
  invalid,
  autoFocus,
  disabled,
}: OtpInputProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const labelId = useId();
  const digits = Array.from({ length }, (_, i) => value[i] ?? "");

  function commit(next: string) {
    const trimmed = next.slice(0, length);
    onChange(trimmed);
    if (trimmed.length === length && !trimmed.includes(" ")) onComplete?.(trimmed);
  }

  function setDigitAt(index: number, digit: string) {
    const next = digits.slice();
    next[index] = digit;
    commit(next.join(""));
  }

  function handleChange(index: number, raw: string) {
    const digit = raw.replace(/\D/g, "").slice(-1);
    setDigitAt(index, digit);
    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (digits[index]) {
        setDigitAt(index, "");
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
        setDigitAt(index - 1, "");
      }
      e.preventDefault();
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
      e.preventDefault();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
      e.preventDefault();
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    e.preventDefault();
    commit(pasted);
    inputRefs.current[Math.min(pasted.length, length - 1)]?.focus();
  }

  return (
    <div className="mb-[var(--space-4)]">
      <span id={labelId} className="mb-[var(--space-2)] block text-[length:var(--text-sm)] font-medium text-text">
        {label}
      </span>
      <div
        role="group"
        aria-labelledby={labelId}
        aria-invalid={invalid ? true : undefined}
        className="flex justify-center gap-2"
      >
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            className={cn(
              "h-12 w-10 rounded-[var(--radius-md)] border bg-bg text-center",
              "text-[length:var(--text-lg)] tabular-nums text-text",
              "transition-colors duration-[var(--motion-fast)]",
              invalid ? "border-incorrect" : "border-border focus:border-primary",
            )}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            aria-label={`${label} — ${index + 1}-ին նիշը`}
            inputMode="numeric"
            // Only the first box claims the one-time-code slot; repeating it
            // on all six makes browsers fill the whole code into each box.
            autoComplete={index === 0 ? "one-time-code" : "off"}
            maxLength={1}
            autoFocus={autoFocus && index === 0}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}
