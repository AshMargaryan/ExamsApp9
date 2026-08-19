import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, Shuffle, Sparkles } from "lucide-react";
import {
  getDailyProblem, submitDailyProblem,
  type DailyProblem, type DailyProblemSubmitInput, type Question,
} from "../api/practice";
import { useAssistantLaunch } from "../contexts/AssistantLaunchContext";
import { MathText } from "./MathText";
import { Button } from "./ui/Button";
import { MultipleChoiceQuestion } from "./questions/MultipleChoiceQuestion";
import { ShortAnswerQuestion } from "./questions/ShortAnswerQuestion";
import { TrueFalseQuestion } from "./questions/TrueFalseQuestion";

function ReasonNote({ reason }: { reason: DailyProblem["reason"] }) {
  const [open, setOpen] = useState(false);
  const text =
    reason.kind === "weak_topic"
      ? `Այս թեմայից («${reason.topic_label}») ունեք ${reason.incorrect_count} սխալ, ուստի Haygit-ը առաջարկեց հենց սա։`
      : "Բավարար տվյալներ դեռ չկան Ձեր մասին, ուստի այս հարցը պատահականորեն է ընտրված։";

  return (
    <div className="mb-3">
      <Button variant="ghost" size="sm" onClick={() => setOpen((v) => !v)} className="h-7 px-2 text-xs">
        Ինչու՞ հենց սա {open ? "▲" : "▼"}
      </Button>
      {open && <p className="mt-1 text-xs text-text-muted">{text}</p>}
    </div>
  );
}

export function DailyProblemCard({ nextHref = "/practice" }: { nextHref?: string }) {
  const [problem, setProblem] = useState<DailyProblem | null>(null);
  const [selectedChoiceId, setSelectedChoiceId] = useState<number | undefined>();
  const [answerText, setAnswerText] = useState("");
  const [selectedStatementIds, setSelectedStatementIds] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { askAboutQuestion } = useAssistantLaunch();

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

  function handleExplain() {
    askAboutQuestion({
      message: `Բացատրիր ինձ այս հարցը. «${question.text}»`,
      educationalContext: {
        question_id: question.id,
        subject: question.subject_name,
        topic: question.topic_name,
        subtopic: question.subtopic_name,
        difficulty: question.tier,
        conversation_mode: "solving_question",
      },
    });
  }

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
    <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-[var(--space-5)]">
      <div className="mb-[var(--space-4)] flex items-center justify-between gap-[var(--space-3)]">
        {/* Emoji rendered as UI iconography picks up per-platform colour and
            weight, which breaks the otherwise monochrome lucide icon set. */}
        <h3 className="flex items-center gap-[var(--space-2)] text-[length:var(--text-lg)] font-semibold leading-[var(--leading-heading)] text-text">
          <CalendarDays size={18} strokeWidth={1.75} className="shrink-0 text-text-muted" /> Օրվա խնդիրը
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

      {question.subject_name && (
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-accent">
          {[question.subject_name, question.topic_name, question.subtopic_name].filter(Boolean).join(" · ")}
        </p>
      )}

      <ReasonNote reason={problem.reason} />

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

      {revealed && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleExplain}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-text transition-colors hover:border-primary"
          >
            <Sparkles size={15} strokeWidth={1.75} /> Բացատրել
          </button>
          {question.subtopic_id != null && (
            <Link
              to={`/practice/subtopic/${question.subtopic_id}/${question.tier}`}
              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-text transition-colors hover:border-primary"
            >
              <Shuffle size={15} strokeWidth={1.75} /> Նման խնդիր
            </Link>
          )}
          <Link
            to={nextHref}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-text transition-colors hover:border-primary"
          >
            <ArrowRight size={15} strokeWidth={1.75} /> Հաջորդը
          </Link>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-incorrect">{error}</p>}

      {!revealed && (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={busy}
          style={{ background: "var(--gradient-primary, linear-gradient(45deg, #6d28d9, #7c3aed))" }}
          className="mt-4 rounded-md px-5 py-2 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {busy ? "..." : "Ուղարկել պատասխանը"}
        </button>
      )}
    </div>
  );
}
