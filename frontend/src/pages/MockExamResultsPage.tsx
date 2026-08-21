import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { CircleCheck, CircleX, HelpCircle, History, Search, Share2, Tag } from "lucide-react";
import {
  getResults, getAutopsy, DIFFICULTY_LABELS,
  type AttemptAutopsy, type AttemptResults, type MockExamQuestion, type QuestionMistakeInfo,
} from "../api/mockExams";
import { classifyMistake } from "../api/mistakes";
import { extractErrorMessage, useToast } from "../context/ToastContext";
import { MathText } from "../components/MathText";
import { QuestionText } from "../components/QuestionText";
import { QuestionFigure } from "../components/QuestionFigure";
import { Button } from "../components/ui/Button";
import { ProgressBar } from "../components/ui/ProgressBar";
import { MultipleChoiceQuestion } from "../components/questions/MultipleChoiceQuestion";
import { ShortAnswerQuestion } from "../components/questions/ShortAnswerQuestion";
import { TrueFalseQuestion } from "../components/questions/TrueFalseQuestion";
import { MatchingQuestion } from "../components/questions/MatchingQuestion";
import { ShareToChatModal } from "../components/chat/ShareToChatModal";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { FilterChips } from "../components/ui/FilterChips";
import { LinkButton } from "../components/ui/LinkButton";
import { PageHeader } from "../components/ui/PageHeader";
import { Section } from "../components/ui/Section";
import { Skeleton } from "../components/ui/Skeleton";
import { StatTile } from "../components/ui/StatTile";

// Was `border-primary/40 bg-primary/10`, i.e. opacity-mixed colours, while
// the token layer has `-bg` and `-line` variants measured for exactly this.
const CATEGORY_CLASSES: Record<string, string> = {
  careless_slip: "border-primary-line bg-primary-bg text-primary",
  conceptual_gap: "border-incorrect bg-incorrect-bg text-incorrect",
  process_error: "border-primary-line bg-primary-bg text-primary",
  misread_question: "border-border bg-surface-muted text-text-muted",
};

/*
  Only two filters, and deliberately so.

  A "skipped" filter is the obvious third one and it is not offered, because
  this payload cannot support it honestly: it carries a row for every
  question whether or not the student responded, and an empty row is not the
  same as an unanswered question — a `multi_statement` question whose correct
  response is "none of these" is stored with an empty selection and
  `is_correct: true`. On a real seeded attempt that read as 65 skipped
  questions of which 0 were wrong, on an attempt scoring 2/65.

  Correctness is decided server-side and is reliable, so that is what the
  filter uses. `percent_answered` in the summary above still reports coverage.
*/
type QuestionFilter = "all" | "wrong";

