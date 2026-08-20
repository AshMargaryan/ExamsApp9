import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Check, CircleCheck, Eye, Flag, Layers, Lightbulb, RotateCcw,
  Settings2, Sparkles, SquareStack, Star, StickyNote, Timer, X,
} from "lucide-react";
import {
  flagCard, getDeckCards, isDue, markCard, resetDeckProgress,
  type CardProgress, type DeckCards, type Flashcard, type FlashcardGrade,
} from "../api/flashcards";
import { MathText } from "../components/MathText";
import { WordPronounce } from "../components/flashcards/WordPronounce";
import { Button } from "../components/ui/Button";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { Dropdown, type DropdownItem } from "../components/ui/Dropdown";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { IconButton } from "../components/ui/IconButton";
import { ProgressBar } from "../components/ui/ProgressBar";
import { Skeleton } from "../components/ui/Skeleton";
import { extractErrorMessage, useToast } from "../context/ToastContext";
import { useAsyncResource } from "../hooks/useAsyncResource";

type StudyMode = "due" | "all";
type TransitionPhase = "idle" | "exiting" | "entering";
type TransitionDirection = "forward" | "back";

const ROUND_SIZE = 5;
const CHOICE_LETTERS = ["Ա", "Բ", "Գ", "Դ"];
const SWIPE_THRESHOLD_PX = 60;
const STORAGE_PREFIX = "flashcards_session_v1_";

interface SavedSession {
  cardIds: number[];
  index: number;
  mode: StudyMode;
  shuffled: boolean;
  sessionResults: Record<number, FlashcardGrade>;
  roundAck: number;
  quizMode?: boolean;
  reviewingMissed?: boolean;
}

