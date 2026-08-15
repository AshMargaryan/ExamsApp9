import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  flagCard, getDeckCards, isDue, markCard, resetDeckProgress,
  type CardProgress, type DeckCards, type Flashcard, type FlashcardGrade,
} from "../api/flashcards";
import { MathText } from "../components/MathText";
import { SegmentedControl } from "../components/SegmentedControl";
import { WordPronounce } from "../components/flashcards/WordPronounce";
import { LinkButton } from "../components/ui/LinkButton";

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

// 1 correct answer + up to 3 distractors pulled from other cards' answers in
// the same deck. Returns null when the deck doesn't have enough distinct
// answers to build a fair 4-choice question (caller falls back to flip mode).
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
  const [data, setData] = useState<DeckCards | null>(null);
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
  // Highest index boundary the student has clicked "Continue" past — used to
  // show a one-time "round complete" interstitial every ROUND_SIZE cards.
  const [roundAck, setRoundAck] = useState(0);
  const touchStartX = useRef<number | null>(null);

  // Card-to-card transition — advancing/going back plays a short exit
  // animation on the current card, then (on animationend) the real state
  // change commits and a matching entrance animation plays for the next
  // card, so the queue reads as one continuous motion instead of an
  // instant content swap.
  const [transitionPhase, setTransitionPhase] = useState<TransitionPhase>("idle");
  const [transitionDir, setTransitionDir] = useState<TransitionDirection>("forward");
  const transitionCommitRef = useRef<(() => void) | null>(null);
  const animating = transitionPhase !== "idle";

  const advance = useCallback((direction: TransitionDirection, commit: () => void) => {
    transitionCommitRef.current = commit;
    setTransitionDir(direction);
    setTransitionPhase("exiting");
  }, []);

  function handleCardTransitionEnd(e: React.AnimationEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget) return; // ignore bubbled child animations (shake, pop-in, eq-bar)
    if (transitionPhase === "exiting") {
      transitionCommitRef.current?.();
      transitionCommitRef.current = null;
      setTransitionPhase("entering");
    } else if (transitionPhase === "entering") {
      setTransitionPhase("idle");
    }
  }

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

  // Explicit session (re)start.
  const startSession = useCallback(
    (d: DeckCards, useMode: StudyMode, doShuffle: boolean) => {
      const built = buildQueue(d, useMode, doShuffle);
      setQueue(built);
      setIndex(0);
      setFlipped(false);
      setSelectedChoice(null);
      setAnswered(false);
      setSessionResults({});
      setElapsedSeconds(0);
      setRoundAck(0);
      setTransitionPhase("idle");
      if (deckId) clearSavedSession(deckId);
    },
    [buildQueue, deckId],
  );

  useEffect(() => {
    if (!deckId) return;
    getDeckCards(Number(deckId)).then((d) => {
      setData(d);
      setFlags(d.progress);

      const saved = loadSavedSession(deckId);
      const cardById = new Map(d.cards.map((c) => [c.id, c]));
      if (saved && saved.cardIds.length > 0 && saved.cardIds.every((id) => cardById.has(id))) {
        setMode(saved.mode);
        setShuffled(saved.shuffled);
        setQuizMode(saved.quizMode ?? true);
        setQueue(saved.cardIds.map((id) => cardById.get(id)!));
        setIndex(saved.index);
        setSessionResults(saved.sessionResults);
        setRoundAck(saved.roundAck ?? 0);
        setFlipped(false);
        setSelectedChoice(null);
        setAnswered(false);
      } else {
        const initialMode: StudyMode = d.cards.some((c) => isDue(d.progress[c.id])) ? "due" : "all";
        setMode(initialMode);
        startSession(d, initialMode, false);
      }
      setRestored(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckId]);

  const finished = data !== null && index >= queue.length;
  // A round boundary: the student just finished a multiple of ROUND_SIZE
  // cards, more are left, and they haven't clicked "Continue" past it yet.
  const atRoundBoundary =
    !finished && index > 0 && index % ROUND_SIZE === 0 && index < queue.length && roundAck < index;
  const roundNumber = Math.floor(index / ROUND_SIZE) + 1;
  const totalRounds = Math.max(1, Math.ceil(queue.length / ROUND_SIZE));

  // Remember position: snapshot the session on every meaningful change so a
  // reload resumes exactly where the student left off.
  useEffect(() => {
    if (!deckId || !restored || queue.length === 0) return;
    saveSession(deckId, {
      cardIds: queue.map((c) => c.id), index, mode, shuffled, sessionResults, roundAck, quizMode,
    });
  }, [deckId, restored, queue, index, mode, shuffled, sessionResults, roundAck, quizMode]);

  useEffect(() => {
    if (finished && deckId) clearSavedSession(deckId);
  }, [finished, deckId]);

  // Live study timer — session-only, not persisted.
  useEffect(() => {
    if (finished) return;
    const id = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [finished]);

  // Records a grade against the backend (spaced-repetition scheduling) without
  // touching the UI's current-card pointer — both the flip-mode buttons and
  // the quiz-mode answer picker call this, then decide separately when to
  // actually move on. "good" = knew it (spaced interval grows). "again" =
  // wants to learn it (due immediately, but — since nothing is pushed back
  // into `queue` — it will only resurface the NEXT time the student opens
  // this deck, not again in this session).
  const recordGrade = useCallback(
    async (grade: FlashcardGrade) => {
      if (!queue[index]) return;
      const card = queue[index];
      await markCard(card.id, grade);
      setSessionResults((prev) => ({ ...prev, [card.id]: grade }));
    },
    [queue, index],
  );

  const handleMark = useCallback(
    async (grade: FlashcardGrade) => {
      if (busy || animating || !queue[index]) return;
      setBusy(true);
      try {
        await recordGrade(grade);
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
    } catch {
      setFlags((prev) => ({ ...prev, [cardId]: { ...(prev[cardId] ?? current!), [key]: !nextValue } }));
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

  if (!data) {
    return (
      <div className="mx-auto max-w-2xl animate-pulse px-4 py-8">
        <div className="mb-6 h-8 w-1/2 rounded bg-surface-muted" />
        <div className="mb-4 h-8 w-full rounded bg-surface-muted" />
        <div className="h-72 rounded-[var(--radius)] bg-surface-muted" />
      </div>
    );
  }

  const { deck } = data;
  const currentCard = queue[index];
  const currentFlags = currentCard ? flags[currentCard.id] : undefined;
  const wasCorrect = answered && selectedChoice !== null && currentCard
    ? selectedChoice.trim() === currentCard.back_text.trim()
    : null;

  function restart(nextMode: StudyMode = mode) {
    setMode(nextMode);
    startSession(data!, nextMode, shuffled);
  }

  function toggleShuffle() {
    const next = !shuffled;
    setShuffled(next);
    startSession(data!, mode, next);
  }

  function toggleQuizMode() {
    setQuizMode((q) => !q);
    setFlipped(false);
    setSelectedChoice(null);
    setAnswered(false);
  }

  async function handleReset() {
    if (!deckId) return;
    await resetDeckProgress(Number(deckId));
    const fresh = await getDeckCards(Number(deckId));
    setData(fresh);
    setFlags(fresh.progress);
    setMode("all");
    startSession(fresh, "all", shuffled);
  }

  const dueTotal = data.cards.filter((c) => isDue(data.progress[c.id])).length;

  const transitionClass =
    transitionPhase === "exiting"
      ? transitionDir === "forward" ? "anim-card-out-left" : "anim-card-out-right"
      : transitionPhase === "entering"
        ? transitionDir === "forward" ? "anim-card-in-right" : "anim-card-in-left"
        : "";

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-4 flex items-center justify-between">
        <LinkButton to="/flashcards" className="btn-fx rounded-full">
          ← Բառաքարտեր
        </LinkButton>
        <LinkButton
          to={`/flashcards/favorites?subject=${deck.subject}`}
          className="btn-fx rounded-full"
        >
          ⭐ Ընտրյալներ
        </LinkButton>
      </div>
      <h1 className="mb-3 text-2xl font-semibold text-text">{deck.title}</h1>

      {data.cards.length === 0 ? (
        <div className="flex flex-col items-center rounded-[var(--radius)] border border-dashed border-border bg-surface p-10 text-center text-text-muted">
          <span className="mb-3 text-3xl" aria-hidden>🗂️</span>
          Այս փաթեթում քարտեր դեռ չկան։
        </div>
      ) : (
        <>
          {/* Toolbar — three clearly separated rows (mode, settings, timer)
              instead of packing every control into one crowded line. */}
          <div className="mb-3">
            <SegmentedControl
              options={[
                { value: "due" as StudyMode, label: `Կրկնվողներ (${dueTotal})` },
                { value: "all" as StudyMode, label: `Բոլորը (${data.cards.length})` },
              ]}
              value={mode}
              onChange={(m) => restart(m)}
            />
          </div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={toggleQuizMode}
                className={`btn-fx rounded-full border px-3 py-1.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                  quizMode ? "border-primary bg-primary/10 text-primary" : "border-border text-text hover:border-primary"
                }`}
                title="Ընտրովի պատասխաններով թեստ"
              >
                🧠 Թեստային ռեժիմ
              </button>
              <button
                type="button"
                onClick={toggleShuffle}
                className={`btn-fx rounded-full border px-3 py-1.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                  shuffled ? "border-primary bg-primary/10 text-primary" : "border-border text-text hover:border-primary"
                }`}
                title="Խառնել քարտերի հերթականությունը"
              >
                🔀 Խառնել
              </button>
            </div>
            <span className="text-sm font-medium text-text-muted tabular-nums">
              ⏱ {formatTimer(elapsedSeconds)}
            </span>
          </div>

          {queue.length === 0 && !finished ? (
            <div className="flex flex-col items-center rounded-[var(--radius)] border border-dashed border-border bg-surface p-10 text-center">
              <span className="mb-3 text-3xl" aria-hidden>🎉</span>
              <p className="mb-5 text-text-muted">Այսօրվա համար կրկնվող քարտեր չկան</p>
              <button
                type="button"
                onClick={() => restart("all")}
                className="btn-fx btn-fx-glow rounded-full bg-primary px-4 py-2 font-medium text-primary-contrast hover:bg-primary-hover"
              >
                Ուսումնասիրել բոլոր քարտերը
              </button>
            </div>
          ) : atRoundBoundary ? (
            <div className="mt-6 flex flex-col items-center rounded-[var(--radius)] border border-border bg-surface p-10 text-center shadow-[var(--shadow-sm)] animate-[scale-in_var(--motion-normal)_var(--ease-out)]">
              <span className="relative mb-3 inline-flex h-14 w-14 items-center justify-center text-3xl">
                <span className="absolute inset-0 rounded-full bg-primary/20 anim-pulse-ring" />
                <span className="relative">🎉</span>
              </span>
              <h2 className="mb-5 text-xl font-semibold text-text">
                {roundNumber - 1}-ին փուլն ավարտված է
              </h2>
              <div className="mb-7 flex items-center gap-7">
                <div className="text-center">
                  <div key={`r-${learnedCount}`} className="anim-count-pop text-lg font-semibold text-correct tabular-nums">
                    {learnedCount}
                  </div>
                  <div className="text-xs text-text-muted">Գիտեմ</div>
                </div>
                <div className="text-center">
                  <div key={`r-${needsReviewCount}`} className="anim-count-pop text-lg font-semibold text-primary tabular-nums">
                    {needsReviewCount}
                  </div>
                  <div className="text-xs text-text-muted">Սովորելու եմ</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-text tabular-nums">{queue.length - index}</div>
                  <div className="text-xs text-text-muted">Մնացել է</div>
                </div>
              </div>
              <button
                type="button"
                onClick={continueToNextRound}
                className="btn-fx btn-fx-glow w-full rounded-full bg-primary px-4 py-2.5 font-medium text-primary-contrast hover:bg-primary-hover sm:w-auto"
              >
                Շարունակել {roundNumber}-ին փուլը →
              </button>
            </div>
          ) : !finished ? (
            <>
              {/* Progress: fill bar + popping "current / total" counter, phase
                  and running known/learning counts sit just underneath. */}
              <div className="mb-2 flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                    style={{ width: `${queue.length ? (100 * index) / queue.length : 0}%` }}
                  />
                </div>
                <span key={index} className="anim-count-pop shrink-0 text-xs font-semibold text-text-muted tabular-nums">
                  {index} / {queue.length}
                </span>
              </div>
              <div className="mb-4 flex items-center justify-center gap-5 text-xs text-text-muted">
                <span>Փուլ {roundNumber} / {totalRounds}</span>
                <span className="font-medium text-correct">Գիտեմ՝ {learnedCount}</span>
                <span className="font-medium text-primary">Սովորելու եմ՝ {needsReviewCount}</span>
              </div>

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
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFlag(currentCard.id, "is_favorite");
                      }}
                      title="Ընտրյալ"
                      className={`btn-icon-fx flex h-8 w-8 items-center justify-center rounded-full border text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                        currentFlags?.is_favorite
                          ? "border-primary bg-primary text-primary-contrast"
                          : "border-border bg-surface text-text-muted hover:text-text"
                      }`}
                    >
                      <span key={currentFlags?.is_favorite ? "on" : "off"} className="inline-block animate-[pop-in_0.3s_ease-out]">⭐</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFlag(currentCard.id, "is_difficult");
                      }}
                      title="Դժվար է ինձ համար"
                      className={`btn-icon-fx flex h-8 w-8 items-center justify-center rounded-full border text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                        currentFlags?.is_difficult
                          ? "border-incorrect bg-incorrect-bg text-incorrect"
                          : "border-border bg-surface text-text-muted hover:text-text"
                      }`}
                    >
                      <span key={currentFlags?.is_difficult ? "on" : "off"} className="inline-block animate-[pop-in_0.3s_ease-out]">🚩</span>
                    </button>
                  </div>

                  {effectiveQuizMode ? (
                    <>
                      {/* Question panel — no flip, answer is hidden behind the choices below */}
                      <div className="flex min-h-[220px] flex-col items-center justify-center rounded-[var(--radius)] border border-border bg-surface p-8 text-center shadow-[var(--shadow-sm)]">
                        <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
                          {currentCard.topic && (
                            <span className="rounded-full border border-border px-3 py-1 text-xs font-medium tracking-wide text-text-muted uppercase">
                              {currentCard.topic}
                            </span>
                          )}
                        </div>
                        {currentCard.front_image_url && (
                          <img
                            src={currentCard.front_image_url}
                            alt=""
                            className="mb-4 max-h-40 rounded-md object-contain"
                          />
                        )}
                        <MathText text={currentCard.front_text} className="text-xl leading-relaxed text-text" />
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
                        {currentCard.hint && !answered && (
                          <p className="mt-4 text-sm text-text-muted">
                            💡 <MathText text={currentCard.hint!} />
                          </p>
                        )}
                      </div>

                      {/* 4 answer choices */}
                      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {choices!.map((choice, i) => {
                          const isCorrectChoice = choice.trim() === currentCard.back_text.trim();
                          const isSelected = choice === selectedChoice;
                          let cls = "border-border text-text hover:border-primary";
                          let shakeClass = "";
                          if (answered) {
                            if (isCorrectChoice) cls = "border-correct bg-correct-bg text-correct";
                            else if (isSelected) {
                              cls = "border-incorrect bg-incorrect-bg text-incorrect";
                              shakeClass = "animate-[shake-x_0.4s_ease-in-out]";
                            } else cls = "border-border text-text-muted opacity-50";
                          }
                          return (
                            <button
                              key={choice + i}
                              type="button"
                              disabled={busy || answered}
                              onClick={() => handleChoiceSelect(choice)}
                              className={`btn-fx flex items-start gap-2 rounded-full border px-4 py-3 text-left font-medium disabled:cursor-default focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${cls} ${shakeClass}`}
                            >
                              <span className="shrink-0 text-xs text-text-muted">{CHOICE_LETTERS[i]}.</span>
                              <MathText text={choice} />
                            </button>
                          );
                        })}
                      </div>

                      {answered && (
                        <div
                          className={`mt-4 rounded-[var(--radius)] border p-5 shadow-[var(--shadow-sm)] animate-[slide-up-in_var(--motion-fast)_var(--ease-out)] ${
                            wasCorrect ? "border-correct bg-correct-bg" : "border-incorrect bg-incorrect-bg"
                          }`}
                        >
                          <p className={`mb-2 flex items-center gap-2 font-semibold ${wasCorrect ? "text-correct" : "text-incorrect"}`}>
                            <span className="relative inline-flex h-6 w-6 items-center justify-center">
                              {wasCorrect && <span className="absolute inset-0 rounded-full bg-correct/30 anim-pulse-ring" />}
                              <span className="relative">{wasCorrect ? "✅" : "❌"}</span>
                            </span>
                            {wasCorrect ? "Ճիշտ է!" : "Սխալ է"}
                          </p>
                          {!wasCorrect && (
                            <p className="mb-2 text-sm text-text">
                              Ճիշտ պատասխանը՝ <MathText text={currentCard.back_text} />
                            </p>
                          )}
                          {currentCard.back_image_url && (
                            <img
                              src={currentCard.back_image_url}
                              alt=""
                              className="mb-2 max-h-32 rounded-md object-contain"
                            />
                          )}
                          {currentCard.explanation ? (
                            <p className="text-sm text-text-muted">
                              <MathText text={currentCard.explanation} />
                            </p>
                          ) : !wasCorrect ? (
                            <p className="text-sm text-text-muted">Այս քարտը հաջորդ անգամ նորից կհայտնվի։</p>
                          ) : null}
                          {currentCard.notes && (
                            <p className="mt-2 text-xs text-text-muted italic">
                              📝 <MathText text={currentCard.notes} />
                            </p>
                          )}
                          {currentCard.audio_url && (
                            <audio controls src={currentCard.audio_url} className="mt-3 h-9" />
                          )}
                          <button
                            type="button"
                            onClick={goNext}
                            className="btn-fx btn-fx-glow mt-4 w-full rounded-full bg-primary px-4 py-2.5 font-medium text-primary-contrast hover:bg-primary-hover"
                          >
                            Հաջորդ →
                          </button>
                        </div>
                      )}

                      <p className="mt-3 text-center text-xs text-text-muted">
                        {answered ? "␣ / Enter հաջորդ" : "1-4 ընտրել · ← նախորդ"}
                      </p>
                    </>
                  ) : (
                    <>
                      {quizMode && choices === null && (
                        <p className="mb-2 text-center text-xs text-text-muted">
                          Այս փաթեթում քիչ են քարտերը ընտրովի հարցերի համար՝ ցուցադրվում է դասական քարտ
                        </p>
                      )}
                      <div
                        className="flashcard-scene min-h-[280px]"
                        onPointerMove={handleTiltMove}
                        onPointerLeave={handleTiltLeave}
                      >
                        <div
                          ref={flipInnerRef}
                          onClick={() => setFlipped((f) => !f)}
                          className={`flashcard-flip-inner min-h-[280px] cursor-pointer ${flipped ? "is-flipped" : ""}`}
                        >
                          {/* Front face */}
                          <div className="flashcard-face flex min-h-[280px] flex-col items-center justify-center rounded-[var(--radius)] border border-border bg-surface p-8 text-center shadow-[var(--shadow-sm)]">
                            <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
                              {currentCard.topic && (
                                <span className="rounded-full border border-border px-3 py-1 text-xs font-medium tracking-wide text-text-muted uppercase">
                                  {currentCard.topic}
                                </span>
                              )}
                            </div>
                            {currentCard.front_image_url && (
                              <img
                                src={currentCard.front_image_url}
                                alt=""
                                className="mb-4 max-h-40 rounded-md object-contain"
                              />
                            )}
                            <MathText text={currentCard.front_text} className="text-xl leading-relaxed text-text" />
                            {deck.subject === "english" && (
                              <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                                <WordPronounce key={currentCard.id} text={currentCard.front_text} translation={currentCard.translation} />
                              </div>
                            )}
                            {currentCard.hint && (
                              <p className="mt-4 text-sm text-text-muted">
                                💡 <MathText text={currentCard.hint!} />
                              </p>
                            )}
                            <p className="mt-6 text-sm text-primary">Սեղմիր կամ սեղմիր Space՝ պատասխանը տեսնելու համար</p>
                          </div>

                          {/* Back face */}
                          <div className="flashcard-face flashcard-face-back flex min-h-[280px] flex-col items-center justify-center rounded-[var(--radius)] border border-primary bg-surface-muted p-8 text-center shadow-[var(--shadow-sm)]">
                            {currentCard.back_image_url && (
                              <img
                                src={currentCard.back_image_url}
                                alt=""
                                className="mb-4 max-h-40 rounded-md object-contain"
                              />
                            )}
                            <MathText text={currentCard.back_text} className="text-xl leading-relaxed text-text" />
                            {currentCard.explanation && (
                              <p className="mt-4 text-sm text-text-muted">
                                <MathText text={currentCard.explanation} />
                              </p>
                            )}
                            {currentCard.notes && (
                              <p className="mt-2 text-xs text-text-muted italic">
                                📝 <MathText text={currentCard.notes} />
                              </p>
                            )}
                            {currentCard.audio_url && (
                              <audio controls src={currentCard.audio_url} className="mt-4 h-9" onClick={(e) => e.stopPropagation()} />
                            )}
                          </div>
                        </div>
                      </div>

                      {flipped && (
                        <>
                          <div className="mt-6 grid grid-cols-2 gap-4">
                            <button
                              type="button"
                              disabled={busy || animating}
                              onClick={() => handleMark("again")}
                              className="btn-fx rounded-full border border-border px-3 py-3 font-medium text-text hover:border-primary disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                            >
                              📌 Ուզում եմ սովորել
                            </button>
                            <button
                              type="button"
                              disabled={busy || animating}
                              onClick={() => handleMark("good")}
                              className="btn-fx btn-fx-glow rounded-full border border-primary bg-primary px-3 py-3 font-medium text-primary-contrast hover:bg-primary-hover disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                            >
                              ✅ Գիտեմ
                            </button>
                          </div>
                          <p className="mt-2 text-center text-xs text-text-muted">
                            ␣ Շրջել · 1 Ուզում եմ սովորել · 2 / Enter Գիտեմ
                          </p>
                        </>
                      )}
                      {!flipped && (
                        <p className="mt-3 text-center text-xs text-text-muted">
                          ← նախորդ · բջիջը սահեցրու աջ՝ հեռախոսում
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="mt-6 flex flex-col items-center rounded-[var(--radius)] border border-border bg-surface p-10 text-center shadow-[var(--shadow-sm)] animate-[scale-in_var(--motion-normal)_var(--ease-out)]">
              <span className="relative mb-3 inline-flex h-16 w-16 items-center justify-center text-4xl">
                <span className="absolute inset-0 rounded-full bg-correct/20 anim-pulse-ring" />
                <span className="relative">🎉</span>
              </span>
              <h2 className="mb-5 text-xl font-semibold text-text">Փուլն ավարտված է</h2>
              <div className="mb-2 flex items-center gap-7">
                <div className="text-center">
                  <div key={`f-${learnedCount}`} className="anim-count-pop text-xl font-semibold text-correct tabular-nums">
                    {learnedCount}
                  </div>
                  <div className="text-xs text-text-muted">Գիտեմ</div>
                </div>
                <div className="text-center">
                  <div key={`f-${needsReviewCount}`} className="anim-count-pop text-xl font-semibold text-primary tabular-nums">
                    {needsReviewCount}
                  </div>
                  <div className="text-xs text-text-muted">Սովորելու եմ</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-semibold text-text tabular-nums">{formatTimer(elapsedSeconds)}</div>
                  <div className="text-xs text-text-muted">Ժամանակ</div>
                </div>
              </div>
              <p className="mb-6 h-4 text-xs text-text-muted">
                {needsReviewCount > 0 && `${needsReviewCount} քարտ հաջորդ անգամ նորից կհայտնվեն`}
              </p>
              <div className="flex w-full flex-col gap-2.5 sm:max-w-xs">
                <button
                  type="button"
                  onClick={() => restart(mode)}
                  className="btn-fx btn-fx-glow rounded-full bg-primary px-4 py-2.5 font-medium text-primary-contrast hover:bg-primary-hover"
                >
                  Կրկնել
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="btn-fx rounded-full border border-border px-4 py-2 text-sm text-text-muted hover:border-primary hover:text-text"
                >
                  Զրոյացնել առաջընթացը
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/flashcards")}
                  className="btn-fx rounded-full px-4 py-2 text-sm text-text-muted hover:text-text"
                >
                  Փաթեթների ցանկ
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
