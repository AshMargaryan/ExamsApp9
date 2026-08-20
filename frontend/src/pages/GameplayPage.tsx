import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  CircleCheck, Film, Hourglass, LogOut, PlayCircle, Volume2, VolumeX, X,
} from "lucide-react";
import { useGameSocket } from "../hooks/useGameSocket";
import type { GameSocketMessage } from "../hooks/useGameSocket";
import { MathText } from "../components/MathText";
import { GameCountdown } from "../components/games/GameCountdown";
import { MultipleChoiceQuestion } from "../components/questions/MultipleChoiceQuestion";
import { ShortAnswerQuestion } from "../components/questions/ShortAnswerQuestion";
import { TrueFalseQuestion } from "../components/questions/TrueFalseQuestion";
import { Button } from "../components/ui/Button";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { IconButton } from "../components/ui/IconButton";
import { ExternalLinkButton } from "../components/ui/LinkButton";
import { LinkButton } from "../components/ui/LinkButton";
import { ProgressBar } from "../components/ui/ProgressBar";
import { cn } from "../lib/cn";
import {
  isSoundMuted,
  playCorrect,
  playIncorrect,
  playTick,
  playTimeout,
  setSoundMuted,
  unlockAudio,
} from "../lib/sound";

const URGENT_THRESHOLD_SECONDS = 10;

// Purely a display countdown, re-derived from the server's `deadline`
// timestamp on every message. It never triggers advancement itself — only
// an incoming "question"/"finished" WebSocket message does that. A player
// who tampers with this in devtools just sees a wrong number; the server
// independently rejects late answers and independently decides when the
// round moves on (see gameplay.record_answer / services.advance_room).
function useDeadlineCountdown(deadline: string | null | undefined): number | null {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!deadline) {
      setSecondsLeft(null);
      return;
    }
    const target = new Date(deadline).getTime();
    function tick() {
      setSecondsLeft(Math.max(0, Math.round((target - Date.now()) / 1000)));
    }
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  return secondsLeft;
}

