import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  createDeck, deleteDeck, duplicateDeck, listFlashcardDecks, listMyDecks,
  type FlashcardDeckSummary, type FlashcardSubject,
} from "../api/flashcards";
import { ConfirmModal } from "../components/ConfirmModal";
import { SegmentedControl } from "../components/SegmentedControl";
import { DeckFormModal } from "../components/flashcards/DeckFormModal";
import { DeckProgressRing } from "../components/flashcards/DeckProgressRing";
import { extractErrorMessage, useToast } from "../context/ToastContext";
import { SUBJECTS, subjectMeta } from "../lib/subjects";

type Tab = "library" | "mine";

const TAB_OPTIONS: { value: Tab; label: string }[] = [
  { value: "library", label: "📚 Գրադարան" },
  { value: "mine", label: "👤 Իմ փաթեթները" },
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

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={onStudy}
          className="btn-fx btn-fx-glow flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 font-medium text-primary-contrast focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Սովորել
          {deck.due_count > 0 && (
            <span className="rounded-full bg-primary-contrast/20 px-2 py-0.5 text-xs font-semibold">
              {deck.due_count}
            </span>
          )}
        </button>
        {extraActions}
      </div>
    </div>
  );
}

function DeckCardSkeleton() {
  return (
    <div className="animate-pulse rounded-[var(--radius)] border border-border bg-surface p-5">
      <div className="mb-3 h-4 w-20 rounded-full bg-surface-muted" />
      <div className="mb-4 h-5 w-3/4 rounded bg-surface-muted" />
      <div className="mb-5 flex items-center gap-4">
        <div className="h-14 w-14 shrink-0 rounded-full bg-surface-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-16 rounded bg-surface-muted" />
          <div className="h-3 w-32 rounded bg-surface-muted" />
        </div>
      </div>
      <div className="h-10 rounded-full bg-surface-muted" />
    </div>
  );
}

function EmptyState({ icon, message, action }: { icon: string; message: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-[var(--radius)] border border-dashed border-border bg-surface p-10 text-center">
      <span className="mb-3 text-3xl" aria-hidden>{icon}</span>
      <p className="mb-5 max-w-sm text-text-muted">{message}</p>
      {action}
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

  useEffect(() => {
    if (tab !== "library") return;
    setLibraryDecks(null);
    listFlashcardDecks(subject).then(setLibraryDecks);
  }, [tab, subject]);

  function loadMyDecks() {
    setMyDecks(null);
    listMyDecks().then(setMyDecks);
  }

  useEffect(() => {
    if (tab === "mine") loadMyDecks();
  }, [tab]);

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
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-4 flex items-center justify-between">
        <Link to="/" className="inline-block text-sm text-primary hover:underline">
          ← Գլխավոր
        </Link>
        <Link
          to={`/flashcards/favorites?subject=${subject}`}
          className="btn-fx inline-block rounded-full border border-border px-3 py-1.5 text-sm font-medium text-text transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          ⭐ Ընտրյալներ
        </Link>
      </div>
      <h1 className="mb-1 text-3xl font-semibold text-text">🗂️ Բառաքարտեր</h1>
      <p className="mb-6 text-sm text-text-muted">
        Կրկնիր բանաձևերն ու հասկացությունները, կամ ստեղծիր քո սեփական քարտերը։
      </p>

      <SegmentedControl options={TAB_OPTIONS} value={tab} onChange={setTab} className="mb-6 w-fit" />

      {tab === "library" ? (
        <>
          <div className="mb-6 flex flex-wrap gap-2">
            {SUBJECTS.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setSubject(s.key)}
                aria-pressed={subject === s.key}
                className={`btn-fx flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
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

          {!libraryDecks ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => <DeckCardSkeleton key={i} />)}
            </div>
          ) : libraryDecks.length === 0 ? (
            <EmptyState icon="🗂️" message="Այս առարկայի բառաքարտերը շուտով կավելացվեն։" />
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
          <div className="mb-6 flex justify-end">
            <button
              type="button"
              onClick={() => setShowCreateDeck(true)}
              className="btn-fx btn-fx-glow rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-contrast hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              + Ստեղծել փաթեթ
            </button>
          </div>

          {!myDecks ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => <DeckCardSkeleton key={i} />)}
            </div>
          ) : myDecks.length === 0 ? (
            <EmptyState
              icon="👤"
              message="Դուք դեռ չունեք ձեր փաթեթներ։ Ստեղծեք առաջինը՝ ձեր սեփական բառաքարտերով։"
              action={
                <button
                  type="button"
                  onClick={() => setShowCreateDeck(true)}
                  className="btn-fx btn-fx-glow rounded-full bg-primary px-4 py-2 font-medium text-primary-contrast hover:bg-primary-hover"
                >
                  + Ստեղծել փաթեթ
                </button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 animate-[slide-up-in_var(--motion-normal)_var(--ease-out)] sm:grid-cols-2 lg:grid-cols-3">
              {myDecks.map((deck) => (
                <DeckCard
                  key={deck.id}
                  deck={deck}
                  onStudy={() => navigate(`/flashcards/${deck.id}`)}
                  extraActions={
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => navigate(`/flashcards/${deck.id}/manage`)}
                          className="btn-fx flex-1 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-text hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        >
                          Կառավարել
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDuplicate(deck)}
                          className="btn-fx flex-1 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-text hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        >
                          Կրկնօրինակել
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(deck)}
                        className="btn-fx w-full rounded-full border border-incorrect px-3 py-1.5 text-xs font-medium text-incorrect hover:bg-incorrect-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-incorrect"
                      >
                        Ջնջել
                      </button>
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

      {deleteTarget && (
        <ConfirmModal
          message={`Ջնջե՞լ «${deleteTarget.title}» փաթեթը իր ${deleteTarget.card_count} քարտերով։`}
          confirmLabel="Ջնջել"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
