import { useId, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Eye, EyeOff, TriangleAlert } from "lucide-react";
import { cn } from "../../lib/cn";

/*
  A labelled form field.

  Why this exists
  ---------------
  Every form in the app wrote this by hand, and every one of them made the
  same two mistakes:

      <label className="mb-1 block text-sm text-text-muted">Օգտանուն</label>
      <input className="mb-4 w-full rounded-md border …" value={…} required />

  1. **The label is not attached to the input.** No `htmlFor`, no `id`. So
     tapping the label does nothing — which matters most on a phone, where
     the label is often the easier target — and a screen reader announces an
     unnamed textbox with the label read separately as loose text.
  2. **There is nowhere for an error to go.** With no per-field error slot,
     every form pushed its validation into a modal instead: the login page
     opened a full overlay to say "wrong password", and registration opened
     one to say the password was too short. Dismissing a modal to get back to
     the field you must fix is two actions the person did not need.

  `error` renders beneath the field, wires up `aria-describedby` and
  `aria-invalid`, and marks the border — so the message sits next to the thing
  that caused it, which is the whole point.

  `hint` is described too, so a requirement like "at least 8 characters" is
  announced *before* the person types rather than reported back as a failure
  afterwards.

  `children` is a render prop rather than a node because the wiring — the id
  the label points at, the description ids, the invalid flag — has to reach
  whatever control the caller supplies, or a custom control silently loses
  its label.
*/

export interface FieldControlProps {
  id: string;
  "aria-describedby": string | undefined;
  "aria-invalid": true | undefined;
  className: string;
}

export interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "children"> {
  label: string;
  /** Requirements or context. Announced with the field, not after it fails. */
  hint?: ReactNode;
  /** Validation message. Presence also sets aria-invalid. */
  error?: string | null;
  /** Supply a custom control (a select, a combobox) instead of an <input>. */
  children?: (props: FieldControlProps) => ReactNode;
  containerClassName?: string;
}

/*
  `outline-none` used to sit here, which meant a keyboard user moving through
  a form watched the indicator change character halfway: buttons, links and
  the section nav draw the global 2px primary ring from theme.css, and then
  the text inputs drew nothing but a 1px border recolour. The global rule is
  written with `:where()` so it has zero specificity — any utility beats it,
  and `outline-none` did.

  The border recolour stays, because it marks the field itself rather than a
  ring around it, but the ring is no longer suppressed. One focus treatment
  across every control the student can land on.
*/
export const fieldInputClass = cn(
  "w-full rounded-[var(--radius-md)] border border-border bg-bg",
  "px-[var(--space-3)] py-[var(--space-2)] text-text",
  "transition-colors focus:border-primary",
  "disabled:cursor-not-allowed disabled:opacity-60",
);

export function Field({
  label,
  hint,
  error,
  children,
  className,
  containerClassName,
  ...inputProps
}: FieldProps) {
  const generatedId = useId();
  const id = `field-${generatedId}`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  const controlProps: FieldControlProps = {
    id,
    "aria-describedby": [hintId, errorId].filter(Boolean).join(" ") || undefined,
    "aria-invalid": error ? true : undefined,
    className: cn(fieldInputClass, error && "border-incorrect focus:border-incorrect", className),
  };

  return (
    <div className={cn("mb-[var(--space-4)]", containerClassName)}>
      <label
        htmlFor={id}
        className="mb-[var(--space-1)] block text-[length:var(--text-sm)] font-medium text-text"
      >
        {label}
      </label>

      {children ? children(controlProps) : <input {...inputProps} {...controlProps} />}

      {hint && (
        <p id={hintId} className="mt-[var(--space-1)] text-[length:var(--text-xs)] text-text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p
          id={errorId}
          className="mt-[var(--space-1)] flex items-start gap-[var(--space-1)] text-[length:var(--text-xs)] font-medium text-incorrect"
        >
          <TriangleAlert size={13} strokeWidth={2} aria-hidden="true" className="mt-[1px] shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

/*
  A password field with a reveal toggle.

  Typing a password blind is the most common reason a correct password gets
  rejected, and it is worst on a phone with an Armenian keyboard layout in
  play. The toggle is a real `aria-pressed` button so its state is announced,
  and `tabIndex={-1}` so it does not sit between the password field and the
  submit button in the tab order.
*/
export function PasswordField({
  label,
  hint,
  error,
  value,
  onChange,
  autoComplete,
  required,
  minLength,
  autoFocus,
  name,
}: {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
  autoFocus?: boolean;
  name?: string;
}) {
  const [revealed, setRevealed] = useState(false);

  return (
    <Field label={label} hint={hint} error={error}>
      {(control) => (
        <div className="relative">
          <input
            {...control}
            type={revealed ? "text" : "password"}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            autoComplete={autoComplete}
            required={required}
            minLength={minLength}
            autoFocus={autoFocus}
            name={name}
            className={cn(control.className, "pr-11")}
          />
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            tabIndex={-1}
            aria-pressed={revealed}
            aria-label={revealed ? "Թաքցնել գաղտնաբառը" : "Ցույց տալ գաղտնաբառը"}
            title={revealed ? "Թաքցնել գաղտնաբառը" : "Ցույց տալ գաղտնաբառը"}
            className="absolute right-[var(--space-1)] top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-[var(--radius-md)] text-text-muted transition-colors hover:text-text"
          >
            {revealed ? <EyeOff size={17} strokeWidth={1.75} /> : <Eye size={17} strokeWidth={1.75} />}
          </button>
        </div>
      )}
    </Field>
  );
}

/*
  A form-level message — for the things that are not any one field's fault
  ("that username is taken", "we could not reach the server").

  Deliberately not a modal. Login used to open a full overlay to say the
  password was wrong, which meant dismissing a dialog before you could reach
  the field you had to fix. `role="alert"` means it is announced without one.
*/
export function FormAlert({
  message,
  suggestions,
  onSelectSuggestion,
}: {
  message: string;
  /** e.g. alternative usernames the server proposed. */
  suggestions?: string[];
  onSelectSuggestion?: (value: string) => void;
}) {
  return (
    <div
      role="alert"
      className="mb-[var(--space-4)] rounded-[var(--radius-md)] border border-incorrect bg-incorrect-bg p-[var(--space-3)]"
    >
      <p className="flex items-start gap-[var(--space-2)] text-[length:var(--text-sm)] font-medium text-incorrect">
        <TriangleAlert size={15} strokeWidth={2} aria-hidden="true" className="mt-[2px] shrink-0" />
        <span>{message}</span>
      </p>
      {suggestions && suggestions.length > 0 && onSelectSuggestion && (
        <div className="mt-[var(--space-2)] flex flex-wrap gap-[var(--space-2)]">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSelectSuggestion(s)}
              className="rounded-[var(--radius-full)] border border-incorrect bg-surface px-[var(--space-3)] py-[2px] text-[length:var(--text-xs)] font-medium text-text hover:bg-surface-muted"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
