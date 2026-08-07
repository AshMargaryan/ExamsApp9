import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  flagCard, getDeckCards, isDue, markCard, resetDeckProgress,
  type CardProgress, type DeckCards, type Flashcard, type FlashcardGrade,
} from "../api/flashcards";
import { MathText } from "../components/MathText";

type StudyMode = "due" | "all";

const GRADES: { key: FlashcardGrade; label: string; shortcut: string; className: string }[] = [
  { key: "again", label: "🔁 Կրկնել", shortcut: "1", className: "border-border text-text hover:border-primary" },
  { key: "hard", label: "😓 Դժվար", shortcut: "2", className: "border-border text-text hover:border-primary" },
  { key: "good", label: "✅ Գիտեմ", shortcut: "3", className: "bg-primary text-primary-contrast hover:bg-primary-hover border-primary" },
  { key: "easy", label: "⚡ Հեշտ", shortcut: "4", className: "bg-primary text-primary-contrast hover:bg-primary-hover border-primary" },
];
const CHOICE_LETTERS = ["Ա", "Բ", "Գ", "Դ"];

// A card graded "again"/"hard" isn't mastered yet — it gets requeued to the
// end of the session and keeps reappearing until it's graded "good"/"easy".
const NOT_MASTERED: FlashcardGrade[] = ["again", "hard"];
const SWIPE_THRESHOLD_PX = 60;
const STORAGE_PREFIX = "flashcards_session_v1_";

