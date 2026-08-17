import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { Sparkles } from "lucide-react";
import {
  getAttempt, saveDraft, finishAttempt, formatSeconds, markHintViewed, DIFFICULTY_LABELS,
  type AnswerInput, type MockExamQuestion, type AttemptDetail,
} from "../api/mockExams";
import { HintButton } from "../components/HintButton";
import { Button } from "../components/ui/Button";
import { QuestionText } from "../components/QuestionText";
import { ConfirmModal } from "../components/ConfirmModal";
import { QuestionFigure } from "../components/QuestionFigure";
import { MultipleChoiceQuestion } from "../components/questions/MultipleChoiceQuestion";
import { ShortAnswerQuestion } from "../components/questions/ShortAnswerQuestion";
import { TrueFalseQuestion } from "../components/questions/TrueFalseQuestion";
import { MatchingQuestion } from "../components/questions/MatchingQuestion";
import { useAssistantLaunch } from "../contexts/AssistantLaunchContext";
import { useStudyActivityTracker } from "../hooks/useStudyActivityTracker";

const AUTOSAVE_INTERVAL_MS = 30_000;

// Builds the answer-options block sent to the AI so it can discuss the
// actual choices the student is looking at. Deliberately omits is_correct /
// is_true / match_target — the exam is still in progress and unsubmitted,
// so the AI must never be able to hand back which option is right.
function formatChoicesForAi(q: MockExamQuestion): string {
  if (q.question_type === "single_choice" && q.choices.length) {
    return "Պատասխանի տարբերակներ.\n" + q.choices.map((c, i) => `${i + 1}. ${c.text}`).join("\n");
  }
  if (q.question_type === "multi_statement" && q.statements.length) {
    return "Պնդումներ.\n" + q.statements.map((s) => `${s.label}. ${s.text}`).join("\n");
  }
  if (q.question_type === "matching" && (q.statements.length || q.choices.length)) {
    const left = q.statements.map((s) => `${s.label}. ${s.text}`).join("; ");
    const right = q.choices.map((c) => `${c.order}. ${c.text}`).join("; ");
    return `Ձախ սյունակ. ${left}\nԱջ սյունակ. ${right}`;
  }
  return "";
}

// Remembers, per attempt, whether the student wants the floating AI
// assistant available while taking this specific test.
const aiChoiceKey = (attemptId: number) => `mockexam_ai_choice_${attemptId}`;

interface AnswerState {
  selected_choice_id?: number;
  answer_text?: string;
  selected_statement_ids?: number[];
  match_pairs?: Record<number, number>;
}

export function MockExamAttemptPage() {
  useStudyActivityTracker();

  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const id = Number(attemptId);

  const [detail, setDetail] = useState<AttemptDetail | null>(null);
  const [answers, setAnswers] = useState<Record<number, AnswerState>>({});
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [draftToast, setDraftToast] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);
  const { askAboutQuestion, assistantSuppressed, setAssistantSuppressed } = useAssistantLaunch();

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

  // Apply the AI on/off choice the student made on the exam setup screen.
  useEffect(() => {
    if (!detail) return;
    setAssistantSuppressed(localStorage.getItem(aiChoiceKey(id)) === "no");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail, id]);

  // Restore the floating assistant for the rest of the app once the
  // student leaves this attempt, regardless of what they chose here.
  useEffect(() => () => setAssistantSuppressed(false), [setAssistantSuppressed]);

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
    setFinishError(null);
    try {
      await finishAttempt(id, buildAnswerInputs());
      localStorage.removeItem(aiChoiceKey(id));
      navigate(`/mock-exams/attempt/${id}/results`);
    } catch (err) {
      // Attempt was already finished elsewhere (e.g. the timer auto-submitted
      // it right as the student also clicked Ավարտել) — the result already
      // exists, so just go look at it instead of showing an error.
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        navigate(`/mock-exams/attempt/${id}/results`);
        return;
      }
      setFinishError("Չհաջողվեց ավարտել թեստը։ Փորձիր կրկին։");
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

  function isAnswered(a: AnswerState | undefined): boolean {
    return Boolean(
      a && (a.selected_choice_id || a.answer_text || a.selected_statement_ids?.length || (a.match_pairs && Object.keys(a.match_pairs).length))
    );
  }

  const unansweredCount = questions.filter((q) => !isAnswered(answers[q.id])).length;

  function handleAskAi(q: MockExamQuestion) {
    const choicesText = formatChoicesForAi(q);
    askAboutQuestion({
      message: `Բացատրիր ինձ այս հարցը. «${q.text}»${choicesText ? `\n\n${choicesText}` : ""}`,
      educationalContext: {
        subject: attempt.exam.title,
        topic: q.topic,
        difficulty: q.difficulty,
        conversation_mode: "solving_question",
      },
    });
  }

  function handleFinishClick() {
    if (attempt.duration_minutes !== null && (remainingSeconds ?? 0) > 0) {
      setShowFinishConfirm(true);
    } else {
      doFinish();
    }
  }

  return (
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
            Ավարտել
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
            aiEnabled={!assistantSuppressed}
            onChange={(value) => setAnswer(q.id, value)}
            onAskAi={() => handleAskAi(q)}
          />
        ))}
      </div>

      <div className="mt-6 flex flex-col items-end gap-2">
        {unansweredCount > 0 && (
          <p className="text-sm text-text-muted">
            {unansweredCount} հարց դեռ չպատասխանված է — կհաշվվի որպես բաց թողնված, ոչ թե սխալ։
          </p>
        )}
        {finishError && <p className="text-sm text-incorrect">{finishError}</p>}
        <button
          type="button"
          onClick={handleFinishClick}
          disabled={busy}
          className="rounded-md bg-primary px-6 py-3 text-lg font-medium text-primary-contrast transition-colors disabled:opacity-60"
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
    </div>
  );
}

function QuestionCard({
  question, index, answer, hintsEnabled, aiEnabled, onChange, onAskAi,
}: {
  question: MockExamQuestion;
  index: number;
  answer: AnswerState;
  hintsEnabled: boolean;
  aiEnabled: boolean;
  onChange: (value: AnswerState) => void;
  onAskAi: () => void;
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

      {(hintsEnabled && question.hint) || aiEnabled ? (
        <div className="mt-3 flex items-center gap-4">
          {hintsEnabled && question.hint && (
            <HintButton hint={question.hint} onOpen={() => markHintViewed(question.id)} />
          )}
          {aiEnabled && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onAskAi}
              iconLeft={<Sparkles size={15} strokeWidth={1.75} />}
              className="border-primary/30 text-primary hover:border-primary hover:bg-primary/10"
            >
              Հարցնել AI-ից
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}
