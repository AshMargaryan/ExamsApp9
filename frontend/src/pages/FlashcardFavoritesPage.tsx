import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  flagCard, listFavoriteCards, type FavoriteCardEntry, type FlashcardSubject,
} from "../api/flashcards";
import { MathText } from "../components/MathText";
import { extractErrorMessage, useToast } from "../context/ToastContext";
import { SUBJECTS } from "../lib/subjects";

export function FlashcardFavoritesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const subject = (searchParams.get("subject") as FlashcardSubject | null) ?? SUBJECTS[0].key;
  const [entries, setEntries] = useState<FavoriteCardEntry[] | null>(null);
  const [busyCardId, setBusyCardId] = useState<number | null>(null);
  const { showError } = useToast();

  useEffect(() => {
    setEntries(null);
    listFavoriteCards(subject)
      .then(setEntries)
      .catch((err) => showError(extractErrorMessage(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject]);

  async function unfavorite(cardId: number) {
    setBusyCardId(cardId);
    try {
      await flagCard(cardId, { favorite: false });
      setEntries((prev) => (prev ? prev.filter((e) => e.card.id !== cardId) : prev));
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setBusyCardId(null);
    }
  }

  const activeSubject = SUBJECTS.find((s) => s.key === subject) ?? SUBJECTS[0];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link to="/flashcards" className="btn-fx mb-4 inline-block rounded-full px-1.5 py-0.5 text-sm text-primary hover:underline">
        ← Բառաքարտեր
      </Link>
      <h1 className="mb-1 text-3xl font-semibold text-text">
        ⭐ Ընտրյալներ · {activeSubject.icon} {activeSubject.label}
      </h1>
      <p className="mb-6 text-sm text-text-muted">
        {activeSubject.label} առարկայից ընտրյալ նշված քարտերը՝ մեկ տեղում։
      </p>

      <div className="mb-6 flex flex-wrap gap-2">
        {SUBJECTS.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setSearchParams({ subject: s.key })}
            aria-pressed={subject === s.key}
            className={`btn-fx flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
              subject === s.key
                ? "border-primary bg-primary text-primary-contrast shadow-[var(--shadow-sm)]"
                : "border-border text-text hover:border-primary"
            }`}
          >
            <span aria-hidden>{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>

      {entries === null ? (
        <div className="flex flex-col gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-[var(--radius)] border border-border bg-surface" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center rounded-[var(--radius)] border border-dashed border-border bg-surface p-10 text-center text-text-muted">
          <span className="mb-3 text-3xl" aria-hidden>⭐</span>
          {activeSubject.label} առարկայից դեռ ընտրյալ քարտեր չկան։ Ուսումնասիրելիս սեղմիր ⭐-ի վրա՝ քարտը այստեղ պահելու համար։
        </div>
      ) : (
        <div key={subject} className="flex flex-col gap-3 animate-[slide-up-in_var(--motion-normal)_var(--ease-out)]">
          {entries.map(({ card, deck }) => (
            <div
              key={card.id}
              className="flex items-start justify-between gap-4 rounded-[var(--radius)] border border-border bg-surface p-4 shadow-[var(--shadow-sm)] transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-[var(--shadow-md)]"
            >
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <Link
                    to={`/flashcards/${deck.id}`}
                    className="text-xs font-medium tracking-wide text-primary uppercase hover:underline"
                  >
                    {deck.title}
                  </Link>
                </div>
                <div className="flex items-baseline gap-2">
                  <MathText text={card.front_text} className="text-lg font-medium text-text" />
                  {card.translation && (
                    <span className="text-base text-primary">{card.translation}</span>
                  )}
                </div>
                <div className="mt-1 text-sm text-text-muted">
                  <MathText text={card.back_text} />
                </div>
              </div>
              <button
                type="button"
                disabled={busyCardId === card.id}
                onClick={() => unfavorite(card.id)}
                title="Հանել ընտրյալներից"
                className="btn-icon-fx flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary bg-primary text-primary-contrast transition-colors hover:bg-primary-hover disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                ⭐
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
