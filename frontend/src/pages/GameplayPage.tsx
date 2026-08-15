import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useGameSocket } from "../hooks/useGameSocket";
import type { GameSocketMessage } from "../hooks/useGameSocket";
import { MathText } from "../components/MathText";
import { MultipleChoiceQuestion } from "../components/questions/MultipleChoiceQuestion";
import { ShortAnswerQuestion } from "../components/questions/ShortAnswerQuestion";
import { TrueFalseQuestion } from "../components/questions/TrueFalseQuestion";
import { ExternalLinkButton, LinkButton } from "../components/ui/LinkButton";
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
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-bg px-4 text-center">
        <p className="text-4xl">⏳</p>
        <h1 className="text-3xl font-semibold text-text">Ավարտեցիք հարցերը</h1>
        <p className="text-xl text-text">Միավորներ՝ {finished.score}</p>
        <p className="text-text-muted">Սպասում ենք մյուս խաղացողներին ավարտելուն...</p>
        <Link
          to={`/games/${roomCode}`}
          className="rounded-md bg-primary px-6 py-2.5 font-medium text-primary-contrast transition-colors hover:bg-primary-hover"
        >
          Վերադառնալ սենյակ
        </Link>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg px-4 text-center">
        <p className="text-lg text-text-muted">
          {status === "connecting" && "Կապվում ենք..."}
          {status === "reconnecting" && "Կապը վերականգնվում է..."}
          {status === "open" && "Սպասում ենք խաղի մեկնարկին..."}
          {status === "closed" && "Կապը փակված է։"}
        </p>
        {error && <p className="text-incorrect">{error}</p>}
        <LinkButton to={`/games/${roomCode}`}>
          ← Վերադառնալ սենյակ
        </LinkButton>
      </div>
    );
  }

  const q = question.question;
  const isUrgent = secondsLeft !== null && secondsLeft > 0 && secondsLeft <= URGENT_THRESHOLD_SECONDS;

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <header className="flex items-center justify-between border-b border-border bg-surface py-3 pr-20 pl-4 sm:pr-24 sm:pl-8">
        <button
          type="button"
          onClick={() => navigate(`/games/${roomCode}`)}
          className="text-sm text-text-muted hover:text-primary"
        >
          ✕ Դուրս գալ
        </button>
        <span className="text-lg font-medium text-text">
          Հարց {question.question_number} / {question.total_questions}
        </span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleMuted}
            title={muted ? "Միացնել ձայնը" : "Անջատել ձայնը"}
            aria-label={muted ? "Միացնել ձայնը" : "Անջատել ձայնը"}
            className="text-lg text-text-muted transition-colors hover:text-primary"
          >
            {muted ? "🔇" : "🔊"}
          </button>
          <span
            className={`inline-block font-bold tabular-nums transition-all duration-300 ${
              isUrgent
                ? "animate-[urgent-pulse_1s_ease-in-out_infinite] text-4xl text-incorrect"
                : "text-3xl text-text"
            }`}
          >
            {secondsLeft ?? "—"}վ
          </span>
        </div>
      </header>

      {reconnecting && (
        <div className="bg-medium/20 border-b border-border px-4 py-1.5 text-center text-sm text-text-muted">
          Կապը կորած է, փորձում ենք վերականգնել...
        </div>
      )}

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-8 sm:px-8">
        <div className="rounded-[var(--radius)] border border-border bg-surface p-6 sm:p-10">
          {q.passage && (
            <div className="mb-6 rounded-md bg-surface-muted p-4 text-lg leading-relaxed italic whitespace-pre-line text-text">
              <MathText text={q.passage} />
            </div>
          )}

          <p className="mb-8 text-center text-2xl leading-relaxed font-medium text-text sm:text-3xl">
            <MathText text={q.text} />
          </p>

          {q.video_url && (
            <div className="mb-6 text-center">
              <ExternalLinkButton href={q.video_url} target="_blank" rel="noreferrer">
                🎬 Տեսանյութ
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
                <button
                  type="submit"
                  disabled={!answerText.trim()}
                  className="mt-4 w-full rounded-md bg-primary py-4 text-xl font-medium text-primary-contrast transition-colors hover:bg-primary-hover disabled:opacity-60"
                >
                  Ուղարկել
                </button>
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
                <button
                  type="button"
                  onClick={() => handleSubmit({ selected_statement_ids: Array.from(selectedStatementIds) })}
                  className="mt-4 w-full rounded-md bg-primary py-4 text-xl font-medium text-primary-contrast transition-colors hover:bg-primary-hover"
                >
                  Հաստատել
                </button>
              </>
            )}
          </fieldset>

          {feedback !== null && (
            <p
              className={`mt-6 text-center text-2xl font-semibold ${
                feedback
                  ? "animate-[pop-in_0.4s_ease-out] text-correct"
                  : "animate-[shake-x_0.4s_ease-in-out] text-incorrect"
              }`}
            >
              {feedback ? "Ճիշտ է ✓" : "Սխալ է ✗"}
            </p>
          )}

          {feedback === null && alreadyAnswered && (
            <p className="mt-6 text-center text-lg text-text-muted">Ուղարկվում է...</p>
          )}
        </div>

        <p className="mt-4 text-center text-text-muted">Միավորներ՝ {score}</p>
      </main>
    </div>
  );
}
