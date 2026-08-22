import { useCallback, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Copy, FolderInput, GraduationCap, Layers, Library, MoreHorizontal, Pencil, Plus,
  Search, SlidersHorizontal, SquarePen, Star, Trash2, Copy as CopyIcon,
} from "lucide-react";
import {
  deleteCard, deleteDeck, duplicateCard, duplicateDeck, getDeckCards, listMyDecks, moveCard,
  updateDeck, type DeckFormInput, type Flashcard, type FlashcardDeckSummary,
  type FlashcardDifficulty,
} from "../api/flashcards";
import { MathText } from "../components/MathText";
import { DeckFormModal } from "../components/flashcards/DeckFormModal";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { Dropdown, type DropdownItem } from "../components/ui/Dropdown";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { fieldInputClass } from "../components/ui/Field";
import { IconButton } from "../components/ui/IconButton";
import { Modal } from "../components/ui/Modal";
import { PageHeader } from "../components/ui/PageHeader";
import { Select } from "../components/ui/Select";
import { Skeleton } from "../components/ui/Skeleton";
import { cn } from "../lib/cn";
import { extractErrorMessage, useToast } from "../context/ToastContext";
import { useAsyncResource } from "../hooks/useAsyncResource";

type LearnedFilter = "all" | "learned" | "unlearned";

const DIFFICULTY_LABELS: Record<FlashcardDifficulty, string> = { easy: "Հեշտ", medium: "Միջին", hard: "Դժվար" };

