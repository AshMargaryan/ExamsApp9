import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getExamAttemptHistory, type MockExamAttempt } from "../api/mockExams";
import { LinkButton } from "../components/ui/LinkButton";

export function MockExamHistoryPage() {
  const { examId } = useParams<{ examId: string }>();
  const [attempts, setAttempts] = useState<MockExamAttempt[] | null>(null);

  useEffect(() => {
    getExamAttemptHistory(Number(examId)).then(setAttempts);
  }, [examId]);

  if (!attempts) {
    return <div className="p-8 text-lg text-text-muted">Բեռնվում է...</div>;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <LinkButton to="/mock-exams" className="mb-4">← Ամբողջական թեստեր</LinkButton>
      <h1 className="mb-6 text-2xl font-semibold text-text">
        {attempts[0]?.exam.title ?? "Նախորդ պատասխանները"}
      </h1>

      {attempts.length === 0 ? (
        <p className="text-text-muted">Դեռ ավարտված փորձեր չկան։</p>
      ) : (
        <div className="flex flex-col gap-3">
          {attempts.map((a) => (
            <Link
              key={a.id}
              to={`/mock-exams/attempt/${a.id}/results`}
              className="flex items-center justify-between rounded-[var(--radius)] border border-border bg-surface px-5 py-4 transition-colors hover:border-primary"
            >
              <span className="text-text">
                {a.completed_at ? new Date(a.completed_at).toLocaleString("hy-AM") : ""}
              </span>
              <span className="font-semibold text-primary">{a.scaled_score} / 20</span>
              <span className="text-sm text-text-muted">
                {a.raw_score} / {a.exam.question_count} ճիշտ
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
