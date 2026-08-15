import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { HelpCircle, Search, Tag } from "lucide-react";
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
import { LinkButton } from "../components/ui/LinkButton";

const CATEGORY_CLASSES: Record<string, string> = {
  careless_slip: "border-primary/40 bg-primary/10 text-primary",
  conceptual_gap: "border-incorrect/40 bg-incorrect/10 text-incorrect",
  process_error: "border-primary/40 bg-primary/10 text-primary",
  misread_question: "border-border bg-surface-muted text-text-muted",
};

export function MockExamResultsPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const [results, setResults] = useState<AttemptResults | null>(null);
  const [autopsy, setAutopsy] = useState<AttemptAutopsy | null>(null);
  const [sharing, setSharing] = useState(false);
  const { showError } = useToast();

  useEffect(() => {
    getResults(Number(attemptId)).then(setResults).catch((err) => showError(extractErrorMessage(err)));
    getAutopsy(Number(attemptId)).then(setAutopsy).catch((err) => showError(extractErrorMessage(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId]);

  if (!results) {
    return <div className="p-8 text-lg text-text-muted">Բեռնվում է...</div>;
  }

  const { attempt, questions, answers } = results;

  const breakdown = [
    { label: DIFFICULTY_LABELS.easy, correct: attempt.easy_correct, total: attempt.easy_total },
    { label: DIFFICULTY_LABELS.medium, correct: attempt.medium_correct, total: attempt.medium_total },
    { label: DIFFICULTY_LABELS.hard, correct: attempt.hard_correct, total: attempt.hard_total },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-4 flex items-center justify-between">
        <LinkButton to="/mock-exams">← Ամբողջական թեստեր</LinkButton>
        <button
          type="button"
          onClick={() => setSharing(true)}
          className="rounded-md border border-primary px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-surface-muted"
        >
          Կիսվել → Չաթ
        </button>
      </div>
      <h1 className="mb-6 text-2xl font-semibold text-text">{attempt.exam.title}</h1>

      <div className="mb-8 rounded-[var(--radius)] border border-border bg-surface p-6">
        <div className="flex flex-wrap items-center gap-8">
          <div>
            <p className="text-sm text-text-muted">Միավոր</p>
            <p className="text-4xl font-bold text-primary">{attempt.scaled_score} / 20</p>
          </div>
          <div>
            <p className="text-sm text-text-muted">Ճիշտ պատասխաններ</p>
            <p className="text-2xl font-semibold text-text">
              {attempt.raw_score} / {questions.length}
            </p>
          </div>
          <div>
            <p className="text-sm text-text-muted">Պատասխանված</p>
            <p className="text-2xl font-semibold text-text">{attempt.percent_answered}%</p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          {breakdown.map((row) => (
            <div key={row.label} className="flex items-center justify-between text-base text-text">
              <span>{row.label}</span>
              <span className="text-text-muted">
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

      <div className="flex flex-col gap-6">
        {questions.map((q, idx) => (
          <RevealedQuestionCard
            key={q.id}
            question={q}
            index={idx}
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
        <span className={isCorrect ? "text-correct" : "text-incorrect"}>
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
        <div className="mt-3 rounded-md bg-surface-muted p-4 text-base leading-relaxed text-text-muted">
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