export function FlashcardDeckManagePage() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  // Was `getDeckCards(id).then(setData)` with the whole page gated on `!data`,
  // so any failure left the skeleton pulsing forever with no error and no way
  // back — the defect class this project has now fixed on every surface it
  // has visited.
  const resource = useAsyncResource(() => getDeckCards(Number(deckId)), [deckId]);
  const data = resource.data;
  const reload = resource.retry;

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

  const clearFilters = useCallback(() => {
    setSearch("");
    setDifficultyFilter("all");
    setTagFilter("all");
    setFavoriteOnly(false);
    setLearnedFilter("all");
  }, []);

  const filtersActive =
    search.trim() !== "" || difficultyFilter !== "all" || tagFilter !== "all" ||
    favoriteOnly || learnedFilter !== "all";

  if (resource.isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-[var(--space-4)] py-[var(--space-8)]">
        <Skeleton className="mb-[var(--space-3)] h-4 w-32" />
        <Skeleton className="mb-[var(--space-6)] h-9 w-2/3" />
        <Skeleton className="mb-[var(--space-5)] h-11 w-full" />
        <div className="flex flex-col gap-[var(--space-2)]">
          {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-[72px] w-full" />)}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-4xl px-[var(--space-4)] py-[var(--space-8)]">
        <PageHeader title="Փաթեթը" back={{ to: "/flashcards", label: "Բառաքարտեր" }} />
        <ErrorState
          title="Փաթեթը չհաջողվեց բեռնել։"
          hint="Կապը կարող է ընդհատված լինել։ Քարտերը տեղում են։"
          onRetry={resource.retry}
        />
      </div>
    );
  }

  const { deck } = data;
  /*
    Every write endpoint behind this screen is scoped `owner=request.user`, so
    on a shared library deck rename, duplicate, delete, add-card, edit-card,
    move-card and delete-card all answer 404. The page used to offer all seven
    anyway: eleven controls that could only fail, four of them behind a
    confirmation dialog that promised something irreversible. It is a card
    browser for a library deck now — which is a real thing to want, since the
    search, the filters and the per-card progress are all still the student's
    own — and an editor only for a deck the student actually owns.
  */
  const canEdit = deck.is_owned;

  async function handleRename(input: DeckFormInput) {
    setBusy(true);
    try {
      await updateDeck(deck.id, input);
      showSuccess("Փաթեթը թարմացվեց։");
      setShowRename(false);
      reload();
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
      reload();
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
      reload();
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function openMoveModal(card: Flashcard) {
    setMoveCardTarget(card);
    setOtherDecks(null);
    try {
      const decks = await listMyDecks();
      setOtherDecks(decks.filter((d) => d.id !== deck.id));
    } catch (err) {
      showError(extractErrorMessage(err, "Փաթեթների ցանկը չհաջողվեց բեռնել։"));
      setMoveCardTarget(null);
    }
  }

  async function handleMoveCard(targetDeckId: number) {
    if (!moveCardTarget) return;
    setBusy(true);
    try {
      await moveCard(moveCardTarget.id, targetDeckId);
      showSuccess("Քարտը տեղափոխվեց։");
      setMoveCardTarget(null);
      setOtherDecks(null);
      reload();
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  /*
    Deck-level actions.

    They were four pills in a row — Սովորել, Վերանվանել, Կրկնօրինակել, Ջնջել —
    which put "delete this deck and all its cards, irreversibly" one position
    away from "study" and gave it the same weight as a rename. Studying is the
    only one of the four a student does more than once, so it is the only one
    that stays a button; the rest go behind a menu with the destructive item
    below a rule, matching the study screen's own settings menu.
  */
  const deckMenuItems: DropdownItem[] = [
    {
      key: "rename",
      label: "Խմբագրել վերնագիրը",
      icon: <SquarePen size={15} strokeWidth={1.75} aria-hidden />,
      onSelect: () => setShowRename(true),
    },
    {
      key: "duplicate",
      label: "Կրկնօրինակել փաթեթը",
      icon: <CopyIcon size={15} strokeWidth={1.75} aria-hidden />,
      onSelect: handleDuplicateDeck,
    },
    {
      key: "delete",
      divider: true,
      label: "Ջնջել փաթեթը",
      icon: <Trash2 size={15} strokeWidth={1.75} aria-hidden />,
      tone: "danger",
      onSelect: () => setShowDeleteDeck(true),
    },
  ];

  return (
    <div className="mx-auto max-w-4xl px-[var(--space-4)] py-[var(--space-8)]">
      <PageHeader
        back={{ to: "/flashcards", label: "Բառաքարտեր" }}
        title={deck.title}
        description={deck.description || undefined}
        actions={
          <div className="flex items-center gap-[var(--space-2)]">
            {/* An empty deck cannot be studied, so it is not offered — the
                empty state below carries the one action that helps. */}
            {data.cards.length > 0 && (
              <Button
                onClick={() => navigate(`/flashcards/${deck.id}`)}
                iconLeft={<GraduationCap size={16} strokeWidth={1.75} aria-hidden />}
              >
                Սովորել
              </Button>
            )}
            {canEdit && (
              <Dropdown
                items={deckMenuItems}
                renderTrigger={(props) => (
                  <IconButton
                    {...props}
                    variant="secondary"
                    aria-label="Փաթեթի գործողություններ"
                    icon={<MoreHorizontal size={18} strokeWidth={1.75} aria-hidden />}
                  />
                )}
              />
            )}
          </div>
        }
      />

      {!canEdit && (
        <p className="mb-[var(--space-5)] flex items-start gap-[var(--space-2)] rounded-[var(--radius-md)] border border-border bg-surface-muted p-[var(--space-3)] text-[length:var(--text-sm)] text-text-muted">
          <Library size={15} strokeWidth={1.75} aria-hidden className="mt-[3px] shrink-0" />
          <span>
            Սա Gitus-ի ընդհանուր գրադարանի փաթեթ է, ուստի քարտերը չեն
            խմբագրվում։ Քո առաջընթացը այս քարտերի վրա քոնն է և պահպանվում է։
          </span>
        </p>
      )}

      {/* Search and four filters over zero cards is furniture, not function. */}
      {data.cards.length > 0 && (
      <>
      <div className="mb-[var(--space-4)] flex flex-wrap items-center gap-[var(--space-2)]">
        <div className="relative min-w-[220px] flex-1">
          {/* The magnifier was a 🔍 inside the placeholder text, which meant a
              screen reader read it aloud as part of the prompt and it vanished
              the moment the student typed. */}
          <Search
            size={16}
            strokeWidth={1.75}
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-[var(--space-3)] -translate-y-1/2 text-text-muted"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Փնտրել քարտերում"
            placeholder="Փնտրել քարտերում..."
            className={cn(fieldInputClass, "pl-9")}
          />
        </div>
        {canEdit && (
          <Link
            to={`/flashcards/create?deck=${deck.id}`}
            className={cn(
              "inline-flex shrink-0 items-center gap-[var(--space-2)] rounded-[var(--radius-md)]",
              "bg-primary px-[var(--space-4)] py-[var(--space-2)] text-[length:var(--text-sm)] font-medium",
              "text-primary-contrast transition-colors hover:bg-primary-hover",
            )}
          >
            <Plus size={16} strokeWidth={2} aria-hidden />
            Ավելացնել քարտ
          </Link>
        )}
      </div>

      <div className="mb-[var(--space-6)] flex flex-wrap items-center gap-[var(--space-2)]">
        <SlidersHorizontal size={15} strokeWidth={1.75} aria-hidden className="shrink-0 text-text-muted" />
        <Select
          label="Դժվարություն"
          value={difficultyFilter}
          onChange={(v) => setDifficultyFilter(v as FlashcardDifficulty | "all")}
          options={[
            { value: "all", label: "Բոլոր դժվարությունները" },
            ...(["easy", "medium", "hard"] as FlashcardDifficulty[]).map((d) => ({
              value: d, label: DIFFICULTY_LABELS[d],
            })),
          ]}
          className="w-auto min-w-[11rem]"
        />
        {allTags.length > 0 && (
          <Select
            label="Պիտակ"
            value={tagFilter}
            onChange={setTagFilter}
            options={[{ value: "all", label: "Բոլոր պիտակները" }, ...allTags.map((t) => ({ value: t, label: t }))]}
            className="w-auto min-w-[10rem]"
          />
        )}
        <Select
          label="Սովորած"
          value={learnedFilter}
          onChange={(v) => setLearnedFilter(v as LearnedFilter)}
          options={[
            { value: "all", label: "Բոլորը" },
            { value: "learned", label: "Սովորած" },
            { value: "unlearned", label: "Չսովորած" },
          ]}
          className="w-auto min-w-[9rem]"
        />
        <button
          type="button"
          aria-pressed={favoriteOnly}
          onClick={() => setFavoriteOnly((f) => !f)}
          className={cn(
            "inline-flex items-center gap-[var(--space-2)] rounded-[var(--radius-md)] border",
            "px-[var(--space-3)] py-[var(--space-2)] text-[length:var(--text-sm)] font-medium",
            "transition-colors duration-[var(--motion-fast)]",
            favoriteOnly
              ? "border-primary bg-primary text-primary-contrast"
              : "border-border text-text hover:border-primary",
          )}
        >
          <Star size={15} strokeWidth={1.75} aria-hidden fill={favoriteOnly ? "currentColor" : "none"} />
          Ընտրյալներ
        </button>
      </div>
      </>
      )}

      {data.cards.length === 0 ? (
        <EmptyState
          icon={<Layers size={24} strokeWidth={1.75} aria-hidden />}
          title="Այս փաթեթում քարտեր դեռ չկան։"
          hint={canEdit ? "Ավելացրու առաջին քարտը՝ փաթեթը սովորելու համար պատրաստ դարձնելու։" : undefined}
          cta={canEdit
            ? { label: "Ավելացնել քարտ", onClick: () => navigate(`/flashcards/create?deck=${deck.id}`) }
            : undefined}
        />
      ) : filteredCards.length === 0 ? (
        <EmptyState
          icon={<Search size={24} strokeWidth={1.75} aria-hidden />}
          title="Ոչ մի քարտ չի համապատասխանում ընտրված զտիչներին։"
          hint={`Փաթեթում կա ${data.cards.length} քարտ։`}
          cta={{ label: "Մաքրել զտիչները", onClick: clearFilters }}
        />
      ) : (
        <>
          <p className="mb-[var(--space-3)] text-[length:var(--text-sm)] text-text-muted">
            {filtersActive
              ? `${filteredCards.length} քարտ ${data.cards.length}-ից`
              : `${data.cards.length} քարտ`}
          </p>
          <ul className="flex flex-col gap-[var(--space-2)]">
            {filteredCards.map((card) => {
              const progress = data.progress[card.id];
              const cardMenuItems: DropdownItem[] = [
                {
                  key: "edit",
                  label: "Խմբագրել",
                  icon: <Pencil size={15} strokeWidth={1.75} aria-hidden />,
                  onSelect: () => navigate(`/flashcards/cards/${card.id}/edit`),
                },
                {
                  key: "duplicate",
                  label: "Կրկնօրինակել",
                  icon: <Copy size={15} strokeWidth={1.75} aria-hidden />,
                  onSelect: () => handleDuplicateCard(card),
                },
                {
                  key: "move",
                  label: "Տեղափոխել այլ փաթեթ",
                  icon: <FolderInput size={15} strokeWidth={1.75} aria-hidden />,
                  onSelect: () => openMoveModal(card),
                },
                {
                  key: "delete",
                  divider: true,
                  label: "Ջնջել",
                  icon: <Trash2 size={15} strokeWidth={1.75} aria-hidden />,
                  tone: "danger",
                  onSelect: () => setDeleteCardTarget(card),
                },
              ];
              return (
                <li
                  key={card.id}
                  className={cn(
                    "group relative flex items-center gap-[var(--space-3)] rounded-[var(--radius-lg)]",
                    "border border-border bg-surface p-[var(--space-4)]",
                    "transition-colors duration-[var(--motion-fast)] hover:border-primary",
                    "focus-within:border-primary",
                  )}
                >
                  {card.front_image_url && (
                    <img
                      src={card.front_image_url}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-12 w-12 shrink-0 rounded-[var(--radius-sm)] object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    {/* Rendered, not raw. This printed the card's source, so a
                        student reviewing their own deck read
                        `Ինչպե՞ս ես բացում $\sin 2\alpha$` — the one screen in
                        the product that showed LaTeX instead of mathematics. */}
                    {canEdit ? (
                      <Link
                        to={`/flashcards/cards/${card.id}/edit`}
                        className="block truncate text-text before:absolute before:inset-0 before:content-['']"
                      >
                        <MathText text={card.front_text} />
                      </Link>
                    ) : (
                      <p className="truncate text-text">
                        <MathText text={card.front_text} />
                      </p>
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Badge>{DIFFICULTY_LABELS[card.difficulty]}</Badge>
                      {progress?.status === "known" && <Badge tone="correct">Սովորած</Badge>}
                      {progress?.is_favorite && (
                        <span className="inline-flex items-center gap-1 text-[length:var(--text-xs)] text-text-muted">
                          <Star size={12} strokeWidth={1.75} aria-hidden fill="currentColor" />
                          Ընտրյալ
                        </span>
                      )}
                      {card.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-surface-muted px-2 py-0.5 text-[length:var(--text-xs)] text-text-muted"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                  {/* Four equal buttons per row meant twenty-eight controls on
                      a seven-card deck, with "Ջնջել" among them. The row is a
                      link to its own editor now, and the rest are one menu —
                      the pattern the todo and notes lists already use. */}
                  {canEdit && (
                    <div className="relative shrink-0">
                      <Dropdown
                        items={cardMenuItems}
                        renderTrigger={(props) => (
                          <IconButton
                            {...props}
                            variant="ghost"
                            size="sm"
                            aria-label="Քարտի գործողություններ"
                            icon={<MoreHorizontal size={16} strokeWidth={1.75} aria-hidden />}
                          />
                        )}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}

      <DeckFormModal
        open={showRename}
        onOpenChange={setShowRename}
        title="Խմբագրել փաթեթը"
        initial={{ title: deck.title, description: deck.description, subject: deck.subject }}
        busy={busy}
        onSave={handleRename}
      />

      <ConfirmDialog
        open={showDeleteDeck}
        onOpenChange={setShowDeleteDeck}
        title={`Ջնջե՞լ «${deck.title}» փաթեթը`}
        description={`Փաթեթը և իր ${deck.card_count} քարտերը կջնջվեն ընդմիշտ։ Այս գործողությունը հնարավոր չէ հետարկել։`}
        confirmLabel="Ջնջել փաթեթը"
        busy={busy}
        onConfirm={handleDeleteDeck}
      />

      <ConfirmDialog
        open={deleteCardTarget !== null}
        onOpenChange={(open) => !open && setDeleteCardTarget(null)}
        title="Ջնջե՞լ այս քարտը"
        description={deleteCardTarget?.front_text}
        confirmLabel="Ջնջել"
        busy={busy}
        onConfirm={handleDeleteCard}
      />

      {/* Was a hand-rolled `fixed inset-0` overlay with no focus trap, no
          Escape and no dialog role. */}
      <Modal
        open={moveCardTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setMoveCardTarget(null);
            setOtherDecks(null);
          }
        }}
        title="Տեղափոխել ո՞ր փաթեթ"
      >
        {otherDecks === null ? (
          <div className="flex flex-col gap-[var(--space-2)]">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-11 w-full" />)}
          </div>
        ) : otherDecks.length === 0 ? (
          <p className="text-[length:var(--text-sm)] text-text-muted">
            Այլ փաթեթներ չկան։ Ստեղծիր նոր փաթեթ՝ քարտը տեղափոխելու համար։
          </p>
        ) : (
          <div className="flex max-h-[50vh] flex-col gap-[var(--space-2)] overflow-y-auto">
            {otherDecks.map((d) => (
              <button
                key={d.id}
                type="button"
                disabled={busy}
                onClick={() => handleMoveCard(d.id)}
                className={cn(
                  "flex items-center justify-between gap-[var(--space-3)] rounded-[var(--radius-md)]",
                  "border border-border px-[var(--space-4)] py-[var(--space-2)] text-left text-text",
                  "transition-colors hover:border-primary disabled:opacity-60",
                )}
              >
                <span className="min-w-0 truncate">{d.title}</span>
                <span className="shrink-0 text-[length:var(--text-xs)] text-text-muted">
                  {d.card_count} քարտ
                </span>
              </button>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
