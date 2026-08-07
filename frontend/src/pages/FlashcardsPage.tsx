import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  createDeck, deleteDeck, duplicateDeck, listFlashcardDecks, listMyDecks,
  type FlashcardDeckSummary, type FlashcardSubject,
} from "../api/flashcards";
import { ConfirmModal } from "../components/ConfirmModal";
import { DeckFormModal } from "../components/flashcards/DeckFormModal";
import { extractErrorMessage, useToast } from "../context/ToastContext";

const SUBJECTS: { key: FlashcardSubject; label: string; icon: string }[] = [
  { key: "math", label: "Մաթեմատիկա", icon: "∑" },
  { key: "physics", label: "Ֆիզիկա", icon: "⚛" },
  { key: "biology", label: "Կենսաբանություն", icon: "🧬" },
  { key: "chemistry", label: "Քիմիա", icon: "⚗" },
];

type Tab = "library" | "mine";

function DeckCard({
  deck, onStudy, extraActions,
}: {
  deck: FlashcardDeckSummary;
  onStudy: () => void;
  extraActions?: React.ReactNode;
}) {
  return (
    <div className="group flex flex-col justify-between rounded-[var(--radius)] border border-border bg-surface p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-md">
      <div>
        <h3 className="mb-1 text-lg font-medium text-text">{deck.title}</h3>
        <p className="mb-3 text-sm text-text-muted">{deck.card_count} քարտ</p>

        <div className="mb-3 flex h-2 overflow-hidden rounded-full bg-surface-muted">
          {deck.card_count > 0 && (
            <>
              <div className="h-full bg-primary" style={{ width: `${(100 * deck.known_count) / deck.card_count}%` }} />
              <div
                className="h-full bg-primary/40"
                style={{ width: `${(100 * deck.learning_count) / deck.card_count}%` }}
              />
            </>
          )}
        </div>
        <p className="mb-3 text-sm text-text-muted">
          Գիտեմ՝ {deck.known_count} · Սովորում եմ՝ {deck.learning_count} · Նոր՝ {deck.new_count}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={onStudy}
          className="flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 font-medium text-primary-contrast transition-colors hover:bg-primary-hover"
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

export function FlashcardsPage() {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const [tab, setTab] = useState<Tab>("library");
  const [subject, setSubject] = useState<FlashcardSubject>("math");
  const [libraryDecks, setLibraryDecks] = useState<FlashcardDeckSummary[] | null>(null);
  const [myDecks, setMyDecks] = useState<FlashcardDeckSummary[] | null>(null);

  const [showCreateDeck, setShowCreateDeck] = useState(false);
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
      <Link to="/" className="mb-4 inline-block text-sm text-primary hover:underline">
        ← Գլխավոր
      </Link>
      <h1 className="mb-1 text-3xl font-semibold text-text">🗂️ Բառաքարտեր</h1>
      <p className="mb-6 text-sm text-text-muted">
        Կրկնիր բանաձևերն ու հասկացությունները, կամ ստեղծիր քո սեփական քարտերը։
      </p>

      <div className="mb-6 flex overflow-hidden rounded-md border border-border w-fit">
        <button
          type="button"
          onClick={() => setTab("library")}
          className={`px-5 py-2 text-sm font-medium transition-colors ${
            tab === "library" ? "bg-primary text-primary-contrast" : "text-text hover:bg-surface-muted"
          }`}
        >
          📚 Գրադարան
        </button>
        <button
          type="button"
          onClick={() => setTab("mine")}
          className={`px-5 py-2 text-sm font-medium transition-colors ${
            tab === "mine" ? "bg-primary text-primary-contrast" : "text-text hover:bg-surface-muted"
          }`}
        >
          👤 Իմ փաթեթները
        </button>
      </div>

      {tab === "library" ? (
        <>
          <div className="mb-6 flex flex-wrap gap-2">
            {SUBJECTS.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setSubject(s.key)}
                className={`flex items-center gap-2 rounded-md border px-5 py-2 text-sm font-medium transition-colors ${
                  subject === s.key
                    ? "border-primary bg-primary text-primary-contrast"
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
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-40 animate-pulse rounded-[var(--radius)] bg-surface-muted" />
              ))}
            </div>
          ) : libraryDecks.length === 0 ? (
            <div className="rounded-[var(--radius)] border border-border bg-surface p-8 text-center text-text-muted">
              Այս առարկայի բառաքարտերը շուտով կավելացվեն։
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-contrast transition-colors hover:bg-primary-hover"
            >
              + Ստեղծել փաթեթ
            </button>
          </div>

          {!myDecks ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-40 animate-pulse rounded-[var(--radius)] bg-surface-muted" />
              ))}
            </div>
          ) : myDecks.length === 0 ? (
            <div className="rounded-[var(--radius)] border border-border bg-surface p-8 text-center text-text-muted">
              <p className="mb-4">Դուք դեռ չունեք ձեր փաթեթներ։ Ստեղծեք առաջինը՝ ձեր սեփական բառաքարտերով։</p>
              <button
                type="button"
                onClick={() => setShowCreateDeck(true)}
                className="rounded-md bg-primary px-4 py-2 font-medium text-primary-contrast transition-colors hover:bg-primary-hover"
              >
                + Ստեղծել փաթեթ
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {myDecks.map((deck) => (
                <DeckCard
                  key={deck.id}
                  deck={deck}
                  onStudy={() => navigate(`/flashcards/${deck.id}`)}
                  extraActions={
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => navigate(`/flashcards/${deck.id}/manage`)}
                        className="flex-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text transition-colors hover:border-primary"
                      >
                        Կառավարել
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDuplicate(deck)}
                        className="flex-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text transition-colors hover:border-primary"
                      >
                        Կրկնօրինակել
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(deck)}
                        className="rounded-md border border-incorrect px-3 py-1.5 text-xs font-medium text-incorrect transition-colors hover:bg-incorrect-bg"
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
