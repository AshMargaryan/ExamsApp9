import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Star } from "lucide-react";
import {
  createDeck, deleteDeck, duplicateDeck, listFlashcardDecks, listMyDecks,
  type FlashcardDeckSummary, type FlashcardSubject,
} from "../api/flashcards";
import { SegmentedControl } from "../components/SegmentedControl";
import { DeckFormModal } from "../components/flashcards/DeckFormModal";
import { DeckProgressRing } from "../components/flashcards/DeckProgressRing";
import { Button } from "../components/ui/Button";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { LinkButton } from "../components/ui/LinkButton";
import { PageHeader } from "../components/ui/PageHeader";
import { Skeleton } from "../components/ui/Skeleton";
import { extractErrorMessage, useToast } from "../context/ToastContext";
import { SUBJECTS, subjectMeta } from "../lib/subjects";
import { cn } from "../lib/cn";

type Tab = "library" | "mine";

const TAB_OPTIONS: { value: Tab; label: string }[] = [
  { value: "library", label: "Գրադարան" },
  { value: "mine", label: "Իմ փաթեթները" },
];

function DeckCard({
  deck, onStudy, extraActions,
}: {
  deck: FlashcardDeckSummary;
  onStudy: () => void;
  extraActions?: React.ReactNode;
}) {
  const subject = subjectMeta(deck.subject);

  return (
    <div className="group flex flex-col justify-between rounded-[var(--radius)] border border-border bg-surface p-5 shadow-[var(--shadow-sm)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/60 hover:shadow-[var(--shadow-md)]">
      <div>
        {subject && (
          <span className="mb-2 inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-0.5 text-xs font-medium tracking-wide text-text-muted uppercase">
            <span aria-hidden>{subject.icon}</span>
            {subject.label}
          </span>
        )}
        <h3 className="mb-3 text-lg leading-snug font-semibold text-text">{deck.title}</h3>

        <div className="mb-4 flex items-center gap-4">
          <DeckProgressRing known={deck.known_count} learning={deck.learning_count} total={deck.card_count} />
          <div className="min-w-0 text-sm">
            <p className="mb-1.5 font-medium text-text">{deck.card_count} քարտ</p>
            <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-text-muted">
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Գիտեմ՝ {deck.known_count}
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-primary/40" /> Սովորում եմ՝ {deck.learning_count}
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-surface-muted ring-1 ring-border" /> Նոր՝ {deck.new_count}
              </span>
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-[var(--space-3)]">
        {/*
          "Սովորել" vs "Կրկնել N քարտ": in spaced repetition these are
          different acts, and the count of cards actually due is the only
          number that tells the student whether opening this deck is worth it
          right now. It used to be a small badge inside the button.
        */}
        <Button onClick={onStudy} className="w-full justify-center">
          {deck.due_count > 0 ? `Կրկնել ${deck.due_count} քարտ` : "Սովորել"}
        </Button>
        {extraActions}
      </div>
    </div>
  );
}

function DeckCardSkeleton() {
  return (
    <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-[var(--space-5)]">
      <Skeleton className="h-4 w-20 rounded-full" />
      <Skeleton className="mt-[var(--space-3)] h-5 w-3/4" />
      <div className="mt-[var(--space-4)] flex items-center gap-[var(--space-4)]">
        <Skeleton className="h-14 w-14 shrink-0 rounded-full" />
        <div className="flex-1 space-y-[var(--space-2)]">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
      <Skeleton className="mt-[var(--space-5)] h-10 w-full rounded-full" />
    </div>
  );
}

