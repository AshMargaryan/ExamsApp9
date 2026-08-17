import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { AlertCircle, Check, Eye, EyeOff } from "lucide-react";

/*
  The text field the native auth screens are built from.

  Three things separate this from the web app's `<label> + <input>` pair, and
  all three are what make a form feel like an app rather than a page:
   - the label starts inside the field and animates up on focus/fill, so a
     56pt-tall control doesn't waste a whole line on a static caption;
   - iOS autofill is wired properly (autoComplete + the attributes that make
     the QuickType bar offer a saved password or a strong new one);
   - validity is shown on the field itself, not collected into a modal.
*/

type Props = {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  /** Shown under the field in red; also turns the border red. */
  error?: string | null;
  /** Quiet helper text, replaced by `error` when there is one. */
  hint?: string;
  /** Draws a check once the field is both non-empty and error-free. */
  showValid?: boolean;
  /** Spinner in the trailing slot — an async check is in flight for this value. */
  busy?: boolean;
  /** Renders a reveal toggle and flips the input between password/text. */
  revealable?: boolean;
  icon?: ReactNode;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & {
    type?: string;
  };

export const MobileTextField = forwardRef<HTMLInputElement, Props>(function MobileTextField(
  { label, value, onValueChange, error, hint, showValid, busy, revealable, icon, type = "text", ...rest },
  ref,
) {
  const id = useId();
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const floated = focused || value.length > 0;
  const valid = showValid && value.length > 0 && !error;
  const hasTrailing = revealable || valid || busy;
  const inputType = revealable ? (revealed ? "text" : "password") : type;

  return (
    <div className="mb-4">
      <div
        className={`relative rounded-2xl border bg-surface transition-[border-color,box-shadow] duration-200 ${
          error
            ? "border-incorrect"
            : focused
              ? "border-primary shadow-[0_0_0_4px_color-mix(in_srgb,var(--color-primary)_18%,transparent)]"
              : "border-border"
        }`}
      >
        {icon && (
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-muted">{icon}</span>
        )}

        <label
          htmlFor={id}
          className={`pointer-events-none absolute left-0 origin-left text-text-muted transition-all duration-200 ${
            icon ? "ml-11" : "ml-4"
          } ${floated ? "top-2 text-[11px] font-medium tracking-wide" : "top-1/2 -translate-y-1/2 text-[16px]"} ${
            focused && !error ? "text-primary" : ""
          } ${error ? "text-incorrect" : ""}`}
        >
          {label}
        </label>

        <input
          {...rest}
          id={id}
          ref={ref}
          type={inputType}
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          aria-invalid={Boolean(error)}
          aria-describedby={error || hint ? `${id}-desc` : undefined}
          // pt-6 leaves room for the floated label; pr-12 for the trailing icon.
          className={`w-full bg-transparent pt-6 pb-2 text-[16px] text-text outline-none ${
            icon ? "pl-11" : "pl-4"
          } ${hasTrailing ? "pr-12" : "pr-4"}`}
        />

        {revealable && (
          <button
            type="button"
            onClick={() => setRevealed((r) => !r)}
            aria-label={revealed ? "Թաքցնել գաղտնաբառը" : "Ցույց տալ գաղտնաբառը"}
            className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-text-muted active:bg-surface-muted"
          >
            {revealed ? <EyeOff size={18} strokeWidth={1.75} /> : <Eye size={18} strokeWidth={1.75} />}
          </button>
        )}
        {!revealable && busy && (
          <span
            className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-border border-t-primary"
            role="status"
            aria-label="Ստուգվում է"
          />
        )}
        {!revealable && !busy && valid && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-correct">
            <Check size={18} strokeWidth={2.5} />
          </span>
        )}
      </div>

      {(error || hint) && (
        <p
          id={`${id}-desc`}
          className={`mt-1.5 flex items-start gap-1.5 px-1 text-[12px] ${
            error ? "text-incorrect" : "text-text-muted"
          }`}
        >
          {error && <AlertCircle size={13} strokeWidth={2} className="mt-px flex-none" />}
          {error || hint}
        </p>
      )}
    </div>
  );
});