export function MockExamResultsPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const [results, setResults] = useState<AttemptResults | null>(null);
  const [autopsy, setAutopsy] = useState<AttemptAutopsy | null>(null);
  const [sharing, setSharing] = useState(false);
  const [resultsFailed, setResultsFailed] = useState(false);
  const [filter, setFilter] = useState<QuestionFilter>("all");

  const load = useCallback(() => {
    setResultsFailed(false);
    // The results call used to report failure through a toast while leaving
    // `results` null, so the page stayed on "Բեռնվում է..." after the toast
    // had gone. The autopsy is genuinely optional and stays a soft failure.
    getResults(Number(attemptId)).then(setResults).catch(() => setResultsFailed(true));
    getAutopsy(Number(attemptId)).then(setAutopsy).catch(() => setAutopsy(null));
  }, [attemptId]);

  useEffect(() => {
    load();
  }, [load]);

  const visibleQuestions = useMemo(() => {
    if (!results) return [];
    return results.questions
      .map((q, index) => ({ q, index }))
      .filter(({ q }) => filter === "all" || results.answers[q.id]?.is_correct === false);
  }, [results, filter]);

  if (resultsFailed) {
    return (
      <div className="mx-auto max-w-3xl px-[var(--space-4)] py-[var(--space-8)]">
        <PageHeader title="Արդյունքներ" back={{ to: "/mock-exams", label: "Ամբողջական թեստեր" }} />
        <ErrorState
          title="Արդյունքները չհաջողվեց բեռնել։"
          hint="Փորձդ պահպանված է — ստուգիր կապը և փորձիր կրկին։"
          onRetry={load}
        />
      </div>
    );
  }

  if (!results) {
    return (
      <div className="mx-auto max-w-3xl px-[var(--space-4)] py-[var(--space-8)]">
        <Skeleton className="mb-[var(--space-3)] h-4 w-40" />
        <Skeleton className="mb-[var(--space-6)] h-9 w-2/3" />
        <Skeleton className="mb-[var(--space-6)] h-40 w-full" />
        <div className="flex flex-col gap-[var(--space-4)]">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-48 w-full" />)}
        </div>
      </div>
    );
  }

  const { attempt, questions, answers } = results;
  const wrongCount = questions.filter((q) => answers[q.id]?.is_correct === false).length;

  const breakdown = [
    { label: DIFFICULTY_LABELS.easy, correct: attempt.easy_correct, total: attempt.easy_total },
    { label: DIFFICULTY_LABELS.medium, correct: attempt.medium_correct, total: attempt.medium_total },
    { label: DIFFICULTY_LABELS.hard, correct: attempt.hard_correct, total: attempt.hard_total },
  ];

  return (
    <div className="mx-auto max-w-3xl px-[var(--space-4)] py-[var(--space-8)]">
      <PageHeader
        back={{ to: "/mock-exams", label: "Ամբողջական թեստեր" }}
        title={attempt.exam.title}
        description="Փորձի արդյունքները"
        actions={
          <div className="flex flex-wrap gap-[var(--space-2)]">
            {/* A score with nothing to compare it against says very little.
                The exam's own attempt history is one click away now, which is
                where "am I improving?" is actually answered. */}
            <LinkButton to={`/mock-exams/${attempt.exam.id}/history`} iconLeft={<History size={15} strokeWidth={1.75} aria-hidden />}>
              Նախորդ փորձերը
            </LinkButton>
            {/* Was a hand-rolled button labelled "Կիսվել → Չաթ" — an arrow
                glyph doing the work of a verb. */}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSharing(true)}
              iconLeft={<Share2 size={15} strokeWidth={1.75} aria-hidden />}
            >
              Կիսվել
            </Button>
          </div>
        }
      />

      <div className="mb-[var(--space-6)] rounded-[var(--radius-lg)] border border-border bg-surface p-[var(--space-6)]">
        <div className="mb-[var(--space-5)] flex items-baseline gap-[var(--space-2)]">
          <span className="text-[length:var(--text-5xl)] font-bold tabular-nums text-primary">
            {attempt.scaled_score}
          </span>
          <span className="text-[length:var(--text-lg)] text-text-muted">/ 20</span>
        </div>

        <div className="grid grid-cols-2 gap-[var(--space-3)] sm:grid-cols-3">
          <StatTile label="Ճիշտ" value={`${attempt.raw_score} / ${questions.length}`} />
          <StatTile label="Պատասխանված" value={`${attempt.percent_answered}%`} />
          <StatTile label="Սխալ" value={String(wrongCount)} />
        </div>

        <div className="mt-[var(--space-5)] flex flex-col gap-[var(--space-2)]">
          {breakdown.map((row) => (
            <div key={row.label} className="flex items-center justify-between text-[length:var(--text-sm)] text-text">
              <span>{row.label}</span>
              <span className="tabular-nums text-text-muted">
                {row.correct} / {row.total}
              </span>
            </div>
          ))}
        </div>
      </div>

      {autopsy && (autopsy.subject_mastery || autopsy.dominant_error_category) && (
        <div className="mb-8 rounded-[var(--radius)] border border-border bg-surface p-6">
          <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-text">
            <Search size={16} strokeWidth={1.75} /> Հետազոտություն
          </p>
          {autopsy.subject_mastery && autopsy.subject_mastery.mastery_score != null && (
            <div className="mb-3">
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-text-muted">Ընդհանուր իմացության մակարդակ՝ {autopsy.subject_mastery.subject_label}</span>
                <span className="text-text">{Math.round(autopsy.subject_mastery.mastery_score)}%</span>
              </div>
              <ProgressBar percent={autopsy.subject_mastery.mastery_score} />
            </div>
          )}
          {autopsy.dominant_error_category && (
            <p className="text-sm text-text-muted">
              Այս թեստի սխալների մեծ մասը՝{" "}
              <span className="font-medium text-text">{autopsy.dominant_error_category_display}</span>
            </p>
          )}
        </div>
      )}

      {/*
        The page listed every question in full, always. A 65-question exam is
        roughly thirty thousand pixels of scroll, and what a student wants
        immediately after finishing is the handful they got wrong — which was
        reachable only by scrolling past everything they got right.
      */}
      <Section
        title="Հարցերը"
        level={2}
        spacing="tight"
        description={
          filter === "all"
            ? `${questions.length} հարց`
            : `${visibleQuestions.length} հարց ${questions.length}-ից`
        }
      >
        <FilterChips
          label="Ցուցադրել հարցերը"
          className="mb-[var(--space-4)]"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "Բոլորը", count: questions.length },
            { value: "wrong", label: "Սխալ", count: wrongCount },
          ]}
        />

        {visibleQuestions.length === 0 ? (
          <EmptyState
            tone="positive"
            icon={<CircleCheck size={26} strokeWidth={1.5} aria-hidden />}
            title="Այս թեստում սխալ պատասխաններ չկան։"
            hint="Անցիր «Բոլորը»՝ ամբողջ թեստը վերանայելու համար։"
            cta={{ label: "Ցույց տալ բոլորը", onClick: () => setFilter("all") }}
          />
        ) : (
          <div className="flex flex-col gap-[var(--space-5)]">
            {visibleQuestions.map(({ q, index }) => (
              <RevealedQuestionCard
                key={q.id}
                question={q}
                index={index}
                answer={answers[q.id]}
                mistakeInfo={autopsy?.mistakes_by_question[String(q.id)]}
                onClassified={(updated) =>
                  setAutopsy((prev) =>
                    prev ? { ...prev, mistakes_by_question: { ...prev.mistakes_by_question, [String(q.id)]: updated } } : prev
                  )
                }
              />
            ))}
          </div>
        )}
      </Section>

      {/* The page used to end after the last question card with nothing to do
          next — on a surface whose entire purpose is deciding what to study. */}
      <div className="mt-[var(--space-8)] flex flex-wrap justify-center gap-[var(--space-3)]">
        <LinkButton to="/mistakes" variant="primary" size="md">
          Սխալների տետր
        </LinkButton>
        <LinkButton to={`/mock-exams/${attempt.exam.id}`} variant="secondary" size="md">
          Կրկնել թեստը
        </LinkButton>
        <LinkButton to="/mock-exams" variant="ghost" size="md">
          Ամբողջական թեստեր
        </LinkButton>
      </div>

      {sharing && (
        <ShareToChatModal
          contextType="mock_exam_result"
          contextId={attempt.id}
          title="Կիսվել արդյունքով"
          onClose={() => setSharing(false)}
        />
      )}
    </div>
  );
}

