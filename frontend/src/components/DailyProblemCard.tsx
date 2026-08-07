import { useEffect, useState } from "react";
import {
  getDailyProblem, submitDailyProblem,
  type DailyProblem, type DailyProblemSubmitInput, type Question,
} from "../api/practice";
import { MathText } from "./MathText";
import { MultipleChoiceQuestion } from "./questions/MultipleChoiceQuestion";
import { ShortAnswerQuestion } from "./questions/ShortAnswerQuestion";
import { TrueFalseQuestion } from "./questions/TrueFalseQuestion";

export function DailyProblemCard() {
  const [problem, setProblem] = useState<DailyProblem | null>(null);
  const [selectedChoiceId, setSelectedChoiceId] = useState<number | undefined>();
  const [answerText, setAnswerText] = useState("");
  const [selectedStatementIds, setSelectedStatementIds] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDailyProblem()
      .then(setProblem)
      .catch(() => setProblem(null));
  }, []);

  if (problem === null) {
    return (
      <div className="rounded-[var(--radius)] border border-border bg-surface p-5">
        <p className="text-sm text-text-muted">Բեռնվում է...</p>
      </div>
    );
  }

  const revealed = problem.already_answered;
  const question: Question = revealed ? problem.result!.question : problem.question;

  async function handleSubmit() {
    setBusy(true);
    setError(null);
    try {
      const input: DailyProblemSubmitInput = {
        selected_choice_id: selectedChoiceId,
        answer_text: answerText,
        selected_statement_ids: Array.from(selectedStatementIds),
      };
      const updated = await submitDailyProblem(input);
      setProblem(updated);
    } catch {
      setError("Չհաջողվեց ուղարկել պատասխանը։ Փորձեք կրկին։");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-text">
          <span>📅</span> Օրվա խնդիրը
        </h3>
        {revealed && (
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              problem.result!.is_correct ? "bg-correct-bg text-correct" : "bg-incorrect-bg text-incorrect"
            }`}
          >
            {problem.result!.is_correct ? "✓ Ճիշտ" : "✗ Սխալ"}
          </span>
        )}
      </div>

      <p className="mb-4 text-base text-text">
        <MathText text={question.text} />
      </p>

      {question.question_type === "multiple_choice" && (
        <MultipleChoiceQuestion
          choices={question.choices}
          selectedChoiceId={revealed ? (problem.result!.selected_choice_id ?? undefined) : selectedChoiceId}
          revealed={revealed}
          onSelect={setSelectedChoiceId}
        />
      )}

      {question.question_type === "short_answer" && (
        <ShortAnswerQuestion
          value={revealed ? problem.result!.answer_text : answerText}
          onChange={setAnswerText}
          revealed={revealed}
          correctAnswerText={question.correct_answer_text}
        />
      )}

      {question.question_type === "true_false" && (
        <TrueFalseQuestion
          statements={question.statements}
          selectedIds={revealed ? new Set(problem.result!.selected_statement_ids) : selectedStatementIds}
          revealed={revealed}
          showHint={!revealed}
          onToggle={(id) =>
            setSelectedStatementIds((prev) => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            })
          }
        />
      )}

      {revealed && question.explanation && (
        <div className="mt-3 rounded-md bg-surface-muted p-3 text-sm leading-relaxed text-text-muted whitespace-pre-line">
          <MathText text={question.explanation} />
        </div>
      )}

      {error && <p className="mt-3 text-sm text-incorrect">{error}</p>}

      {!revealed && (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={busy}
          className="mt-4 rounded-md bg-primary px-5 py-2 font-medium text-primary-contrast transition-colors hover:bg-primary-hover disabled:opacity-60"
        >
          {busy ? "..." : "Ուղարկել պատասխանը"}
        </button>
      )}
    </div>
  );
}
