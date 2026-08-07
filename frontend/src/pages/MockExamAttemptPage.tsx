import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getAttempt, saveDraft, finishAttempt, formatSeconds, DIFFICULTY_LABELS,
  type AnswerInput, type MockExamQuestion, type AttemptDetail,
} from "../api/mockExams";
import { HintButton } from "../components/HintButton";
import { QuestionText } from "../components/QuestionText";
import { ConfirmModal } from "../components/ConfirmModal";
import { QuestionFigure } from "../components/QuestionFigure";
import { MultipleChoiceQuestion } from "../components/questions/MultipleChoiceQuestion";
import { ShortAnswerQuestion } from "../components/questions/ShortAnswerQuestion";
import { TrueFalseQuestion } from "../components/questions/TrueFalseQuestion";
import { MatchingQuestion } from "../components/questions/MatchingQuestion";
import { ToolsDock } from "../components/ToolsDock";
import { NotepadProvider } from "../context/NotepadContext";

const AUTOSAVE_INTERVAL_MS = 30_000;

interface AnswerState {
  selected_choice_id?: number;
  answer_text?: string;
  selected_statement_ids?: number[];
  match_pairs?: Record<number, number>;
}

export function MockExamAttemptPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const id = Number(attemptId);

  const [detail, setDetail] = useState<AttemptDetail | null>(null);
  const [answers, setAnswers] = useState<Record<number, AnswerState>>({});
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [draftToast, setDraftToast] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const answersRef = useRef(answers);
  answersRef.current = answers;
  const remainingRef = useRef(remainingSeconds);
  remainingRef.current = remainingSeconds;

  useEffect(() => {
    getAttempt(id).then((d) => {
      setDetail(d);
      setRemainingSeconds(d.remaining_seconds);
      const initial: Record<number, AnswerState> = {};
      for (const q of d.questions) {
        const saved = d.answers[q.id];
        if (saved) {
          initial[q.id] = {
            selected_choice_id: saved.selected_choice_id ?? undefined,
            answer_text: saved.answer_text,
            selected_statement_ids: saved.selected_statement_ids,
            match_pairs: saved.match_pairs,
          };
        }
      }
      setAnswers(initial);
    });
  }, [id]);

  function buildAnswerInputs(): AnswerInput[] {
    if (!detail) return [];
    return detail.questions.map((q) => ({
      question_id: q.id,
      ...answersRef.current[q.id],
    }));
  }

  const doSaveDraft = useCallback(async (silent: boolean) => {
    if (!detail) return;
    await saveDraft(id, buildAnswerInputs(), remainingRef.current);
    if (!silent) {
      setDraftToast(true);
      setTimeout(() => setDraftToast(false), 2000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, detail]);

  const doFinish = useCallback(async () => {
    setBusy(true);
    try {
      await finishAttempt(id, buildAnswerInputs());
      navigate(`/mock-exams/attempt/${id}/results`);
    } finally {
      setBusy(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, detail]);

  // Exit to the main menu, saving the current answers as a resumable draft.
  const handleExit = useCallback(async () => {
    setBusy(true);
    try {
      await doSaveDraft(true);
    } catch {
      // Ignore save errors — the periodic autosave has most likely persisted
      // the latest answers; still let the user leave.
    } finally {
      navigate("/");
    }
  }, [doSaveDraft, navigate]);

  // Countdown ticker (timed exams only).
  useEffect(() => {
    if (!detail || detail.attempt.duration_minutes === null) return;
    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev === null) return prev;
        if (prev <= 1) {
          clearInterval(interval);
          doFinish();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [detail, doFinish]);

  // Autosave.
  useEffect(() => {
    if (!detail) return;
    const interval = setInterval(() => doSaveDraft(true), AUTOSAVE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [detail, doSaveDraft]);

  if (!detail) {
    return <div className="p-8 text-lg text-text-muted">Բեռնվում է...</div>;
  }

  const { attempt, questions } = detail;

  function setAnswer(questionId: number, value: AnswerState) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  function handleFinishClick() {
    if (attempt.duration_minutes !== null && (remainingSeconds ?? 0) > 0) {
      setShowFinishConfirm(true);
    } else {
      doFinish();
    }
  }

  return (
    <NotepadProvider>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="sticky top-0 z-20 -mx-4 mb-6 flex items-center justify-between border-b border-border bg-surface px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleExit}
              disabled={busy}
              title="Պահպանել և վերադառնալ գլխավոր էջ"
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-text transition-colors hover:border-primary disabled:opacity-60"
            >
              ← Գլխավոր
            </button>
            <button
              type="button"
              onClick={() => doSaveDraft(false)}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-text transition-colors hover:border-primary"
            >
              📝 Սևագիր
            </button>
            {draftToast && <span className="text-sm text-correct">Պահպանված է</span>}
          </div>
          {remainingSeconds !== null && (
            <div className="text-lg font-semibold text-text">{formatSeconds(remainingSeconds)}</div>
          )}
        </div>

        <h1 className="mb-1 text-2xl font-semibold text-text">{attempt.exam.title}</h1>
        <p className="mb-6 text-sm text-text-muted">{questions.length} հարց</p>

        <div className="flex flex-col gap-6">
          {questions.map((q, idx) => (
            <QuestionCard
              key={q.id}
              question={q}
              index={idx}
              answer={answers[q.id] ?? {}}
              hintsEnabled={attempt.hints_enabled}
              onChange={(value) => setAnswer(q.id, value)}
            />
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={handleFinishClick}
            disabled={busy}
            className="rounded-md bg-accent px-6 py-3 text-lg font-medium text-primary-contrast transition-colors disabled:opacity-60"
          >
            Ավարտել
          </button>
        </div>

        {showFinishConfirm && (
          <ConfirmModal
            message={`Դեռ մնում է ${formatSeconds(remainingSeconds ?? 0)}, ցանկանո՞ւմ եք ավարտել։`}
            onConfirm={() => {
              setShowFinishConfirm(false);
              doFinish();
            }}
            onCancel={() => setShowFinishConfirm(false)}
          />
        )}

        <ToolsDock />
      </div>
    </NotepadProvider>
  );
}

function QuestionCard({
  question, index, answer, hintsEnabled, onChange,
}: {
  question: MockExamQuestion;
  index: number;
  answer: AnswerState;
  hintsEnabled: boolean;
  onChange: (value: AnswerState) => void;
}) {
  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-6">
      <div className="mb-3 flex items-center gap-2 text-sm text-text-muted">
        <span>{DIFFICULTY_LABELS[question.difficulty]}</span>
        {question.topic && <span>· {question.topic}</span>}
      </div>
      <QuestionText text={question.text} index={index} />

      <QuestionFigure svg={question.figure_svg} />

      {question.question_type === "single_choice" && (
        <MultipleChoiceQuestion
          choices={question.choices}
          selectedChoiceId={answer.selected_choice_id}
          revealed={false}
          onSelect={(choiceId) => onChange({ selected_choice_id: choiceId })}
        />
      )}

      {question.question_type === "free_response" && (
        <ShortAnswerQuestion
          value={answer.answer_text ?? ""}
          revealed={false}
          onChange={(text) => onChange({ answer_text: text })}
        />
      )}

      {question.question_type === "multi_statement" && (
        <TrueFalseQuestion
          statements={question.statements}
          selectedIds={new Set(answer.selected_statement_ids ?? [])}
          revealed={false}
          showHint={false}
          onToggle={(statementId) => {
            const current = new Set(answer.selected_statement_ids ?? []);
            if (current.has(statementId)) current.delete(statementId);
            else current.add(statementId);
            onChange({ selected_statement_ids: Array.from(current) });
          }}
        />
      )}

      {question.question_type === "matching" && (
        <MatchingQuestion
          leftItems={question.statements}
          rightItems={question.choices}
          value={answer.match_pairs ?? {}}
          revealed={false}
          onChange={(pairs) => onChange({ match_pairs: pairs })}
        />
      )}

      {hintsEnabled && question.hint && (
        <div className="mt-3">
          <HintButton hint={question.hint} />
        </div>
      )}
    </div>
  );
}
