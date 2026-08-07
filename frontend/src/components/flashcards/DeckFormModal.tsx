import { useState } from "react";
import type { DeckFormInput, FlashcardSubject } from "../../api/flashcards";

const SUBJECTS: { key: FlashcardSubject; label: string }[] = [
  { key: "math", label: "Մաթեմատիկա" },
  { key: "physics", label: "Ֆիզիկա" },
  { key: "biology", label: "Կենսաբանություն" },
  { key: "chemistry", label: "Քիմիա" },
  { key: "english", label: "Անգլերեն" },
];

interface Props {
  title: string;
  initial?: DeckFormInput;
  busy?: boolean;
  onSave: (input: DeckFormInput) => void;
  onClose: () => void;
}

export function DeckFormModal({ title, initial, busy, onSave, onClose }: Props) {
  const [deckTitle, setDeckTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [subject, setSubject] = useState<FlashcardSubject>(initial?.subject ?? "math");
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    if (!deckTitle.trim()) {
      setError("Վերնագիրը պարտադիր է։");
      return;
    }
    onSave({ title: deckTitle.trim(), description: description.trim(), subject });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-md rounded-[var(--radius)] border border-border bg-surface p-8 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Փակել"
          className="absolute top-3 right-3 text-lg text-text-muted transition-colors hover:text-text"
        >
          ✕
        </button>

        <h2 className="mb-6 text-xl font-semibold text-text">{title}</h2>

        <label className="mb-1.5 block text-sm font-medium text-text">Վերնագիր</label>
        <input
          value={deckTitle}
          onChange={(e) => setDeckTitle(e.target.value)}
          placeholder="Օր.՝ Անգլերեն բառեր"
          className="mb-4 w-full rounded-md border border-border bg-bg px-3 py-2 text-text focus:border-primary focus:outline-none"
        />

        <label className="mb-1.5 block text-sm font-medium text-text">Նկարագրություն (կամընտիր)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="mb-4 w-full resize-none rounded-md border border-border bg-bg px-3 py-2 text-text focus:border-primary focus:outline-none"
        />

        <label className="mb-1.5 block text-sm font-medium text-text">Առարկա</label>
        <div className="mb-6 grid grid-cols-2 gap-2">
          {SUBJECTS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setSubject(s.key)}
              className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                subject === s.key
                  ? "border-primary bg-primary text-primary-contrast"
                  : "border-border text-text hover:border-primary"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {error && <p className="mb-4 text-sm text-incorrect">{error}</p>}

        <button
          type="button"
          disabled={busy}
          onClick={handleSave}
          className="w-full rounded-md bg-primary py-2.5 text-lg font-medium text-primary-contrast transition-colors hover:bg-primary-hover disabled:opacity-60"
        >
          {busy ? "Պահպանվում է..." : "Պահպանել"}
        </button>
      </div>
    </div>
  );
}