function RevealedQuestionCard({
  question, index, answer, mistakeInfo, onClassified,
}: {
  question: MockExamQuestion;
  index: number;
  answer: AttemptResults["answers"][number] | undefined;
  mistakeInfo: QuestionMistakeInfo | undefined;
  onClassified: (updated: QuestionMistakeInfo) => void;
}) {
  const isCorrect = answer?.is_correct ?? false;
  const { showError } = useToast();
  const [classifying, setClassifying] = useState(false);

  async function handleClassify() {
    if (!mistakeInfo) return;
    setClassifying(true);
    try {
      const updated = await classifyMistake(mistakeInfo.mistake_entry_id);
      onClassified({
        mistake_entry_id: updated.id,
        error_category: updated.error_category,
        error_category_display: updated.error_category_display,
        error_explanation: updated.error_explanation,
        classified_at: updated.classified_at,
      });
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setClassifying(false);
    }
  }

  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-6">
      <div className="mb-3 flex items-center justify-between text-sm">
        <span className="text-text-muted">
          {DIFFICULTY_LABELS[question.difficulty]}
          {question.topic && ` · ${question.topic}`}
        </span>
        {/* Correctness was carried by colour and a word; the icon makes it
            legible in greyscale and at a glance down a long list. */}
        <span className={`inline-flex items-center gap-1 font-medium ${isCorrect ? "text-correct" : "text-incorrect"}`}>
          {isCorrect
            ? <CircleCheck size={15} strokeWidth={2} aria-hidden />
            : <CircleX size={15} strokeWidth={2} aria-hidden />}
          {isCorrect ? "Ճիշտ" : "Սխալ"}
        </span>
      </div>

      {!isCorrect && mistakeInfo && (
        <div className="mb-3">
          {mistakeInfo.classified_at ? (
            <div className="flex flex-col gap-1">
              <span className={`inline-flex w-fit items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${CATEGORY_CLASSES[mistakeInfo.error_category] ?? ""}`}>
                <Tag size={11} strokeWidth={1.75} /> {mistakeInfo.error_category_display}
              </span>
              {mistakeInfo.error_explanation && <p className="text-xs text-text-muted">{mistakeInfo.error_explanation}</p>}
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={handleClassify} disabled={classifying} className="flex h-7 items-center gap-1 px-2 text-xs">
              {classifying ? "Վերլուծվում է..." : (
                <>
                  <HelpCircle size={12} strokeWidth={1.75} /> Ինչու՞ եմ սխալվել
                </>
              )}
            </Button>
          )}
        </div>
      )}

      <QuestionText text={question.text} index={index} />

      <QuestionFigure svg={question.figure_svg} />

      {question.question_type === "single_choice" && (
        <MultipleChoiceQuestion
          choices={question.choices}
          selectedChoiceId={answer?.selected_choice_id ?? undefined}
          revealed
          onSelect={() => {}}
        />
      )}

      {question.question_type === "free_response" && (
        <ShortAnswerQuestion
          value={answer?.answer_text ?? ""}
          revealed
          correctAnswerText={question.correct_answer_text}
          onChange={() => {}}
        />
      )}

      {question.question_type === "multi_statement" && (
        <TrueFalseQuestion
          statements={question.statements}
          selectedIds={new Set(answer?.selected_statement_ids ?? [])}
          revealed
          showHint={false}
          onToggle={() => {}}
        />
      )}

      {question.question_type === "matching" && (
        <MatchingQuestion
          leftItems={question.statements}
          rightItems={question.choices}
          value={answer?.match_pairs ?? {}}
          revealed
          onChange={() => {}}
        />
      )}

      {question.solution_steps && question.solution_steps.length > 0 && (
        <div className="mt-3 rounded-[var(--radius)] bg-surface-muted p-4 text-base leading-relaxed text-text-muted">
          {question.solution_steps.map((step, i) => (
            <p key={i}>
              <MathText text={step} />
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