export function GameplayPage() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const { message, status, sendAnswer } = useGameSocket(roomCode);

  const [question, setQuestion] = useState<Extract<GameSocketMessage, { type: "question" }> | null>(null);
  const [finished, setFinished] = useState<Extract<GameSocketMessage, { type: "finished" }> | null>(null);
  const [score, setScore] = useState(0);
  const [selectedChoiceId, setSelectedChoiceId] = useState<number | undefined>(undefined);
  const [answerText, setAnswerText] = useState("");
  const [selectedStatementIds, setSelectedStatementIds] = useState<Set<number>>(new Set());
  const [feedback, setFeedback] = useState<boolean | null>(null);
  const [alreadyAnswered, setAlreadyAnswered] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(isSoundMuted());
  const [confirmExit, setConfirmExit] = useState(false);
  const currentQuestionIdRef = useRef<number | null>(null);
  const prevSecondsRef = useRef<number | null>(null);

  const secondsLeft = useDeadlineCountdown(question?.deadline);

  useEffect(() => {
    function unlockOnce() {
      unlockAudio();
      document.removeEventListener("pointerdown", unlockOnce);
    }
    document.addEventListener("pointerdown", unlockOnce);
    return () => document.removeEventListener("pointerdown", unlockOnce);
  }, []);

  useEffect(() => {
    if (!message) return;

    if (message.type === "question") {
      setFinished(null);
      setScore(message.score);
      setAlreadyAnswered(Boolean(message.answered));
      const qid = message.question.id;
      if (qid !== currentQuestionIdRef.current) {
        currentQuestionIdRef.current = qid;
        setSelectedChoiceId(undefined);
        setAnswerText("");
        setSelectedStatementIds(new Set());
        setFeedback(null);
      }
      setQuestion(message);
    } else if (message.type === "answer_result") {
      setFeedback(message.is_correct);
      setScore(message.score);
      setAlreadyAnswered(true);
      if (message.is_correct) {
        playCorrect();
      } else {
        playIncorrect();
      }
    } else if (message.type === "finished") {
      setQuestion(null);
      setScore(message.score);
      setFinished(message);
    } else if (message.type === "error") {
      setError(message.detail);
    }
  }, [message]);

  useEffect(() => {
    if (finished && finished.rank !== null) {
      navigate(`/games/${roomCode}/results`, { replace: true });
    }
  }, [finished, navigate, roomCode]);

  // Sound cues follow the display countdown — cosmetic only, never authoritative.
  useEffect(() => {
    if (secondsLeft === null) {
      prevSecondsRef.current = null;
      return;
    }
    if (prevSecondsRef.current === secondsLeft) return;
    prevSecondsRef.current = secondsLeft;

    if (secondsLeft === 0) {
      playTimeout();
    } else if (secondsLeft <= URGENT_THRESHOLD_SECONDS) {
      playTick();
    }
  }, [secondsLeft]);

  function toggleMuted() {
    setMuted((prev) => {
      const next = !prev;
      setSoundMuted(next);
      return next;
    });
  }

  function handleSubmit(payload: Record<string, unknown>) {
    if (!question || alreadyAnswered) return;
    const sent = sendAnswer({ question_id: question.question.id, ...payload });
    if (!sent) {
      setError("Կապը կորած է։ Փորձում ենք վերականգնել...");
      return;
    }
    setAlreadyAnswered(true);
  }

  function handleToggleStatement(statementId: number) {
    setSelectedStatementIds((prev) => {
      const next = new Set(prev);
      if (next.has(statementId)) next.delete(statementId);
      else next.add(statementId);
      return next;
    });
  }

  const reconnecting = status === "reconnecting";

  if (finished) {
    if (finished.rank !== null) {
      // Redirecting to the results page (see effect above) — avoid flashing
      // an interim screen.
      return null;
    }
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-[var(--space-4)] px-[var(--space-4)] py-[var(--space-8)] text-center">
        <span className="relative inline-flex h-14 w-14 items-center justify-center text-primary">
          <span className="absolute inset-0 rounded-full bg-primary/15 anim-pulse-ring" />
          <Hourglass size={26} strokeWidth={1.75} aria-hidden className="relative" />
        </span>
        <h1 className="font-display text-[length:var(--text-2xl)] leading-[var(--leading-display)] font-semibold text-text">
          Ավարտեցիր հարցերը
        </h1>
        <p className="text-[length:var(--text-3xl)] font-semibold tabular-nums text-text">
          {finished.score}
          <span className="ml-2 text-[length:var(--text-sm)] font-normal text-text-muted">միավոր</span>
        </p>
        {/* The result page opens itself the moment the server assigns a rank
            (see the effect above), so this is a genuine wait, not a dead end —
            say what is being waited for rather than leaving a spinner. */}
        <p className="text-[length:var(--text-sm)] text-text-muted" role="status">
          Սպասում ենք, մինչև մյուս խաղացողներն ավարտեն։ Արդյունքները կբացվեն ինքնաշխատ։
        </p>
        <LinkButton to={`/games/${roomCode}`}>Վերադառնալ սենյակ</LinkButton>
      </div>
    );
  }

  if (!question) {
    const closed = status === "closed";
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-[var(--space-4)] px-[var(--space-4)] py-[var(--space-8)] text-center">
        <span className="relative inline-flex h-12 w-12 items-center justify-center text-primary">
          {!closed && <span className="absolute inset-0 rounded-full bg-primary/15 anim-pulse-ring" />}
          {closed
            ? <X size={24} strokeWidth={1.75} aria-hidden className="relative text-incorrect" />
            : <PlayCircle size={24} strokeWidth={1.75} aria-hidden className="relative" />}
        </span>
        <p role="status" className="text-[length:var(--text-lg)] font-medium text-text">
          {status === "connecting" && "Կապվում ենք..."}
          {status === "reconnecting" && "Կապը վերականգնվում է..."}
          {status === "open" && "Սպասում ենք խաղի մեկնարկին..."}
          {closed && "Կապը փակվեց։"}
        </p>
        <p className="text-[length:var(--text-sm)] text-text-muted">
          {closed
            ? "Խաղին վերամիանալու համար բացիր սենյակը նորից։"
            : "Խաղը կսկսվի ինքնաշխատ, հենց ստեղծողը կամ ժամանակաչափը տա մեկնարկը։"}
        </p>
        {error && <p className="text-[length:var(--text-sm)] text-incorrect">{error}</p>}
        <LinkButton to={`/games/${roomCode}`}>Վերադառնալ սենյակ</LinkButton>
      </div>
    );
  }

  const q = question.question;

  return (
    <div className="flex flex-col">
      {/*
        The header used to carry `pr-20 pl-4 sm:pr-24` — magic padding to dodge
        two floating overlays the app shell now reserves space for itself.

        It also held the exit as a plain "✕ Դուրս գալ" text link that left a
        live multiplayer game on one click, with other players still waiting on
        the answer; and the score, the one number the whole game is about, was
        a grey line at the very bottom of the page — below the fold on a phone.
      */}
      <header className="sticky top-0 z-20 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-[var(--space-3)] px-[var(--space-4)] py-[var(--space-2)] sm:px-[var(--space-6)]">
          <IconButton
            variant="ghost"
            size="sm"
            aria-label="Դուրս գալ խաղից"
            onClick={() => setConfirmExit(true)}
            icon={<LogOut size={18} strokeWidth={1.75} aria-hidden />}
          />
          <div className="min-w-0 flex-1">
            <p className="text-[length:var(--text-sm)] font-medium tabular-nums text-text">
              Հարց {question.question_number} / {question.total_questions}
            </p>
            <div className="mt-1">
              <ProgressBar
                percent={(100 * (question.question_number - 1)) / question.total_questions}
                heightClassName="h-1"
                label={`${question.question_number - 1} հարց ${question.total_questions}-ից անցած`}
              />
            </div>
          </div>
          <p
            className="shrink-0 text-right"
            aria-label={`Միավորներ՝ ${score}`}
          >
            <span key={score} className="anim-count-pop block text-[length:var(--text-xl)] font-semibold tabular-nums text-primary">
              {score}
            </span>
            <span aria-hidden className="block text-[length:var(--text-xs)] text-text-muted">միավոր</span>
          </p>
          <GameCountdown secondsLeft={secondsLeft} />
          <IconButton
            variant="ghost"
            size="sm"
            aria-label={muted ? "Միացնել ձայնը" : "Անջատել ձայնը"}
            aria-pressed={muted}
            onClick={toggleMuted}
            icon={muted
              ? <VolumeX size={18} strokeWidth={1.75} aria-hidden />
              : <Volume2 size={18} strokeWidth={1.75} aria-hidden />}
          />
        </div>
      </header>

      {reconnecting && (
        <div className="bg-medium/20 border-b border-border px-4 py-1.5 text-center text-sm text-text-muted">
          Կապը կորած է, փորձում ենք վերականգնել...
        </div>
      )}

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-[var(--space-4)] py-[var(--space-6)] sm:px-[var(--space-6)]">
        <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-[var(--space-5)] sm:p-[var(--space-8)]">
          {q.passage && (
            <div className="mb-6 rounded-md bg-surface-muted p-4 text-lg leading-relaxed italic whitespace-pre-line text-text">
              <MathText text={q.passage} />
            </div>
          )}

          <div className="math-scroll mb-[var(--space-7)] text-center">
            <MathText
              text={q.text}
              className="text-[length:var(--text-2xl)] leading-relaxed font-medium text-text"
            />
          </div>

          {q.video_url && (
            <div className="mb-[var(--space-5)] text-center">
              <ExternalLinkButton href={q.video_url} target="_blank" rel="noreferrer">
                <Film size={16} strokeWidth={1.75} aria-hidden />
                Տեսանյութ
              </ExternalLinkButton>
            </div>
          )}

          <fieldset disabled={alreadyAnswered || status !== "open"}>
            {q.question_type === "multiple_choice" && (
              <MultipleChoiceQuestion
                choices={q.choices}
                selectedChoiceId={selectedChoiceId}
                revealed={false}
                size="large"
                onSelect={(choiceId) => {
                  setSelectedChoiceId(choiceId);
                  handleSubmit({ selected_choice_id: choiceId });
                }}
              />
            )}

            {q.question_type === "short_answer" && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmit({ answer_text: answerText });
                }}
              >
                <ShortAnswerQuestion
                  value={answerText}
                  revealed={false}
                  size="large"
                  onChange={setAnswerText}
                />
                <Button type="submit" size="lg" disabled={!answerText.trim()} className="mt-[var(--space-4)] w-full">
                  Ուղարկել
                </Button>
              </form>
            )}

            {q.question_type === "true_false" && (
              <>
                <TrueFalseQuestion
                  statements={q.statements}
                  selectedIds={selectedStatementIds}
                  revealed={false}
                  size="large"
                  showHint={false}
                  onToggle={handleToggleStatement}
                />
                <Button
                  type="button"
                  size="lg"
                  className="mt-[var(--space-4)] w-full"
                  onClick={() => handleSubmit({ selected_statement_ids: Array.from(selectedStatementIds) })}
                >
                  Հաստատել
                </Button>
              </>
            )}
          </fieldset>

          {/* One live region for both outcomes, so a screen reader is told the
              answer was right or wrong rather than a "✓" appearing silently. */}
          <div role="status" aria-live="polite" className="mt-[var(--space-6)] min-h-8 text-center">
            {feedback !== null && (
              <p
                className={cn(
                  "inline-flex items-center gap-[var(--space-2)] text-[length:var(--text-2xl)] font-semibold",
                  feedback
                    ? "animate-[pop-in_0.4s_ease-out] text-correct"
                    : "animate-[shake-x_0.4s_ease-in-out] text-incorrect",
                )}
              >
                {feedback
                  ? <CircleCheck size={24} strokeWidth={2} aria-hidden />
                  : <X size={24} strokeWidth={2.5} aria-hidden />}
                {feedback ? "Ճիշտ է" : "Սխալ է"}
              </p>
            )}
            {feedback === null && alreadyAnswered && (
              <p className="text-[length:var(--text-base)] text-text-muted">Ուղարկվում է...</p>
            )}
          </div>
        </div>
      </main>

      {/*
        Leaving mid-game is not undoable: the remaining questions score zero
        and the other players are waiting on this one. It was one click on a
        text link that read "✕ Դուրս գալ".
      */}
      <ConfirmDialog
        open={confirmExit}
        onOpenChange={setConfirmExit}
        title="Դուրս գա՞լ խաղից"
        description="Խաղը շարունակվում է առանց քեզ, և մնացած հարցերի միավորները կկորչեն։"
        confirmLabel="Դուրս գալ"
        cancelLabel="Շարունակել խաղը"
        onConfirm={() => navigate(`/games/${roomCode}`)}
      />
    </div>
  );
}
