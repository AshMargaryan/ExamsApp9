import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getResults, DIFFICULTY_LABELS, type AttemptResults, type MockExamQuestion } from "../api/mockExams";
import { MathText } from "../components/MathText";
import { MultipleChoiceQuestion } from "../components/questions/MultipleChoiceQuestion";
import { ShortAnswerQuestion } from "../components/questions/ShortAnswerQuestion";
import { TrueFalseQuestion } from "../components/questions/TrueFalseQuestion";

export function MockExamResultsPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const [results, setResults] = useState<AttemptResults | null>(null);

  useEffect(() => {
    getResults(Number(attemptId)).then(setResults);
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
      <Link to="/mock-exams" className="mb-4 inline-block text-sm text-primary hover:underline">
        ← Ամբողջական թեստեր
      </Link>
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

      <div className="flex flex-col gap-6">
        {questions.map((q, idx) => (
          <RevealedQuestionCard key={q.id} question={q} index={idx} answer={answers[q.id]} />
        ))}
      </div>
    </div>
  );
}

function RevealedQuestionCard({
  question, index, answer,
}: {
  question: MockExamQuestion;
  index: number;
  answer: AttemptResults["answers"][number] | undefined;
}) {
  const isCorrect = answer?.is_correct ?? false;

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
      <p className="mb-4 text-xl font-medium text-text">
        {index + 1}. <MathText text={question.text} />
      </p>

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