interface SavedSession {
  cardIds: number[];
  index: number;
  mode: StudyMode;
  shuffled: boolean;
  sessionResults: Record<number, FlashcardGrade>;
  totalReviews: number;
  totalToMaster: number;
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
  const [totalToMaster, setTotalToMaster] = useState(0);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sessionResults, setSessionResults] = useState<Record<number, FlashcardGrade>>({});
  const [totalReviews, setTotalReviews] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [restored, setRestored] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const buildQueue = useCallback((d: DeckCards, useMode: StudyMode, doShuffle: boolean) => {
    const base = useMode === "due" ? d.cards.filter((c) => isDue(d.progress[c.id])) : d.cards;
    return doShuffle ? shuffle(base) : base;
  }, []);

  // Explicit session (re)start — always resets the mastery loop, even when
  // mode/shuffle don't change (e.g. clicking "Restart" with the same mode),
  // which a mode-dependent useEffect wouldn't re-fire for.
  const startSession = useCallback(
    (d: DeckCards, useMode: StudyMode, doShuffle: boolean) => {
      const built = buildQueue(d, useMode, doShuffle);
      setQueue(built);
      setTotalToMaster(built.length);
      setIndex(0);
      setFlipped(false);
      setSelectedChoice(null);
      setAnswered(false);
      setSessionResults({});
      setTotalReviews(0);
      setElapsedSeconds(0);
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
        setTotalToMaster(saved.totalToMaster);
        setIndex(saved.index);
        setSessionResults(saved.sessionResults);
        setTotalReviews(saved.totalReviews);
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

  // Remember position: snapshot the session on every meaningful change so a
  // reload resumes exactly where the student left off.
  useEffect(() => {
    if (!deckId || !restored || queue.length === 0) return;
    saveSession(deckId, {
      cardIds: queue.map((c) => c.id), index, mode, shuffled, sessionResults, totalReviews, totalToMaster, quizMode,
    });
  }, [deckId, restored, queue, index, mode, shuffled, sessionResults, totalReviews, totalToMaster, quizMode]);

  useEffect(() => {
    if (finished && deckId) clearSavedSession(deckId);
  }, [finished, deckId]);

  // Live study timer — session-only, not persisted.
  useEffect(() => {
    if (finished) return;
    const id = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [finished]);

  // Records a grade against the backend (spaced-repetition scheduling +
  // mastery-loop requeue) without touching the UI's current-card pointer —
  // both the classic flip buttons and the quiz-mode answer picker call this,
  // then decide separately when to actually move on.
  const recordGrade = useCallback(
    async (grade: FlashcardGrade) => {
      if (!queue[index]) return;
      const card = queue[index];
      await markCard(card.id, grade);
      setSessionResults((prev) => ({ ...prev, [card.id]: grade }));
      setTotalReviews((n) => n + 1);
      if (NOT_MASTERED.includes(grade)) {
        setQueue((prev) => [...prev, card]);
      }
    },
    [queue, index],
  );

  const handleMark = useCallback(
    async (grade: FlashcardGrade) => {
      if (busy || !queue[index]) return;
      setBusy(true);
      try {
        await recordGrade(grade);
        setFlipped(false);
        setIndex((i) => i + 1);
      } finally {
        setBusy(false);
      }
    },
    [busy, queue, index, recordGrade],
  );

  const goNext = useCallback(() => {
    setFlipped(false);
    setSelectedChoice(null);
    setAnswered(false);
    setIndex((i) => Math.min(i + 1, queue.length));
  }, [queue.length]);

  const goPrev = useCallback(() => {
    setFlipped(false);
    setSelectedChoice(null);
    setAnswered(false);
    setIndex((i) => Math.max(i - 1, 0));
  }, []);

  // Frozen per displayed card, not per queue state: keyed on the card's own
  // id (not `index`/`queue`) so a wrong-answer requeue — which appends a
  // repeat copy to `queue` while the student is still reading the feedback
  // for the SAME card — doesn't reshuffle the choices out from under them.
  const [choices, setChoices] = useState<string[] | null>(null);
  const currentCardId = queue[index]?.id;
  useEffect(() => {
    if (!data || currentCardId === undefined) {
      setChoices(null);
      return;
    }
    const card = data.cards.find((c) => c.id === currentCardId);
    setChoices(card ? buildChoices(card, data.cards) : null);
  }, [data, currentCardId]);
  const effectiveQuizMode = quizMode && choices !== null;

  const handleChoiceSelect = useCallback(
    async (choice: string) => {
      if (busy || answered || !queue[index]) return;
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
    [busy, answered, queue, index, recordGrade],
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (finished || !queue[index]) return;

      if (effectiveQuizMode) {
        if (!answered) {
          if (e.key === "ArrowRight") {
            e.preventDefault();
            goNext();
          } else if (e.key === "ArrowLeft") {
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
        if (e.key === "ArrowRight") {
          e.preventDefault();
          goNext();
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          goPrev();
        }
        return;
      }
      const grade = GRADES.find((g) => g.shortcut === e.key);
      if (grade) {
        e.preventDefault();
        handleMark(grade.key);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [flipped, finished, queue, index, handleMark, goNext, goPrev, effectiveQuizMode, answered, choices, handleChoiceSelect]);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function handleTouchEnd(e: React.TouchEvent) {
    const blocked = effectiveQuizMode ? answered : flipped;
    if (touchStartX.current === null || blocked) {
      touchStartX.current = null;
      return;
    }
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (delta <= -SWIPE_THRESHOLD_PX) goNext();
    else if (delta >= SWIPE_THRESHOLD_PX) goPrev();
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

  const masteredCount = useMemo(
    () => Object.values(sessionResults).filter((g) => g === "good" || g === "easy").length,
    [sessionResults],
  );
  const remainingToMaster = Math.max(0, totalToMaster - masteredCount);
  const repeatCount = Math.max(0, totalReviews - totalToMaster);
  const accuracy = totalReviews > 0 ? Math.round((100 * masteredCount) / totalReviews) : 0;

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
  const isRepeat = currentCard ? sessionResults[currentCard.id] !== undefined : false;
  const currentFlags = currentCard ? flags[currentCard.id] : undefined;
  const wasCorrect = answered && selectedChoice !== null && currentCard
    ? selectedChoice.trim() === currentCard.back_text.trim()
    : null;

  function restart(nextMode: StudyMode = mode) {
    setMode(nextMode);
    startSession(data, nextMode, shuffled);
  }

  function toggleShuffle() {
    const next = !shuffled;
    setShuffled(next);
    startSession(data, mode, next);
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

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link to="/flashcards" className="mb-4 inline-block text-sm text-primary hover:underline">
        ← Բառաքարտեր
      </Link>
      <h1 className="mb-3 text-2xl font-semibold text-text">{deck.title}</h1>

      {data.cards.length === 0 ? (
        <div className="rounded-[var(--radius)] border border-border bg-surface p-8 text-center text-text-muted">
          Այս փաթեթում քարտեր դեռ չկան։
        </div>
      ) : (
        <>
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <div className="flex overflow-hidden rounded-md border border-border">
              <button
                type="button"
                onClick={() => restart("due")}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  mode === "due" ? "bg-primary text-primary-contrast" : "text-text hover:bg-surface-muted"
                }`}
              >
                Կրկնվողներ ({dueTotal})
              </button>
              <button
                type="button"
                onClick={() => restart("all")}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  mode === "all" ? "bg-primary text-primary-contrast" : "text-text hover:bg-surface-muted"
                }`}
              >
                Բոլորը ({data.cards.length})
              </button>
            </div>
            <button
              type="button"
              onClick={toggleQuizMode}
              className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                quizMode ? "border-primary bg-primary text-primary-contrast" : "border-border text-text hover:border-primary"
              }`}
              title="Ընտրովի պատասխաններով թեստ"
            >
              🧠 Թեստային ռեժիմ
            </button>
            <button
              type="button"
              onClick={toggleShuffle}
              className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                shuffled ? "border-primary text-primary" : "border-border text-text hover:border-primary"
              }`}
              title="Խառնել քարտերի հերթականությունը"
            >
              🔀 Խառնել
            </button>
          </div>

          {queue.length === 0 && !finished ? (
            <div className="rounded-[var(--radius)] border border-border bg-surface p-8 text-center">
              <p className="mb-4 text-text-muted">Այսօրվա համար կրկնվող քարտեր չկան 🎉</p>
              <button
                type="button"
                onClick={() => restart("all")}
                className="rounded-md bg-primary px-4 py-2 font-medium text-primary-contrast transition-colors hover:bg-primary-hover"
              >
                Ուսումնասիրել բոլոր քարտերը
              </button>
            </div>
          ) : !finished ? (
            <>
              {/* Session HUD */}
              <div className="mb-4 grid grid-cols-4 gap-2 rounded-[var(--radius)] border border-border bg-surface p-3 text-center text-sm">
                <div>
                  <div className="font-semibold text-text">⏱ {formatTimer(elapsedSeconds)}</div>
                  <div className="text-xs text-text-muted">Ժամանակ</div>
                </div>
                <div>
                  <div className="font-semibold text-text">{remainingToMaster}</div>
                  <div className="text-xs text-text-muted">Մնացել է</div>
                </div>
                <div>
                  <div className="font-semibold text-correct">{masteredCount}</div>
                  <div className="text-xs text-text-muted">Ճիշտ</div>
                </div>
                <div>
                  <div className="font-semibold text-text">{accuracy}%</div>
                  <div className="text-xs text-text-muted">Ճշգրտություն</div>
                </div>
              </div>

              <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-surface-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${totalToMaster ? (100 * masteredCount) / totalToMaster : 0}%` }}
                />
              </div>
              <p className="mb-4 text-center text-xs text-text-muted">
                Սովորեցի՝ {masteredCount} / {totalToMaster}
              </p>

              <div
                className="relative"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                <div className="absolute top-2 right-2 z-10 flex gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFlag(currentCard.id, "is_favorite");
                    }}
                    title="Ընտրյալ"
                    className={`flex h-8 w-8 items-center justify-center rounded-full border text-sm transition-colors ${
                      currentFlags?.is_favorite
                        ? "border-primary bg-primary text-primary-contrast"
                        : "border-border bg-surface text-text-muted hover:text-text"
                    }`}
                  >
                    ⭐
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFlag(currentCard.id, "is_difficult");
                    }}
                    title="Դժվար է ինձ համար"
                    className={`flex h-8 w-8 items-center justify-center rounded-full border text-sm transition-colors ${
                      currentFlags?.is_difficult
                        ? "border-incorrect bg-incorrect-bg text-incorrect"
                        : "border-border bg-surface text-text-muted hover:text-text"
                    }`}
                  >
                    🚩
                  </button>
                </div>

                {effectiveQuizMode ? (
                  <>
                    {/* Question panel — no flip, answer is hidden behind the choices below */}
                    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-[var(--radius)] border border-border bg-surface p-8 text-center shadow-sm">
                      <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
                        {currentCard.topic && (
                          <span className="rounded-full border border-border px-3 py-1 text-xs font-medium tracking-wide text-text-muted uppercase">
                            {currentCard.topic}
                          </span>
                        )}
                        {isRepeat && (
                          <span className="rounded-full border border-primary px-3 py-1 text-xs font-medium text-primary">
                            🔁 Կրկնվում է, մինչև սովորես
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
                      {currentCard.hint && !answered && (
                        <p className="mt-4 text-sm text-text-muted">
                          💡 <MathText text={currentCard.hint!} />
                        </p>
                      )}
                    </div>

                    {/* 4 answer choices */}
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {choices!.map((choice, i) => {
                        const isCorrectChoice = choice.trim() === currentCard.back_text.trim();
                        const isSelected = choice === selectedChoice;
                        let cls = "border-border text-text hover:border-primary";
                        if (answered) {
                          if (isCorrectChoice) cls = "border-correct bg-correct-bg text-correct";
                          else if (isSelected) cls = "border-incorrect bg-incorrect-bg text-incorrect";
                          else cls = "border-border text-text-muted opacity-50";
                        }
                        return (
                          <button
                            key={choice + i}
                            type="button"
                            disabled={busy || answered}
                            onClick={() => handleChoiceSelect(choice)}
                            className={`flex items-start gap-2 rounded-md border px-4 py-3 text-left font-medium transition-colors disabled:cursor-default ${cls}`}
                          >
                            <span className="shrink-0 text-xs text-text-muted">{CHOICE_LETTERS[i]}.</span>
                            <MathText text={choice} />
                          </button>
                        );
                      })}
                    </div>

                    {answered && (
                      <div
                        className={`mt-4 rounded-[var(--radius)] border p-5 ${
                          wasCorrect ? "border-correct bg-correct-bg" : "border-incorrect bg-incorrect-bg"
                        }`}
                      >
                        <p className={`mb-2 font-semibold ${wasCorrect ? "text-correct" : "text-incorrect"}`}>
                          {wasCorrect ? "✅ Ճիշտ է!" : "❌ Սխալ է"}
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
                          <p className="text-sm text-text-muted">Փորձիր հիշել այս քարտը հաջորդ անգամ։</p>
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
                          className="mt-4 w-full rounded-md bg-primary px-4 py-2.5 font-medium text-primary-contrast transition-colors hover:bg-primary-hover"
                        >
                          Հաջորդ →
                        </button>
                      </div>
                    )}

                    <p className="mt-3 text-center text-xs text-text-muted">
                      {answered ? "␣ / Enter հաջորդ" : "1-4 ընտրել · ← / → նախորդ/հաջորդ"}
                    </p>
                  </>
                ) : (
                  <>
                    {quizMode && choices === null && (
                      <p className="mb-2 text-center text-xs text-text-muted">
                        Այս փաթեթում քիչ են քարտերը ընտրովի հարցերի համար՝ ցուցադրվում է դասական քարտ
                      </p>
                    )}
                    <div className="flashcard-scene min-h-[280px]">
                      <div
                        onClick={() => setFlipped((f) => !f)}
                        className={`flashcard-flip-inner min-h-[280px] cursor-pointer ${flipped ? "is-flipped" : ""}`}
                      >
                        {/* Front face */}
                        <div className="flashcard-face flex min-h-[280px] flex-col items-center justify-center rounded-[var(--radius)] border border-border bg-surface p-8 text-center shadow-sm">
                          <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
                            {currentCard.topic && (
                              <span className="rounded-full border border-border px-3 py-1 text-xs font-medium tracking-wide text-text-muted uppercase">
                                {currentCard.topic}
                              </span>
                            )}
                            {isRepeat && (
                              <span className="rounded-full border border-primary px-3 py-1 text-xs font-medium text-primary">
                                🔁 Կրկնվում է, մինչև սովորես
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
                          {currentCard.hint && (
                            <p className="mt-4 text-sm text-text-muted">
                              💡 <MathText text={currentCard.hint!} />
                            </p>
                          )}
                          <p className="mt-6 text-sm text-primary">Սեղմիր կամ սեղմիր Space՝ պատասխանը տեսնելու համար</p>
                        </div>

                        {/* Back face */}
                        <div className="flashcard-face flashcard-face-back flex min-h-[280px] flex-col items-center justify-center rounded-[var(--radius)] border border-primary bg-surface-muted p-8 text-center shadow-sm">
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
                        <p className="mt-6 mb-2 text-center text-sm text-text-muted">Որքանո՞վ գիտեիր պատասխանը</p>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                          {GRADES.map((g) => (
                            <button
                              key={g.key}
                              type="button"
                              disabled={busy}
                              onClick={() => handleMark(g.key)}
                              className={`rounded-md border px-3 py-3 font-medium transition-colors disabled:opacity-60 ${g.className}`}
                            >
                              {g.label}
                            </button>
                          ))}
                        </div>
                        <p className="mt-2 text-center text-xs text-text-muted">
                          "Կրկնել" կամ "Դժվար" ընտրելիս՝ քարտը կրկին կհայտնվի սույն նստաշրջանում
                        </p>
                        <p className="mt-1 text-center text-xs text-text-muted">
                          ␣ Շրջել · 1 Կրկնել · 2 Դժվար · 3 Գիտեմ · 4 Հեշտ
                        </p>
                      </>
                    )}
                    {!flipped && (
                      <p className="mt-3 text-center text-xs text-text-muted">
                        ← / → նախորդ/հաջորդ · բջիջները սահեցրու հեռախոսում
                      </p>
                    )}
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="mt-6 rounded-[var(--radius)] border border-border bg-surface p-8 text-center">
              <h2 className="mb-2 text-xl font-semibold text-text">Ամբողջը սովորեցիր 🎉</h2>
              <p className="mb-6 text-text-muted">
                {totalToMaster} քարտ, {totalReviews} փորձ, {formatTimer(elapsedSeconds)}
                {repeatCount > 0 && ` (${repeatCount} կրկնություն, մինչև ամեն ինչ սովորեցիր)`}
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => restart(mode)}
                  className="flex-1 rounded-md bg-primary px-4 py-2.5 font-medium text-primary-contrast transition-colors hover:bg-primary-hover"
                >
                  Կրկնել
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex-1 rounded-md border border-border px-4 py-2.5 font-medium text-text transition-colors hover:border-primary"
                >
                  Զրոյացնել առաջընթացը
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/flashcards")}
                  className="flex-1 rounded-md border border-border px-4 py-2.5 font-medium text-text transition-colors hover:border-primary"
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