export function FlashcardsPage() {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>(() => (searchParams.get("tab") === "mine" ? "mine" : "library"));
  const [subject, setSubject] = useState<FlashcardSubject>(() => {
    const s = searchParams.get("subject");
    return SUBJECTS.some((x) => x.key === s) ? (s as FlashcardSubject) : "math";
  });
  const [libraryDecks, setLibraryDecks] = useState<FlashcardDeckSummary[] | null>(null);
  const [myDecks, setMyDecks] = useState<FlashcardDeckSummary[] | null>(null);

  const [showCreateDeck, setShowCreateDeck] = useState(() => searchParams.get("create") === "1");
  const [deleteTarget, setDeleteTarget] = useState<FlashcardDeckSummary | null>(null);
  const [busy, setBusy] = useState(false);

  const [libraryError, setLibraryError] = useState(false);
  const [myDecksError, setMyDecksError] = useState(false);

  function loadLibrary() {
    setLibraryDecks(null);
    setLibraryError(false);
    // Without the catch, a failed request left the skeleton grid shimmering
    // forever with no explanation and no way to retry.
    listFlashcardDecks(subject).then(setLibraryDecks).catch(() => setLibraryError(true));
  }

  useEffect(() => {
    if (tab !== "library") return;
    loadLibrary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, subject]);

  function loadMyDecks() {
    setMyDecks(null);
    setMyDecksError(false);
    listMyDecks().then(setMyDecks).catch(() => setMyDecksError(true));
  }

  useEffect(() => {
    if (tab === "mine") loadMyDecks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // Spaced repetition only works if the student comes back on the day cards
  // fall due, so "how much is due right now, and where" is the question this
  // page exists to answer. It was answerable only by reading a badge on each
  // of N deck buttons and adding them up.
  const visibleDecks = tab === "library" ? libraryDecks : myDecks;
  const dueSummary = useMemo(() => {
    const decks = (visibleDecks ?? []).filter((d) => d.due_count > 0);
    return {
      decks,
      cards: decks.reduce((sum, d) => sum + d.due_count, 0),
    };
  }, [visibleDecks]);

  async function handleCreateDeck(input: { title: string; description?: string; subject: FlashcardSubject }) {
    setBusy(true);
    try {
      const deck = await createDeck(input);
      showSuccess("Փաթեթը ստեղծվեց։");
      setShowCreateDeck(false);
      setMyDecks((prev) => (prev ? [deck, ...prev] : [deck]));
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleDuplicate(deck: FlashcardDeckSummary) {
    setBusy(true);
    try {
      await duplicateDeck(deck.id);
      showSuccess("Փաթեթը կրկնօրինակվեց։");
      loadMyDecks();
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await deleteDeck(deleteTarget.id);
      showSuccess("Փաթեթը ջնջվեց։");
      setDeleteTarget(null);
      loadMyDecks();
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-[var(--space-4)] py-[var(--space-8)]">
      <PageHeader
        title="Բառաքարտեր"
        description="Կրկնիր բանաձևերն ու հասկացությունները, կամ ստեղծիր քո սեփական քարտերը։"
        back={{ to: "/", label: "Գլխավոր" }}
        actions={
          <LinkButton
            to={`/flashcards/favorites?subject=${subject}`}
            iconLeft={<Star size={15} strokeWidth={1.75} />}
          >
            Ընտրյալներ
          </LinkButton>
        }
      />

      {dueSummary.cards > 0 && (
        <section className="mb-[var(--space-6)] flex flex-wrap items-center justify-between gap-[var(--space-4)] rounded-[var(--radius-lg)] border border-primary-line bg-primary-bg p-[var(--space-5)]">
          <div className="min-w-0">
            <h2 className="font-display text-[length:var(--text-lg)] font-semibold text-text">
              Այսօր կրկնելու է {dueSummary.cards} քարտ
            </h2>
            <p className="mt-[var(--space-1)] text-[length:var(--text-sm)] text-text-muted">
              {dueSummary.decks.length} փաթեթում։ Կրկնությունը ամենաարդյունավետն է հենց ժամկետին։
            </p>
          </div>
          <Button onClick={() => navigate(`/flashcards/${dueSummary.decks[0].id}`)}>
            Սկսել կրկնությունը
          </Button>
        </section>
      )}

      <SegmentedControl options={TAB_OPTIONS} value={tab} onChange={setTab} className="mb-[var(--space-6)] w-fit" />

      {tab === "library" ? (
        <>
          <div className="mb-[var(--space-6)] flex flex-wrap gap-[var(--space-2)]">
            {SUBJECTS.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setSubject(s.key)}
                aria-pressed={subject === s.key}
                className={cn(
                  "flex items-center gap-[var(--space-2)] rounded-full border px-[var(--space-5)] py-[var(--space-2)]",
                  "text-[length:var(--text-sm)] font-medium transition-colors",
                  subject === s.key
                    ? "border-primary bg-primary text-primary-contrast"
                    : "border-border text-text hover:border-primary",
                )}
              >
                <span aria-hidden>{s.icon}</span>
                {s.label}
              </button>
            ))}
          </div>

          {libraryError ? (
            <ErrorState
              title="Չհաջողվեց բեռնել բառաքարտերը։"
              hint="Ստուգիր կապը և փորձիր կրկին։"
              onRetry={loadLibrary}
            />
          ) : !libraryDecks ? (
            <div className="grid grid-cols-1 gap-[var(--space-4)] sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => <DeckCardSkeleton key={i} />)}
            </div>
          ) : libraryDecks.length === 0 ? (
            <EmptyState
              title="Այս առարկայի բառաքարտերը շուտով կավելացվեն։"
              hint="Այս ընթացքում կարող ես ստեղծել քո սեփական փաթեթը։"
            />
          ) : (
            <div
              key={subject}
              className="grid grid-cols-1 gap-4 animate-[slide-up-in_var(--motion-normal)_var(--ease-out)] sm:grid-cols-2 lg:grid-cols-3"
            >
              {libraryDecks.map((deck) => (
                <DeckCard key={deck.id} deck={deck} onStudy={() => navigate(`/flashcards/${deck.id}`)} />
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="mb-[var(--space-6)] flex justify-end">
            <Button onClick={() => setShowCreateDeck(true)}>Ստեղծել փաթեթ</Button>
          </div>

          {myDecksError ? (
            <ErrorState
              title="Չհաջողվեց բեռնել քո փաթեթները։"
              hint="Ստուգիր կապը և փորձիր կրկին։"
              onRetry={loadMyDecks}
            />
          ) : !myDecks ? (
            <div className="grid grid-cols-1 gap-[var(--space-4)] sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => <DeckCardSkeleton key={i} />)}
            </div>
          ) : myDecks.length === 0 ? (
            <EmptyState
              title="Դեռ չունես սեփական փաթեթներ։"
              hint="Ստեղծիր առաջինը՝ քո սեփական բառաքարտերով։"
              cta={{ label: "Ստեղծել փաթեթ", onClick: () => setShowCreateDeck(true) }}
            />
          ) : (
            <div className="grid grid-cols-1 gap-[var(--space-4)] animate-[slide-up-in_var(--motion-normal)_var(--ease-out)] sm:grid-cols-2 lg:grid-cols-3">
              {myDecks.map((deck) => (
                <DeckCard
                  key={deck.id}
                  deck={deck}
                  onStudy={() => navigate(`/flashcards/${deck.id}`)}
                  extraActions={
                    /*
                      Delete used to be a full-width outlined button directly
                      under two neutral ones — the most destructive action on
                      the card given the most visual weight of the three. It is
                      now a quiet text action, and its confirm says how many
                      cards go with the deck.
                    */
                    <div className="flex items-center gap-[var(--space-2)]">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="flex-1 justify-center"
                        onClick={() => navigate(`/flashcards/${deck.id}/manage`)}
                      >
                        Կառավարել
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="flex-1 justify-center"
                        onClick={() => handleDuplicate(deck)}
                      >
                        Կրկնօրինակել
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-text-muted hover:text-incorrect"
                        onClick={() => setDeleteTarget(deck)}
                      >
                        Ջնջել
                      </Button>
                    </div>
                  }
                />
              ))}
            </div>
          )}
        </>
      )}

      {showCreateDeck && (
        <DeckFormModal
          title="Ստեղծել նոր փաթեթ"
          initial={{ title: "", description: "", subject }}
          busy={busy}
          onSave={handleCreateDeck}
          onClose={() => setShowCreateDeck(false)}
        />
      )}

      {/* ConfirmModal has no focus trap, no Escape handling and no scroll
          lock; ui/ConfirmDialog (Radix) has all three. */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Ջնջե՞լ «${deleteTarget?.title ?? ""}» փաթեթը`}
        description={`Փաթեթի ${deleteTarget?.card_count ?? 0} քարտը նույնպես կջնջվի։ Այս գործողությունը հետարկելի չէ։`}
        confirmLabel="Ջնջել"
        busy={busy}
        onConfirm={handleDelete}
      />
    </div>
  );
}
