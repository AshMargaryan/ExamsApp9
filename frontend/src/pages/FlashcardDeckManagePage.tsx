import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  deleteCard, deleteDeck, duplicateCard, duplicateDeck, getDeckCards, listMyDecks, moveCard,
  updateDeck, type DeckCards, type DeckFormInput, type Flashcard, type FlashcardDeckSummary,
  type FlashcardDifficulty,
} from "../api/flashcards";
import { ConfirmModal } from "../components/ConfirmModal";
import { DeckFormModal } from "../components/flashcards/DeckFormModal";
import { extractErrorMessage, useToast } from "../context/ToastContext";
import { LinkButton } from "../components/ui/LinkButton";

type LearnedFilter = "all" | "learned" | "unlearned";

const DIFFICULTY_LABELS: Record<FlashcardDifficulty, string> = { easy: "Հեշտ", medium: "Միջին", hard: "Դժվար" };

export function FlashcardDeckManagePage() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const [data, setData] = useState<DeckCards | null>(null);
  const [search, setSearch] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState<FlashcardDifficulty | "all">("all");
  const [tagFilter, setTagFilter] = useState<string | "all">("all");
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [learnedFilter, setLearnedFilter] = useState<LearnedFilter>("all");

  const [showRename, setShowRename] = useState(false);
  const [showDeleteDeck, setShowDeleteDeck] = useState(false);
  const [deleteCardTarget, setDeleteCardTarget] = useState<Flashcard | null>(null);
  const [moveCardTarget, setMoveCardTarget] = useState<Flashcard | null>(null);
  const [otherDecks, setOtherDecks] = useState<FlashcardDeckSummary[] | null>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    if (!deckId) return;
    getDeckCards(Number(deckId)).then(setData);
  }

  useEffect(load, [deckId]);

  const allTags = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(data.cards.flatMap((c) => c.tags))).sort();
  }, [data]);

  const filteredCards = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.cards.filter((c) => {
      if (q && !`${c.front_text} ${c.back_text} ${c.tags.join(" ")}`.toLowerCase().includes(q)) return false;
      if (difficultyFilter !== "all" && c.difficulty !== difficultyFilter) return false;
      if (tagFilter !== "all" && !c.tags.includes(tagFilter)) return false;
      const progress = data.progress[c.id];
      if (favoriteOnly && !progress?.is_favorite) return false;
      if (learnedFilter === "learned" && progress?.status !== "known") return false;
      if (learnedFilter === "unlearned" && progress?.status === "known") return false;
      return true;
    });
  }, [data, search, difficultyFilter, tagFilter, favoriteOnly, learnedFilter]);

  if (!data) {
    return (
      <div className="mx-auto max-w-4xl animate-pulse px-4 py-8">
        <div className="mb-6 h-8 w-1/3 rounded bg-surface-muted" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="mb-3 h-16 rounded bg-surface-muted" />
        ))}
      </div>
    );
  }

  const { deck } = data;

  async function handleRename(input: DeckFormInput) {
    setBusy(true);
    try {
      await updateDeck(deck.id, input);
      showSuccess("Փաթեթը թարմացվեց։");
      setShowRename(false);
      load();
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteDeck() {
    setBusy(true);
    try {
      await deleteDeck(deck.id);
      showSuccess("Փաթեթը ջնջվեց։");
      navigate("/flashcards");
    } catch (err) {
      showError(extractErrorMessage(err));
      setBusy(false);
    }
  }

  async function handleDuplicateDeck() {
    setBusy(true);
    try {
      const copy = await duplicateDeck(deck.id);
      showSuccess("Փաթեթը կրկնօրինակվեց։");
      navigate(`/flashcards/${copy.id}/manage`);
    } catch (err) {
      showError(extractErrorMessage(err));
      setBusy(false);
    }
  }

  async function handleDeleteCard() {
    if (!deleteCardTarget) return;
    setBusy(true);
    try {
      await deleteCard(deleteCardTarget.id);
      showSuccess("Քարտը ջնջվեց։");
      setDeleteCardTarget(null);
      load();
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleDuplicateCard(card: Flashcard) {
    setBusy(true);
    try {
      await duplicateCard(card.id);
      showSuccess("Քարտը կրկնօրինակվեց։");
      load();
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function openMoveModal(card: Flashcard) {
    setMoveCardTarget(card);
    const decks = await listMyDecks();
    setOtherDecks(decks.filter((d) => d.id !== deck.id));
  }

  async function handleMoveCard(targetDeckId: number) {
    if (!moveCardTarget) return;
    setBusy(true);
    try {
      await moveCard(moveCardTarget.id, targetDeckId);
      showSuccess("Քարտը տեղափոխվեց։");
      setMoveCardTarget(null);
      setOtherDecks(null);
      load();
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <LinkButton to="/flashcards" className="mb-4">← Բառաքարտեր</LinkButton>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-text">{deck.title}</h1>
          {deck.description && <p className="mt-1 text-sm text-text-muted">{deck.description}</p>}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => navigate(`/flashcards/${deck.id}`)}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-contrast transition-colors hover:bg-primary-hover"
          >
            Սովորել
          </button>
          <button
            type="button"
            onClick={() => setShowRename(true)}
            className="rounded-md border border-border px-3 py-2 text-sm font-medium text-text transition-colors hover:border-primary"
          >
            Վերանվանել
          </button>
          <button
            type="button"
            onClick={handleDuplicateDeck}
            className="rounded-md border border-border px-3 py-2 text-sm font-medium text-text transition-colors hover:border-primary"
          >
            Կրկնօրինակել
          </button>
          <button
            type="button"
            onClick={() => setShowDeleteDeck(true)}
            className="rounded-md border border-incorrect px-3 py-2 text-sm font-medium text-incorrect transition-colors hover:bg-incorrect-bg"
          >
            Ջնջել
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Փնտրել քարտերում..."
          className="min-w-[200px] flex-1 rounded-md border border-border bg-bg px-3 py-2 text-text outline-none focus:border-primary"
        />
        <Link
          to={`/flashcards/create?deck=${deck.id}`}
          className="shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-contrast transition-colors hover:bg-primary-hover"
        >
          + Ավելացնել քարտ
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <select
          value={difficultyFilter}
          onChange={(e) => setDifficultyFilter(e.target.value as FlashcardDifficulty | "all")}
          className="rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-text"
        >
          <option value="all">Բոլոր դժվարությունները</option>
          {(["easy", "medium", "hard"] as FlashcardDifficulty[]).map((d) => (
            <option key={d} value={d}>{DIFFICULTY_LABELS[d]}</option>
          ))}
        </select>
        {allTags.length > 0 && (
          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-text"
          >
            <option value="all">Բոլոր պիտակները</option>
            {allTags.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        )}
        <select
          value={learnedFilter}
          onChange={(e) => setLearnedFilter(e.target.value as LearnedFilter)}
          className="rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-text"
        >
          <option value="all">Բոլորը</option>
          <option value="learned">Սովորած</option>
          <option value="unlearned">Չսովորած</option>
        </select>
        <button
          type="button"
          onClick={() => setFavoriteOnly((f) => !f)}
          className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
            favoriteOnly ? "border-primary bg-primary text-primary-contrast" : "border-border text-text hover:border-primary"
          }`}
        >
          ⭐ Ընտրյալներ
        </button>
      </div>

      {data.cards.length === 0 ? (
        <div className="rounded-[var(--radius)] border border-border bg-surface p-8 text-center text-text-muted">
          Այս փաթեթում քարտեր դեռ չկան։ Սեղմեք «+ Ավելացնել քարտ»՝ առաջինը ստեղծելու համար։
        </div>
      ) : filteredCards.length === 0 ? (
        <div className="rounded-[var(--radius)] border border-border bg-surface p-8 text-center text-text-muted">
          Ոչ մի քարտ չի համապատասխանում ընտրված զտիչներին։
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filteredCards.map((card) => {
            const progress = data.progress[card.id];
            return (
              <div
                key={card.id}
                className="flex items-center gap-3 rounded-[var(--radius)] border border-border bg-surface p-4 transition-colors hover:border-primary"
              >
                {card.front_image_url && (
                  <img src={card.front_image_url} alt="" className="h-12 w-12 shrink-0 rounded object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-text">{card.front_text}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-text-muted">
                    <span className="rounded-full border border-border px-2 py-0.5">
                      {DIFFICULTY_LABELS[card.difficulty]}
                    </span>
                    {progress?.status === "known" && (
                      <span className="rounded-full border border-correct px-2 py-0.5 text-correct">Սովորած</span>
                    )}
                    {progress?.is_favorite && <span>⭐</span>}
                    {card.tags.map((t) => (
                      <span key={t} className="rounded-full bg-surface-muted px-2 py-0.5">{t}</span>
                    ))}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Link
                    to={`/flashcards/cards/${card.id}/edit`}
                    className="rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-text transition-colors hover:border-primary"
                  >
                    Խմբագրել
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDuplicateCard(card)}
                    className="rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-text transition-colors hover:border-primary"
                  >
                    Կրկնօրինակել
                  </button>
                  <button
                    type="button"
                    onClick={() => openMoveModal(card)}
                    className="rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-text transition-colors hover:border-primary"
                  >
                    Տեղափոխել
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteCardTarget(card)}
                    className="rounded-md border border-incorrect px-2.5 py-1.5 text-xs font-medium text-incorrect transition-colors hover:bg-incorrect-bg"
                  >
                    Ջնջել
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showRename && (
        <DeckFormModal
          title="Խմբագրել փաթեթը"
          initial={{ title: deck.title, description: deck.description, subject: deck.subject }}
          busy={busy}
          onSave={handleRename}
          onClose={() => setShowRename(false)}
        />
      )}

      {showDeleteDeck && (
        <ConfirmModal
          message={`Ջնջե՞լ «${deck.title}» փաթեթը իր ${deck.card_count} քարտերով։ Այս գործողությունը հնարավոր չէ հետարկել։`}
          confirmLabel="Ջնջել"
          onConfirm={handleDeleteDeck}
          onCancel={() => setShowDeleteDeck(false)}
        />
      )}

      {deleteCardTarget && (
        <ConfirmModal
          message={`Ջնջե՞լ այս քարտը։`}
          confirmLabel="Ջնջել"
          onConfirm={handleDeleteCard}
          onCancel={() => setDeleteCardTarget(null)}
        />
      )}

      {moveCardTarget && otherDecks && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setMoveCardTarget(null)}
        >
          <div
            className="relative w-full max-w-sm rounded-[var(--radius)] border border-border bg-surface p-8 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-lg font-semibold text-text">Տեղափոխել ո՞ր փաթեթ</h2>
            {otherDecks.length === 0 ? (
              <p className="text-text-muted">Այլ փաթեթներ չկան։</p>
            ) : (
              <div className="flex flex-col gap-2">
                {otherDecks.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    disabled={busy}
                    onClick={() => handleMoveCard(d.id)}
                    className="rounded-md border border-border px-4 py-2 text-left text-text transition-colors hover:border-primary disabled:opacity-60"
                  >
                    {d.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
