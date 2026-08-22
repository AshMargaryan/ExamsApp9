import { useEffect, useState } from "react";
import type { DeckFormInput, FlashcardSubject } from "../../api/flashcards";
import { SUBJECTS } from "../../lib/subjects";
import { Button } from "../ui/Button";
import { Field, fieldInputClass } from "../ui/Field";
import { Modal } from "../ui/Modal";
import { cn } from "../../lib/cn";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  initial?: DeckFormInput;
  busy?: boolean;
  onSave: (input: DeckFormInput) => void;
}

/*
  Create/rename a deck.

  This was a hand-rolled `fixed inset-0` overlay: no focus trap, no Escape, no
  `aria-modal`, and a close button that was the only way out other than
  clicking the backdrop. It is on `Modal` now, which is the kit's Radix-backed
  dialog — the same one the rest of the product uses — so focus, Escape,
  scroll-locking and the native bottom-sheet treatment all come for free.

  The subject picker stays a row of buttons rather than becoming a `Select`:
  there are five subjects, they are the deck's single most defining property,
  and one tap is better than open-scroll-tap. It is a real radio group, so the
  choice is announced as a choice rather than as five unrelated buttons.
*/
export function DeckFormModal({ open, onOpenChange, title, initial, busy, onSave }: Props) {
  const [deckTitle, setDeckTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [subject, setSubject] = useState<FlashcardSubject>(initial?.subject ?? "math");
  const [error, setError] = useState<string | null>(null);

  // Reopening the dialog on a different deck must not show the previous
  // deck's values — the component stays mounted between opens.
  useEffect(() => {
    if (!open) return;
    setDeckTitle(initial?.title ?? "");
    setDescription(initial?.description ?? "");
    setSubject(initial?.subject ?? "math");
    setError(null);
    // `initial` is a fresh object literal on every render at most call sites,
    // so it is read here rather than depended on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!deckTitle.trim()) {
      setError("Վերնագիրը պարտադիր է։");
      return;
    }
    onSave({ title: deckTitle.trim(), description: description.trim(), subject });
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={title}>
      <form onSubmit={handleSubmit}>
        {/* The error lands on the field that caused it rather than in a toast
            the student has to read and then map back to a control. */}
        <Field
          label="Վերնագիր"
          value={deckTitle}
          onChange={(e) => {
            setDeckTitle(e.target.value);
            if (error) setError(null);
          }}
          placeholder="Օր.՝ Անգլերեն բառեր"
          error={error}
          autoFocus
        />

        <Field label="Նկարագրություն" hint="Կամընտիր">
          {(props) => (
            <textarea
              {...props}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className={cn(fieldInputClass, "resize-none")}
            />
          )}
        </Field>

        <fieldset className="mb-[var(--space-6)]">
          <legend className="mb-[var(--space-2)] text-[length:var(--text-sm)] font-medium text-text">
            Առարկա
          </legend>
          <div role="radiogroup" aria-label="Առարկա" className="grid grid-cols-2 gap-[var(--space-2)]">
            {SUBJECTS.map(({ key, label, Icon }) => {
              const selected = subject === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setSubject(key)}
                  className={cn(
                    "flex items-center gap-[var(--space-2)] rounded-[var(--radius-md)] border",
                    "px-[var(--space-3)] py-[var(--space-2)] text-[length:var(--text-sm)] font-medium",
                    "transition-colors duration-[var(--motion-fast)]",
                    selected
                      ? "border-primary bg-primary text-primary-contrast"
                      : "border-border text-text hover:border-primary",
                  )}
                >
                  <Icon size={15} strokeWidth={1.75} aria-hidden className="shrink-0" />
                  {/* Not truncated: "Կենսաբանություն" does not fit a half-width
                      cell, and a subject the student cannot read the name of
                      is not a choice they can make. The row grows instead. */}
                  <span className="min-w-0 text-left">{label}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <Button type="submit" loading={busy} className="w-full">
          Պահպանել
        </Button>
      </form>
    </Modal>
  );
}
