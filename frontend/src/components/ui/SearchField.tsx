import { useId, type InputHTMLAttributes } from "react";
import { Search, X } from "lucide-react";
import { cn } from "../../lib/cn";
import { fieldInputClass } from "./Field";

/*
  A search box.

  Why this exists
  ---------------
  Six surfaces had hand-rolled one — chat, the assistant's conversation list,
  notes, mock exams, the assignment picker and the friend finder — and no two
  agreed. They used four different radii (`rounded-full`, `rounded-md`,
  `rounded-[var(--radius)]`, `rounded-[var(--radius-md)]`), three different
  grounds (`bg-bg`, `bg-surface`, `bg-surface-muted`), and three different
  left paddings for the same 16px magnifier. Two of them also carried
  `outline-none`, which is the one thing a control must never do: it removes
  the global focus ring from theme.css and leaves a keyboard user with nothing
  but a 1px border recolour.

  Two things this adds that none of the six had:

  1. **A way out of the search.** Clearing a query meant holding backspace.
     There is now a clear button, which is where the thumb already is on a
     phone, and it returns focus to the field so the next query can be typed
     immediately.
  2. **A name.** Three of the six had only a placeholder, and a placeholder
     disappears the moment you type — so a screen-reader user tabbing back to
     a filled field heard an unnamed textbox.

  `type="search"` is deliberate (Enter submits, iOS shows a Search key) but
  WebKit's own clear affordance is suppressed: we draw one that is the right
  size for a finger and reads in both themes. The clear button spans the
  field's full height rather than carrying `.tap-target` — that utility sets
  `position: relative` from an unlayered rule, which beats Tailwind's
  `.absolute` and would drop the button back into the text flow beside the
  magnifier.
*/
export function SearchField({
  value,
  onChange,
  label,
  className,
  containerClassName,
  inputRef,
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type" | "children"> & {
  value: string;
  onChange: (value: string) => void;
  /** Accessible name, in Armenian. A placeholder is not a name. */
  label: string;
  containerClassName?: string;
  inputRef?: React.Ref<HTMLInputElement>;
}) {
  const id = `search-${useId()}`;

  return (
    <div className={cn("relative", containerClassName)}>
      <Search
        size={16}
        strokeWidth={1.75}
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-[var(--space-3)] -translate-y-1/2 text-text-muted"
      />
      <input
        {...rest}
        ref={inputRef}
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className={cn(
          fieldInputClass,
          "appearance-none pl-[var(--space-8)] [&::-webkit-search-cancel-button]:hidden",
          value && "pr-[var(--space-8)]",
          className,
        )}
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            onChange("");
            document.getElementById(id)?.focus();
          }}
          aria-label="Մաքրել որոնումը"
          className="absolute inset-y-0 right-0 flex w-[var(--space-8)] items-center justify-center rounded-r-[var(--radius-md)] text-text-muted transition-colors hover:text-text"
        >
          <X size={15} strokeWidth={2} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