function loadSavedSession(deckId: string): SavedSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + deckId);
    return raw ? (JSON.parse(raw) as SavedSession) : null;
  } catch {
    return null;
  }
}
function saveSession(deckId: string, snap: SavedSession) {
  try {
    localStorage.setItem(STORAGE_PREFIX + deckId, JSON.stringify(snap));
  } catch {
    // localStorage unavailable (private mode etc.) — position just won't persist.
  }
}
function clearSavedSession(deckId: string) {
  try {
    localStorage.removeItem(STORAGE_PREFIX + deckId);
  } catch {
    // ignore
  }
}

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function formatTimer(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Four options: the real answer plus three other answers from the same deck.
 *  Returns null when the deck is too small to make a fair question. */
function buildChoices(current: Flashcard, allCards: Flashcard[]): string[] | null {
  const currentAnswer = current.back_text.trim();
  const pool = Array.from(
    new Set(
      allCards
        .filter((c) => c.id !== current.id)
        .map((c) => c.back_text.trim())
        .filter((t) => t && t !== currentAnswer),
    ),
  );
  if (pool.length < 3) return null;
  const distractors = shuffle(pool).slice(0, 3);
  return shuffle([currentAnswer, ...distractors]);
}

export function FlashcardStudyPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const { showError } = useToast();

  // One async read with a real error branch. The old code was
  // `getDeckCards(id).then(setData)` with the whole page gated on `!data`, so
  // any failure left the skeleton shimmering forever with no way back.
  const resource = useAsyncResource(() => getDeckCards(Number(deckId)), [deckId]);
  const data = resource.data;

  const [flags, setFlags] = useState<Record<number, CardProgress>>({});
  const [mode, setMode] = useState<StudyMode>("due");
  const [shuffled, setShuffled] = useState(false);
  const [quizMode, setQuizMode] = useState(true);
  const [queue, setQueue] = useState<Flashcard[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sessionResults, setSessionResults] = useState<Record<number, FlashcardGrade>>({});
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [restored, setRestored] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  // Highest index boundary the student has clicked "Continue" past — used to
  // show a one-time "round complete" interstitial every ROUND_SIZE cards.
  const [roundAck, setRoundAck] = useState(0);
  // True when the current queue is the subset the student got wrong last
  // round, rather than the deck's own due/all selection — the metadata line
  // has to say so, or the session claims to be something it is not.
  const [reviewingMissed, setReviewingMissed] = useState(false);
  const touchStartX = useRef<number | null>(null);

  // Card-to-card transition — advancing/going back plays a short exit
  // animation on the current card, then (on animationend) the real state
  // change commits and a matching entrance animation plays for the next
  // card, so the queue reads as one continuous motion instead of an
  // instant content swap.
  const [transitionPhase, setTransitionPhase] = useState<TransitionPhase>("idle");
  const [transitionDir, setTransitionDir] = useState<TransitionDirection>("forward");
  const transitionCommitRef = useRef<(() => void) | null>(null);
  // Only the *exit* half blocks input. The entering card's content is already
  // committed, so refusing clicks while it slides in just adds a third of a
  // second of dead time to every card in the session for no benefit.
  const animating = transitionPhase === "exiting";

  const advance = useCallback((direction: TransitionDirection, commit: () => void) => {
    transitionCommitRef.current = commit;
    setTransitionDir(direction);
    setTransitionPhase("exiting");
  }, []);

  const finishPhase = useCallback(() => {
    setTransitionPhase((phase) => {
      if (phase === "exiting") {
        transitionCommitRef.current?.();
        transitionCommitRef.current = null;
        return "entering";
      }
      return "idle";
    });
  }, []);

  function handleCardTransitionEnd(e: React.AnimationEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget) return; // ignore bubbled child animations (shake, pop-in, eq-bar)
    if (transitionPhase !== "idle") finishPhase();
  }

  // `animationend` is the normal path out of a transition, but it is not
  // guaranteed to arrive: a backgrounded tab, an animation interrupted by a
  // re-render, or a replaced node all swallow it. Since the exit phase is what
  // actually commits the next index, a missed event would strand the student
  // on a card that silently ignores every click. A watchdog just past the
  // animation's own duration guarantees the queue always moves.
  useEffect(() => {
    if (transitionPhase === "idle") return;
    const id = setTimeout(finishPhase, 600);
    return () => clearTimeout(id);
  }, [transitionPhase, finishPhase]);

  // Subtle hover tilt on the flip-mode card — skipped for touch input and
  // for prefers-reduced-motion users (a JS-computed transform ignores the
  // global CSS duration-zeroing rule, so it needs its own guard).
  const flipInnerRef = useRef<HTMLDivElement | null>(null);
  const reducedMotionRef = useRef(false);
  useEffect(() => {
    reducedMotionRef.current =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);
  function handleTiltMove(e: React.PointerEvent<HTMLDivElement>) {
    if (reducedMotionRef.current || e.pointerType !== "mouse" || !flipInnerRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    flipInnerRef.current.style.setProperty("--tilt-y", `${(px * 6).toFixed(2)}deg`);
    flipInnerRef.current.style.setProperty("--tilt-x", `${(-py * 6).toFixed(2)}deg`);
  }
  function handleTiltLeave() {
    flipInnerRef.current?.style.setProperty("--tilt-x", "0deg");
    flipInnerRef.current?.style.setProperty("--tilt-y", "0deg");
  }

  const buildQueue = useCallback((d: DeckCards, useMode: StudyMode, doShuffle: boolean) => {
    const base = useMode === "due" ? d.cards.filter((c) => isDue(d.progress[c.id])) : d.cards;
    return doShuffle ? shuffle(base) : base;
  }, []);

  // Explicit session (re)start over an arbitrary set of cards.
  const beginSession = useCallback(
    (cards: Flashcard[], missedOnly: boolean) => {
      setQueue(cards);
      setIndex(0);
      setFlipped(false);
      setSelectedChoice(null);
      setAnswered(false);
      setSessionResults({});
      setElapsedSeconds(0);
      setRoundAck(0);
      setTransitionPhase("idle");
      setReviewingMissed(missedOnly);
      if (deckId) clearSavedSession(deckId);
    },
    [deckId],
  );

  const startSession = useCallback(
    (d: DeckCards, useMode: StudyMode, doShuffle: boolean) => {
      beginSession(buildQueue(d, useMode, doShuffle), false);
    },
    [beginSession, buildQueue],
  );

  // Restore (or start) the session once per successful load of a deck.
  const seededFrom = useRef<DeckCards | null>(null);
  useEffect(() => {
    if (!data || !deckId || seededFrom.current === data) return;
    seededFrom.current = data;
    setFlags(data.progress);

    const saved = loadSavedSession(deckId);
    const cardById = new Map(data.cards.map((c) => [c.id, c]));
    if (saved && saved.cardIds.length > 0 && saved.cardIds.every((id) => cardById.has(id))) {
      setMode(saved.mode);
      setShuffled(saved.shuffled);
      setQuizMode(saved.quizMode ?? true);
      setQueue(saved.cardIds.map((id) => cardById.get(id)!));
      setIndex(saved.index);
      setSessionResults(saved.sessionResults);
      setRoundAck(saved.roundAck ?? 0);
      setReviewingMissed(saved.reviewingMissed ?? false);
      setFlipped(false);
      setSelectedChoice(null);
      setAnswered(false);
    } else {
      const initialMode: StudyMode = data.cards.some((c) => isDue(data.progress[c.id])) ? "due" : "all";
      setMode(initialMode);
      startSession(data, initialMode, false);
    }
    setRestored(true);
  }, [data, deckId, startSession]);

  const finished = data !== null && restored && index >= queue.length;
  // Rounds only earn their interruption on a deck long enough to have them.
  // Every deck in the seeded library holds 5–7 cards, so a fixed boundary at
  // five fired a full "round complete" celebration one card before the finish
  // screen — two congratulations in three cards. A break now needs a whole
  // round still ahead of it, and a deck too short for two rounds has none.
  const roundsEnabled = queue.length >= ROUND_SIZE * 2;
  const atRoundBoundary =
    roundsEnabled &&
    !finished &&
    index > 0 &&
    index % ROUND_SIZE === 0 &&
    queue.length - index >= ROUND_SIZE &&
    roundAck < index;
  const roundNumber = Math.floor(index / ROUND_SIZE) + 1;
  const totalRounds = Math.max(1, Math.ceil(queue.length / ROUND_SIZE));
  // A card the student has already answered is done, even though the pointer
  // does not move until they press "next". Counting it immediately is what
  // makes the bar respond to the answer rather than to the navigation — it
  // otherwise still read "0 / 7" on a screen that was showing the result of
  // card one.
  const completed = Math.min(index + (answered ? 1 : 0), queue.length);

  // Remember position: snapshot the session on every meaningful change so a
  // reload resumes exactly where the student left off.
  useEffect(() => {
    if (!deckId || !restored || queue.length === 0) return;
    saveSession(deckId, {
      cardIds: queue.map((c) => c.id), index, mode, shuffled, sessionResults, roundAck, quizMode,
      reviewingMissed,
    });
  }, [deckId, restored, queue, index, mode, shuffled, sessionResults, roundAck, quizMode, reviewingMissed]);

  useEffect(() => {
    if (finished && deckId) clearSavedSession(deckId);
  }, [finished, deckId]);

  // Live study timer — session-only, not persisted.
  useEffect(() => {
    if (finished || !restored) return;
    const id = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [finished, restored]);

  // Records a grade against the backend (spaced-repetition scheduling) without
  // touching the UI's current-card pointer — both the flip-mode buttons and
  // the quiz-mode answer picker call this, then decide separately when to
  // actually move on. "good" = knew it (spaced interval grows). "again" =
  // wants to learn it (due immediately, but — since nothing is pushed back
  // into `queue` — it will only resurface the NEXT time the student opens
  // this deck, not again in this session).
  //
  // Returns false when the write failed, so callers can say so instead of
  // silently swallowing it: this used to be a bare `await`, which meant a
  // rejected request either froze the card in place (flip mode) or showed the
  // answer as graded when nothing had been recorded (quiz mode).
  const recordGrade = useCallback(
    async (grade: FlashcardGrade): Promise<boolean> => {
      if (!queue[index]) return false;
      const card = queue[index];
      try {
        await markCard(card.id, grade);
        setSessionResults((prev) => ({ ...prev, [card.id]: grade }));
        return true;
      } catch (err) {
        showError(extractErrorMessage(err, "Պատասխանը չհաջողվեց պահպանել։"));
        return false;
      }
    },
    [queue, index, showError],
  );

  const handleMark = useCallback(
    async (grade: FlashcardGrade) => {
      if (busy || animating || !queue[index]) return;
      setBusy(true);
      try {
        await recordGrade(grade);
        // Advance either way: a failed write must not trap the student on a
        // card they have already answered.
        advance("forward", () => {
          setFlipped(false);
          setSelectedChoice(null);
          setAnswered(false);
          setIndex((i) => i + 1);
        });
      } finally {
        setBusy(false);
      }
    },
    [busy, animating, queue, index, recordGrade, advance],
  );

  const continueToNextRound = useCallback(() => {
    setRoundAck(index);
  }, [index]);

  const goNext = useCallback(() => {
    advance("forward", () => {
      setFlipped(false);
      setSelectedChoice(null);
      setAnswered(false);
      setIndex((i) => Math.min(i + 1, queue.length));
    });
  }, [advance, queue.length]);

  const goPrev = useCallback(() => {
    advance("back", () => {
      setFlipped(false);
      setSelectedChoice(null);
      setAnswered(false);
      setIndex((i) => Math.max(i - 1, 0));
    });
  }, [advance]);

  // Computed synchronously from the current card (not state+effect) so the
  // choice set is always ready the instant a new card's enter animation
  // starts — no one-frame flash of the previous card's choices.
  const currentCardId = queue[index]?.id;
  const choices = useMemo(() => {
    if (!data || currentCardId === undefined) return null;
    const card = data.cards.find((c) => c.id === currentCardId);
    return card ? buildChoices(card, data.cards) : null;
  }, [data, currentCardId]);
  const effectiveQuizMode = quizMode && choices !== null;

  const handleChoiceSelect = useCallback(
    async (choice: string) => {
      if (busy || animating || answered || !queue[index]) return;
      setBusy(true);
      setSelectedChoice(choice);
      setAnswered(true);
      try {
        const isCorrect = choice.trim() === queue[index].back_text.trim();
        await recordGrade(isCorrect ? "good" : "again");
      } finally {
        setBusy(false);
      }
    },
    [busy, animating, answered, queue, index, recordGrade],
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (finished || atRoundBoundary || animating || !queue[index]) return;

      if (effectiveQuizMode) {
        if (!answered) {
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            goPrev();
          } else {
            const i = ["1", "2", "3", "4"].indexOf(e.key);
            if (i >= 0 && choices && choices[i] !== undefined) {
              e.preventDefault();
              handleChoiceSelect(choices[i]);
            }
          }
        } else if (e.code === "Space" || e.key === "Enter") {
          e.preventDefault();
          goNext();
        }
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        setFlipped((f) => !f);
        return;
      }
      if (!flipped) {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          goPrev();
        }
        return;
      }
      if (e.key === "1") {
        e.preventDefault();
        handleMark("again");
      } else if (e.key === "2" || e.key === "Enter") {
        e.preventDefault();
        handleMark("good");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    flipped, finished, atRoundBoundary, animating, queue, index, handleMark, goPrev, goNext,
    effectiveQuizMode, answered, choices, handleChoiceSelect,
  ]);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function handleTouchEnd(e: React.TouchEvent) {
    const blocked = animating || (effectiveQuizMode ? answered : flipped);
    if (touchStartX.current === null || blocked) {
      touchStartX.current = null;
      return;
    }
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (delta >= SWIPE_THRESHOLD_PX) goPrev();
  }

  async function toggleFlag(cardId: number, key: "is_favorite" | "is_difficult") {
    const current = flags[cardId];
    const nextValue = !current?.[key];
    setFlags((prev) => ({
      ...prev,
      [cardId]: { ...(prev[cardId] ?? { status: "new", due_at: null, interval_days: 0 }), [key]: nextValue },
    }));
    try {
      await flagCard(cardId, key === "is_favorite" ? { favorite: nextValue } : { difficult: nextValue });
    } catch (err) {
      setFlags((prev) => ({ ...prev, [cardId]: { ...(prev[cardId] ?? current!), [key]: !nextValue } }));
      showError(extractErrorMessage(err, "Նշումը չհաջողվեց պահպանել։"));
    }
  }

  const learnedCount = useMemo(
    () => Object.values(sessionResults).filter((g) => g === "good").length,
    [sessionResults],
  );
  const needsReviewCount = useMemo(
    () => Object.values(sessionResults).filter((g) => g === "again").length,
    [sessionResults],
  );

  if (resource.isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-[var(--space-4)] py-[var(--space-6)]">
        <Skeleton className="mb-[var(--space-4)] h-5 w-1/2" />
        <Skeleton className="mb-[var(--space-5)] h-1.5 w-full" />
        <Skeleton className="mb-[var(--space-4)] h-[220px] w-full" />
        <div className="grid gap-[var(--space-3)] sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-2xl px-[var(--space-4)] py-[var(--space-6)]">
        <Link
          to="/flashcards"
          className="mb-[var(--space-4)] inline-flex items-center gap-[var(--space-2)] rounded-[var(--radius-md)] text-[length:var(--text-sm)] text-text-muted transition-colors hover:text-text"
        >
          <ArrowLeft size={16} strokeWidth={1.75} aria-hidden />
          Բառաքարտեր
        </Link>
        <ErrorState
          title="Փաթեթը չհաջողվեց բեռնել։"
          hint="Կապը կարող է ընդհատված լինել։ Ձեր առաջընթացը պահպանված է։"
          onRetry={resource.retry}
        />
      </div>
    );
  }

  const { deck } = data;
  const currentCard = queue[index];
  const currentFlags = currentCard ? flags[currentCard.id] : undefined;
  const wasCorrect = answered && selectedChoice !== null && currentCard
    ? selectedChoice.trim() === currentCard.back_text.trim()
    : null;
  const dueTotal = data.cards.filter((c) => isDue(data.progress[c.id])).length;

  function restart(nextMode: StudyMode = mode) {
    setMode(nextMode);
    startSession(data!, nextMode, shuffled);
  }

  function setCardStyle(next: boolean) {
    setQuizMode(next);
    setFlipped(false);
    setSelectedChoice(null);
    setAnswered(false);
  }

  async function handleReset() {
    if (!deckId) return;
    setResetting(true);
    try {
      await resetDeckProgress(Number(deckId));
      clearSavedSession(deckId);
      // Force the seed effect to re-run against the refetched deck, which
      // rebuilds the queue from scratch now that every card is due again.
      seededFrom.current = null;
      setRestored(false);
      resource.retry();
      setConfirmReset(false);
    } catch (err) {
      showError(extractErrorMessage(err, "Առաջընթացը չհաջողվեց զրոյացնել։"));
    } finally {
      setResetting(false);
    }
  }

  const transitionClass =
    transitionPhase === "exiting"
      ? transitionDir === "forward" ? "anim-card-out-left" : "anim-card-out-right"
      : transitionPhase === "entering"
        ? transitionDir === "forward" ? "anim-card-in-right" : "anim-card-in-left"
        : "";

  /*
    Session settings live behind one control instead of two permanent rows.

    Measured before this change at 375×812: the deck's five-line title plus a
    mode switch, two toggle pills, a timer, a progress bar and a counts strip
    pushed the top of the question card to y=507 — 62% of a phone screen spent
    on chrome before the thing being studied. Mode, order and card style are
    all session-level settings a student sets rarely and changes almost never
    mid-session, which is exactly what §10 says to reveal on demand.

    Putting them in a menu also fixes a quieter problem: each of them silently
    discards the queue, the position and the session's results. In a menu the
    consequence can be written next to the control, which is where the person
    is deciding to pay it.
  */
  const settingsItems: DropdownItem[] = [
    {
      key: "mode-due",
      label: `Կրկնվողներ (${dueTotal})`,
      checked: mode === "due",
      disabled: dueTotal === 0,
      onSelect: () => restart("due"),
    },
    {
      key: "mode-all",
      label: `Բոլոր քարտերը (${data.cards.length})`,
      checked: mode === "all",
      onSelect: () => restart("all"),
    },
    {
      key: "style-quiz",
      divider: true,
      label: "Թեստային ռեժիմ",
      hint: "Չորս տարբերակ՝ ընտրելու համար",
      checked: quizMode,
      onSelect: () => setCardStyle(true),
    },
    {
      key: "style-flip",
      label: "Դասական քարտ",
      hint: "Շրջիր և ինքդ գնահատիր",
      checked: !quizMode,
      onSelect: () => setCardStyle(false),
    },
    {
      key: "shuffle",
      divider: true,
      label: "Խառը հերթականություն",
      hint: "Փոխելը սկսում է սեսիան նորից",
      // A standalone on/off, not one of a pair — the two groups above it are.
      selection: "checkbox",
      checked: shuffled,
      onSelect: () => {
        const next = !shuffled;
        setShuffled(next);
        startSession(data!, mode, next);
      },
    },
    {
      key: "favorites",
      divider: true,
      label: "Ընտրյալ քարտեր",
      icon: <Star size={15} strokeWidth={1.75} aria-hidden />,
      onSelect: () => navigate(`/flashcards/favorites?subject=${deck.subject}`),
    },
    // Only for a deck the student owns. Every write endpoint behind the
    // manage screen requires ownership, so on a library deck this menu item
    // led to a page whose every control answered 404 — an offer the product
    // could not keep.
    ...(deck.is_owned
      ? [{
          key: "manage",
          label: "Խմբագրել փաթեթը",
          icon: <SquareStack size={15} strokeWidth={1.75} aria-hidden />,
          onSelect: () => navigate(`/flashcards/${deck.id}/manage`),
        } satisfies DropdownItem]
      : []),
    {
      key: "reset",
      divider: true,
      label: "Զրոյացնել առաջընթացը",
      icon: <RotateCcw size={15} strokeWidth={1.75} aria-hidden />,
      tone: "danger",
      onSelect: () => setConfirmReset(true),
    },
  ];

  const modeLabel = reviewingMissed
    ? "Սխալվածները"
    : mode === "due"
      ? "Կրկնվողներ"
      : "Բոլոր քարտերը";

  // The cards the student marked "want to learn" this session. Offering these
  // back as the session's next step is the difference between a summary that
  // reports and one that helps: without it the finish screen's only forward
  // action was to repeat all seven cards, including the three already known.
  const missedCards = queue.filter((c) => sessionResults[c.id] === "again");

  return (
    <div className="mx-auto max-w-2xl px-[var(--space-4)] pb-[var(--space-8)]">
      {/* One compact session bar, following the mock-exam runner's pattern:
          where am I, how far in, how do I leave, what can I change. */}
      <div className="sticky top-0 z-20 -mx-[var(--space-4)] mb-[var(--space-4)] border-b border-border bg-surface/95 px-[var(--space-4)] py-[var(--space-3)] backdrop-blur">
        <div className="flex items-center gap-[var(--space-3)]">
          <Link
            to="/flashcards"
            aria-label="Վերադառնալ բառաքարտերին"
            className="inline-flex shrink-0 items-center gap-[var(--space-2)] rounded-[var(--radius-md)] text-[length:var(--text-sm)] text-text-muted transition-colors hover:text-text"
          >
            <ArrowLeft size={16} strokeWidth={1.75} aria-hidden />
            {/* The label is the affordance on a wide screen; on a phone the
                bar has no room for it, so the arrow carries it and the name
                comes from aria-label rather than from the glyph. */}
            <span className="hidden sm:inline" aria-hidden>Բառաքարտեր</span>
          </Link>
          <h1 className="min-w-0 flex-1 truncate text-[length:var(--text-sm)] font-semibold text-text">
            {deck.title}
          </h1>
          {data.cards.length > 0 && (
            <span
              className="inline-flex shrink-0 items-center gap-1 text-[length:var(--text-xs)] tabular-nums text-text-muted"
              aria-label={`Սեսիայի տևողությունը՝ ${formatTimer(elapsedSeconds)}`}
            >
              <Timer size={13} strokeWidth={1.75} aria-hidden />
              {formatTimer(elapsedSeconds)}
            </span>
          )}
          {data.cards.length > 0 && (
            <Dropdown
              items={settingsItems}
              renderTrigger={(props) => (
                <IconButton
                  {...props}
                  variant="secondary"
                  size="sm"
                  aria-label="Սեսիայի կարգավորումներ"
                  icon={<Settings2 size={16} strokeWidth={1.75} aria-hidden />}
                />
              )}
            />
          )}
        </div>

        {data.cards.length > 0 && queue.length > 0 && !finished && (
          <div className="mt-[var(--space-3)] flex items-center gap-[var(--space-3)]">
            <ProgressBar
              percent={(100 * completed) / queue.length}
              heightClassName="h-1"
              label={`${completed} քարտ ${queue.length}-ից անցած`}
            />
            <span key={completed} className="anim-count-pop shrink-0 text-[length:var(--text-xs)] font-semibold tabular-nums text-text-muted">
              {completed} / {queue.length}
            </span>
          </div>
        )}
      </div>

      {data.cards.length === 0 ? (
        <EmptyState
          icon={<Layers size={24} strokeWidth={1.75} aria-hidden />}
          title="Այս փաթեթում քարտեր դեռ չկան։"
          hint="Ավելացրու առաջին քարտը՝ սովորելը սկսելու համար։"
          cta={{ label: "Ավելացնել քարտ", onClick: () => navigate(`/flashcards/create?deck=${deck.id}`) }}
        />
      ) : (
        <>
          {/* The mode the menu now hides, plus the session's running result —
              one quiet metadata line rather than two competing rows. */}
          {queue.length > 0 && !finished && (
            <p className="mb-[var(--space-4)] flex flex-wrap items-center gap-x-[var(--space-4)] gap-y-1 text-[length:var(--text-xs)] text-text-muted">
              <span>{modeLabel}</span>
              {roundsEnabled && <span>Փուլ {roundNumber} / {totalRounds}</span>}
              <span className="font-medium text-correct">Գիտեմ՝ {learnedCount}</span>
              <span className="font-medium text-primary">Սովորելու եմ՝ {needsReviewCount}</span>
            </p>
          )}

          {queue.length === 0 && !finished ? (
            <EmptyState
              tone="positive"
              icon={<CircleCheck size={24} strokeWidth={1.75} aria-hidden />}
              title="Այսօրվա համար կրկնվող քարտեր չկան։"
              hint="Կրկնությունների ժամանակացույցը ամեն քարտի համար առանձին է — վաղը նորից ստուգիր։"
              cta={{ label: "Ուսումնասիրել բոլոր քարտերը", onClick: () => restart("all") }}
            />
          ) : atRoundBoundary ? (
            <div className="flex flex-col items-center rounded-[var(--radius-lg)] border border-border bg-surface p-[var(--space-7)] text-center shadow-[var(--shadow-sm)] animate-[scale-in_var(--motion-normal)_var(--ease-out)]">
              <span className="relative mb-[var(--space-3)] inline-flex h-12 w-12 items-center justify-center text-primary">
                <span className="absolute inset-0 rounded-full bg-primary/15 anim-pulse-ring" />
                <Sparkles size={24} strokeWidth={1.75} aria-hidden className="relative" />
              </span>
              <h2 className="mb-[var(--space-5)] font-display text-[length:var(--text-xl)] leading-[var(--leading-display)] font-semibold text-text">
                {roundNumber - 1}-ին փուլն ավարտված է
              </h2>
              <div className="mb-[var(--space-6)] flex items-center gap-[var(--space-6)]">
                <RoundStat value={learnedCount} label="Գիտեմ" tone="correct" />
                <RoundStat value={needsReviewCount} label="Սովորելու եմ" tone="primary" />
                <RoundStat value={queue.length - index} label="Մնացել է" />
              </div>
              <Button onClick={continueToNextRound} className="w-full sm:w-auto">
                Շարունակել {roundNumber}-ին փուլը
              </Button>
            </div>
          ) : !finished ? (
            <div
              className="relative"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <div
                className={`relative ${transitionClass}`}
                onAnimationEnd={handleCardTransitionEnd}
              >
                <div className="absolute top-3 right-3 z-10 flex gap-2">
                  <IconButton
                    size="sm"
                    variant={currentFlags?.is_favorite ? "primary" : "secondary"}
                    aria-pressed={!!currentFlags?.is_favorite}
                    aria-label={currentFlags?.is_favorite ? "Հանել ընտրյալներից" : "Ավելացնել ընտրյալներում"}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFlag(currentCard.id, "is_favorite");
                    }}
                    icon={
                      <Star
                        size={15}
                        strokeWidth={1.75}
                        aria-hidden
                        fill={currentFlags?.is_favorite ? "currentColor" : "none"}
                      />
                    }
                  />
                  <IconButton
                    size="sm"
                    variant="secondary"
                    aria-pressed={!!currentFlags?.is_difficult}
                    aria-label={currentFlags?.is_difficult ? "Հանել «դժվար» նշումը" : "Նշել որպես դժվար"}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFlag(currentCard.id, "is_difficult");
                    }}
                    className={currentFlags?.is_difficult ? "border-incorrect bg-incorrect-bg text-incorrect" : ""}
                    icon={
                      <Flag
                        size={15}
                        strokeWidth={1.75}
                        aria-hidden
                        fill={currentFlags?.is_difficult ? "currentColor" : "none"}
                      />
                    }
                  />
                </div>

                {effectiveQuizMode ? (
                  <>
                    {/* Question panel — no flip, answer is hidden behind the choices below */}
                    <div className="flex min-h-[180px] flex-col items-center justify-center rounded-[var(--radius-lg)] border border-border bg-surface px-[var(--space-6)] py-[var(--space-7)] text-center shadow-[var(--shadow-sm)]">
                      {currentCard.topic && (
                        <span className="mb-[var(--space-4)] rounded-full border border-border px-3 py-1 text-[length:var(--text-xs)] font-medium text-text-muted">
                          {currentCard.topic}
                        </span>
                      )}
                      {currentCard.front_image_url && (
                        <img
                          src={currentCard.front_image_url}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="mb-4 max-h-40 rounded-[var(--radius-md)] object-contain"
                        />
                      )}
                      <div className="math-scroll w-full">
                        <MathText text={currentCard.front_text} className="text-[length:var(--text-xl)] leading-relaxed text-text" />
                      </div>
                      {deck.subject === "english" && (
                        <div className="mt-2">
                          <WordPronounce
                            key={currentCard.id}
                            text={currentCard.front_text}
                            translation={currentCard.translation}
                            allowTranslate={answered}
                          />
                        </div>
                      )}
                      {/* The hint stays after answering. Hiding it collapsed
                          the question panel the instant the student answered —
                          the result slid up under a moving target — and a hint
                          is teaching material once the answer is known, not a
                          spoiler to be withdrawn. */}
                      {currentCard.hint && (
                        <p className="mt-[var(--space-4)] flex items-start gap-2 text-[length:var(--text-sm)] text-text-muted">
                          <Lightbulb size={15} strokeWidth={1.75} aria-hidden className="mt-1 shrink-0 text-accent" />
                          <span className="math-scroll min-w-0"><MathText text={currentCard.hint!} /></span>
                        </p>
                      )}
                    </div>

                    {/* Four answer options. Not pills: an option can be a
                        multi-line formula, and a capsule around one reads as
                        a tag rather than a choice. */}
                    <div className="mt-[var(--space-4)] grid grid-cols-1 gap-[var(--space-3)] sm:grid-cols-2">
                      {choices!.map((choice, i) => {
                        const isCorrectChoice = choice.trim() === currentCard.back_text.trim();
                        const isSelected = choice === selectedChoice;
                        let cls = "border-border bg-surface text-text hover:border-primary hover:bg-surface-muted";
                        let shakeClass = "";
                        if (answered) {
                          if (isCorrectChoice) cls = "border-correct bg-correct-bg text-correct";
                          else if (isSelected) {
                            cls = "border-incorrect bg-incorrect-bg text-incorrect";
                            shakeClass = "animate-[shake-x_0.4s_ease-in-out]";
                          } else cls = "border-border bg-surface text-text-muted";
                        }
                        return (
                          <button
                            key={choice + i}
                            type="button"
                            disabled={busy || answered}
                            onClick={() => handleChoiceSelect(choice)}
                            className={`flex items-center gap-[var(--space-3)] rounded-[var(--radius-lg)] border px-[var(--space-4)] py-[var(--space-3)] text-left font-medium transition-colors duration-[var(--motion-fast)] disabled:cursor-default ${cls} ${shakeClass}`}
                          >
                            <span
                              aria-hidden
                              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-current text-[length:var(--text-xs)] font-semibold opacity-70"
                            >
                              {CHOICE_LETTERS[i]}
                            </span>
                            <span className="math-scroll min-w-0 flex-1">
                              <MathText text={choice} />
                            </span>
                            {/* Correctness is never carried by colour alone. */}
                            {answered && isCorrectChoice && (
                              <Check size={17} strokeWidth={2.5} aria-hidden className="shrink-0" />
                            )}
                            {answered && isSelected && !isCorrectChoice && (
                              <X size={17} strokeWidth={2.5} aria-hidden className="shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {answered && (
                      <div
                        className={`mt-[var(--space-4)] rounded-[var(--radius-lg)] border p-[var(--space-5)] shadow-[var(--shadow-sm)] animate-[slide-up-in_var(--motion-fast)_var(--ease-out)] ${
                          wasCorrect ? "border-correct bg-correct-bg" : "border-incorrect bg-incorrect-bg"
                        }`}
                      >
                        <p className={`mb-[var(--space-2)] flex items-center gap-2 font-semibold ${wasCorrect ? "text-correct" : "text-incorrect"}`}>
                          {wasCorrect
                            ? <CircleCheck size={18} strokeWidth={2} aria-hidden />
                            : <X size={18} strokeWidth={2.5} aria-hidden />}
                          {wasCorrect ? "Ճիշտ է" : "Սխալ է"}
                        </p>
                        {!wasCorrect && (
                          <p className="mb-[var(--space-2)] text-[length:var(--text-sm)] text-text">
                            Ճիշտ պատասխանը՝{" "}
                            <span className="math-scroll inline-block max-w-full align-bottom">
                              <MathText text={currentCard.back_text} />
                            </span>
                          </p>
                        )}
                        {currentCard.back_image_url && (
                          <img
                            src={currentCard.back_image_url}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className="mb-2 max-h-32 rounded-[var(--radius-md)] object-contain"
                          />
                        )}
                        {currentCard.explanation ? (
                          <div className="math-scroll text-[length:var(--text-sm)] text-text-muted">
                            <MathText text={currentCard.explanation} />
                          </div>
                        ) : !wasCorrect ? (
                          <p className="text-[length:var(--text-sm)] text-text-muted">
                            Այս քարտը հաջորդ անգամ նորից կհայտնվի։
                          </p>
                        ) : null}
                        {currentCard.notes && (
                          <p className="mt-[var(--space-2)] flex items-start gap-2 text-[length:var(--text-xs)] text-text-muted">
                            <StickyNote size={13} strokeWidth={1.75} aria-hidden className="mt-0.5 shrink-0" />
                            <span className="math-scroll min-w-0"><MathText text={currentCard.notes} /></span>
                          </p>
                        )}
                        {currentCard.audio_url && (
                          <audio controls src={currentCard.audio_url} className="mt-3 h-9" />
                        )}
                        <Button onClick={goNext} className="mt-[var(--space-4)] w-full">
                          {index + 1 >= queue.length ? "Ավարտել սեսիան" : "Հաջորդ քարտը"}
                        </Button>
                      </div>
                    )}

                    <p className="mt-[var(--space-3)] hidden text-center text-[length:var(--text-xs)] text-text-muted sm:block">
                      {answered ? "␣ / Enter՝ հաջորդը" : "1–4՝ ընտրել · ←՝ նախորդը"}
                    </p>
                  </>
                ) : (
                  <>
                    {quizMode && choices === null && (
                      <p className="mb-[var(--space-2)] text-center text-[length:var(--text-xs)] text-text-muted">
                        Այս փաթեթում քիչ են քարտերը ընտրովի հարցերի համար՝ ցուցադրվում է դասական քարտ
                      </p>
                    )}
                    <div
                      className="flashcard-scene min-h-[260px]"
                      onPointerMove={handleTiltMove}
                      onPointerLeave={handleTiltLeave}
                    >
                      <div
                        ref={flipInnerRef}
                        onClick={() => setFlipped((f) => !f)}
                        className={`flashcard-flip-inner min-h-[260px] cursor-pointer ${flipped ? "is-flipped" : ""}`}
                      >
                        {/* Front face. `inert` on the face that is turned away
                            does two things the 3D transform alone cannot: it
                            takes the hidden side out of the accessibility tree
                            — otherwise a screen reader reads the answer aloud
                            while the card is still showing the question, and
                            the flip means nothing — and out of the tab order,
                            so an audio player on the back cannot be focused
                            while it is facing away. */}
                        <div
                          inert={flipped}
                          className="flashcard-face flex min-h-[260px] flex-col items-center justify-center rounded-[var(--radius-lg)] border border-border bg-surface px-[var(--space-6)] py-[var(--space-7)] text-center shadow-[var(--shadow-sm)]"
                        >
                          {currentCard.topic && (
                            <span className="mb-[var(--space-4)] rounded-full border border-border px-3 py-1 text-[length:var(--text-xs)] font-medium text-text-muted">
                              {currentCard.topic}
                            </span>
                          )}
                          {currentCard.front_image_url && (
                            <img
                              src={currentCard.front_image_url}
                              alt=""
                              loading="lazy"
                              decoding="async"
                              className="mb-4 max-h-40 rounded-[var(--radius-md)] object-contain"
                            />
                          )}
                          <div className="math-scroll w-full">
                            <MathText text={currentCard.front_text} className="text-[length:var(--text-xl)] leading-relaxed text-text" />
                          </div>
                          {deck.subject === "english" && (
                            <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                              <WordPronounce key={currentCard.id} text={currentCard.front_text} translation={currentCard.translation} />
                            </div>
                          )}
                          {currentCard.hint && (
                            <p className="mt-[var(--space-4)] flex items-start gap-2 text-[length:var(--text-sm)] text-text-muted">
                              <Lightbulb size={15} strokeWidth={1.75} aria-hidden className="mt-1 shrink-0 text-accent" />
                              <span className="math-scroll min-w-0"><MathText text={currentCard.hint!} /></span>
                            </p>
                          )}
                        </div>

                        {/* Back face */}
                        <div
                          inert={!flipped}
                          className="flashcard-face flashcard-face-back flex min-h-[260px] flex-col items-center justify-center rounded-[var(--radius-lg)] border border-primary bg-surface-muted px-[var(--space-6)] py-[var(--space-7)] text-center shadow-[var(--shadow-sm)]"
                        >
                          {currentCard.back_image_url && (
                            <img
                              src={currentCard.back_image_url}
                              alt=""
                              loading="lazy"
                              decoding="async"
                              className="mb-4 max-h-40 rounded-[var(--radius-md)] object-contain"
                            />
                          )}
                          <div className="math-scroll w-full">
                            <MathText text={currentCard.back_text} className="text-[length:var(--text-xl)] leading-relaxed text-text" />
                          </div>
                          {currentCard.explanation && (
                            <div className="math-scroll mt-[var(--space-4)] w-full text-[length:var(--text-sm)] text-text-muted">
                              <MathText text={currentCard.explanation} />
                            </div>
                          )}
                          {currentCard.notes && (
                            <p className="mt-[var(--space-2)] flex items-start gap-2 text-[length:var(--text-xs)] text-text-muted">
                              <StickyNote size={13} strokeWidth={1.75} aria-hidden className="mt-0.5 shrink-0" />
                              <span className="math-scroll min-w-0"><MathText text={currentCard.notes} /></span>
                            </p>
                          )}
                          {currentCard.audio_url && (
                            <audio controls src={currentCard.audio_url} className="mt-4 h-9" onClick={(e) => e.stopPropagation()} />
                          )}
                        </div>
                      </div>
                    </div>

                    {flipped ? (
                      <>
                        <div className="mt-[var(--space-5)] grid grid-cols-2 gap-[var(--space-3)]">
                          <Button
                            variant="secondary"
                            size="lg"
                            disabled={busy || animating}
                            onClick={() => handleMark("again")}
                            iconLeft={<RotateCcw size={16} strokeWidth={1.75} aria-hidden />}
                          >
                            Ուզում եմ սովորել
                          </Button>
                          <Button
                            size="lg"
                            disabled={busy || animating}
                            onClick={() => handleMark("good")}
                            iconLeft={<Check size={16} strokeWidth={2.25} aria-hidden />}
                          >
                            Գիտեմ
                          </Button>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFlipped(false)}
                          className="mt-[var(--space-3)] w-full rounded-[var(--radius-md)] py-1 text-center text-[length:var(--text-sm)] text-text-muted transition-colors hover:text-text"
                        >
                          Տեսնել հարցը նորից
                        </button>
                        <p className="mt-[var(--space-1)] hidden text-center text-[length:var(--text-xs)] text-text-muted sm:block">
                          ␣՝ շրջել · 1՝ ուզում եմ սովորել · 2 / Enter՝ գիտեմ
                        </p>
                      </>
                    ) : (
                      <>
                        {/* The card itself flips on click, but a div with an
                            onClick is not a control: it takes no focus and is
                            announced as nothing. The one action this screen
                            has now has a real button, which also gives the
                            area below the card something to say on a phone,
                            where the only previous instruction was a line of
                            grey text about swiping. */}
                        <Button
                          variant="secondary"
                          size="lg"
                          className="mt-[var(--space-5)] w-full"
                          onClick={() => setFlipped(true)}
                          iconLeft={<Eye size={16} strokeWidth={1.75} aria-hidden />}
                        >
                          Ցույց տալ պատասխանը
                        </Button>
                        <p className="mt-[var(--space-2)] text-center text-[length:var(--text-xs)] text-text-muted">
                          <span className="hidden sm:inline">␣՝ շրջել · ←՝ նախորդը</span>
                          <span className="sm:hidden">Սահեցրու աջ՝ նախորդ քարտին վերադառնալու համար</span>
                        </p>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center rounded-[var(--radius-lg)] border border-border bg-surface p-[var(--space-7)] text-center shadow-[var(--shadow-sm)] animate-[scale-in_var(--motion-normal)_var(--ease-out)]">
              <span className="relative mb-[var(--space-3)] inline-flex h-14 w-14 items-center justify-center text-correct">
                <span className="absolute inset-0 rounded-full bg-correct/15 anim-pulse-ring" />
                <CircleCheck size={28} strokeWidth={1.75} aria-hidden className="relative" />
              </span>
              <h2 className="mb-[var(--space-5)] font-display text-[length:var(--text-xl)] leading-[var(--leading-display)] font-semibold text-text">
                Սեսիան ավարտված է
              </h2>
              <div className="mb-[var(--space-3)] flex items-center gap-[var(--space-6)]">
                <RoundStat value={learnedCount} label="Գիտեմ" tone="correct" size="lg" />
                <RoundStat value={needsReviewCount} label="Սովորելու եմ" tone="primary" size="lg" />
                <RoundStat value={formatTimer(elapsedSeconds)} label="Ժամանակ" size="lg" />
              </div>
              <p className="mb-[var(--space-6)] min-h-4 text-[length:var(--text-xs)] text-text-muted">
                {needsReviewCount > 0
                  ? `${needsReviewCount} քարտ հաջորդ անգամ նորից կհայտնվի`
                  : "Բոլոր քարտերը գիտես — կրկնությունը կվերադառնա ավելի ուշ"}
              </p>
              <div className="flex w-full flex-col gap-[var(--space-2)] sm:max-w-xs">
                {missedCards.length > 0 && (
                  <Button
                    onClick={() => beginSession(missedCards, true)}
                    iconLeft={<RotateCcw size={16} strokeWidth={1.75} aria-hidden />}
                  >
                    Կրկնել սխալվածները ({missedCards.length})
                  </Button>
                )}
                <Button
                  variant={missedCards.length > 0 ? "secondary" : "primary"}
                  onClick={() => restart(mode)}
                >
                  {reviewingMissed ? "Ամբողջ փաթեթը նորից" : "Կրկնել սեսիան"}
                </Button>
                <Button variant="ghost" onClick={() => navigate("/flashcards")}>
                  Փաթեթների ցանկ
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Resetting wipes the spaced-repetition schedule for every card in the
          deck and cannot be undone. It used to be a bare button one row under
          "repeat the session". */}
      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Զրոյացնե՞լ այս փաթեթի առաջընթացը"
        description={`«${deck.title}» փաթեթի բոլոր ${data.cards.length} քարտերը կդառնան նոր, և կրկնությունների ժամանակացույցը կսկսվի զրոյից։ Այս գործողությունը հնարավոր չէ հետարկել։ Ընտրյալ և դժվար նշումները կմնան։`}
        confirmLabel="Զրոյացնել"
        busy={resetting}
        onConfirm={handleReset}
      />
    </div>
  );
}

function RoundStat({
  value,
  label,
  tone,
  size = "md",
}: {
  value: number | string;
  label: string;
  tone?: "correct" | "primary";
  size?: "md" | "lg";
}) {
  const toneClass = tone === "correct" ? "text-correct" : tone === "primary" ? "text-primary" : "text-text";
  return (
    <div className="text-center">
      <div
        key={String(value)}
        className={`anim-count-pop font-semibold tabular-nums ${toneClass} ${size === "lg" ? "text-[length:var(--text-xl)]" : "text-[length:var(--text-lg)]"}`}
      >
        {value}
      </div>
      <div className="text-[length:var(--text-xs)] text-text-muted">{label}</div>
    </div>
  );
}
