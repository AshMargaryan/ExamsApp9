import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Star } from "lucide-react";
import {
  flagCard, listFavoriteCards, type FavoriteCardEntry, type FlashcardSubject,
} from "../api/flashcards";
import { MathText } from "../components/MathText";
import { extractErrorMessage, useToast } from "../context/ToastContext";
import { SUBJECTS } from "../lib/subjects";
import { LinkButton } from "../components/ui/LinkButton";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { LoadingRegion, Skeleton } from "../components/ui/Skeleton";

export function FlashcardFavoritesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const subject = (searchParams.get("subject") as FlashcardSubject | null) ?? SUBJECTS[0].key;
  const [entries, setEntries] = useState<FavoriteCardEntry[] | null>(null);
  const [busyCardId, setBusyCardId] = useState<number | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const { showError } = useToast();

  const [loadFailed, setLoadFailed] = useState(false);

  // The failure used to be reported through a toast while `entries` stayed
  // null, so once the toast had gone the page sat on skeletons for ever with
  // nothing explaining why. A toast is not an error state for a whole list.
  useEffect(() => {
    setEntries(null);
    setLoadFailed(false);
    listFavoriteCards(subject).then(setEntries).catch(() => setLoadFailed(true));
  }, [subject, reloadKey]);

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
      <LinkButton to="/flashcards" className="btn-fx mb-4 rounded-full px-1.5 py-0.5">← Բառաքարտեր</LinkButton>
      <h1 className="mb-1 flex items-center gap-[var(--space-2)] font-display text-[length:var(--text-3xl)] leading-[var(--leading-display)] font-semibold tracking-[var(--tracking-tight)] text-text">
        <Star size={22} strokeWidth={1.75} aria-hidden className="shrink-0 text-accent" />
        Ընտրյալներ · {activeSubject.label}
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
            <s.Icon size={15} strokeWidth={1.75} aria-hidden />
            {s.label}
          </button>
        ))}
      </div>

      {loadFailed ? (
        <ErrorState
          title="Ընտրյալ քարտերը չհաջողվեց բեռնել։"
          hint="Ստուգիր կապը և փորձիր կրկին։"
          onRetry={() => setReloadKey((k) => k + 1)}
        />
      ) : entries === null ? (
        <LoadingRegion>
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </LoadingRegion>
      ) : entries.length === 0 ? (
        /* The ⭐ here was an emoji standing in for a control that is a lucide
           star, so the empty state pointed at a glyph the page does not
           contain. */
        <EmptyState
          icon={<Star size={26} strokeWidth={1.5} aria-hidden />}
          title={`${activeSubject.label} առարկայից դեռ ընտրյալ քարտեր չկան։`}
          hint="Քարտը ուսումնասիրելիս սեղմիր աստղիկը՝ այստեղ պահելու համար։"
        />
      ) : (
        <div key={subject} className="flex flex-col gap-3 animate-[slide-up-in_var(--motion-normal)_var(--ease-out)]">
          {entries.map(({ card, deck }) => (
            <div
              key={card.id}
              className="flex items-start justify-between gap-4 rounded-[var(--radius)] border border-border bg-surface p-4 shadow-[var(--shadow-sm)] transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-[var(--shadow-md)]"
            >
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <LinkButton
                    to={`/flashcards/${deck.id}`}
                    variant="ghost"
                    className="h-6 px-2 text-xs tracking-wide"
                  >
                    {deck.title}
                  </LinkButton>
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
