import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { listMockExams, startAttempt, type MockExamSummary, type MockExamSubject } from "../api/mockExams";
import { MockExamStartPanel } from "../components/MockExamStartPanel";

const SUBJECTS: { key: MockExamSubject; label: string }[] = [
  { key: "math", label: "Մաթեմատիկա" },
  { key: "physics", label: "Ֆիզիկա" },
  { key: "biology", label: "Կենսաբանություն" },
  { key: "chemistry", label: "Քիմիա" },
  { key: "english", label: "Անգլերեն" },
];

export function MockExamsPage() {
  const navigate = useNavigate();
  const [subject, setSubject] = useState<MockExamSubject>("math");
  const [exams, setExams] = useState<MockExamSummary[] | null>(null);
  const [startingExam, setStartingExam] = useState<MockExamSummary | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setExams(null);
    listMockExams(subject).then(setExams);
  }, [subject]);

  async function handleStart(durationMinutes: number | null, hintsEnabled: boolean) {
    if (!startingExam) return;
    setBusy(true);
    try {
      const attempt = await startAttempt(startingExam.id, durationMinutes, hintsEnabled);
      navigate(`/mock-exams/attempt/${attempt.id}`);
    } finally {
      setBusy(false);
    }
  }

  function handleCardClick(exam: MockExamSummary) {
    if (exam.has_draft && exam.draft_attempt_id) {
      navigate(`/mock-exams/attempt/${exam.draft_attempt_id}`);
    } else {
      setStartingExam(exam);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Link to="/" className="mb-4 inline-block text-sm text-primary hover:underline">
        ← Գլխավոր
      </Link>
      <h1 className="mb-6 text-3xl font-semibold text-text">Ամբողջական թեստեր</h1>

      <div className="mb-6 flex gap-2">
        {SUBJECTS.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setSubject(s.key)}
            className={`rounded-md border px-5 py-2 text-sm font-medium transition-colors ${
              subject === s.key
                ? "border-primary bg-primary text-primary-contrast"
                : "border-border text-text hover:border-primary"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {!exams ? (
        <div className="text-lg text-text-muted">Բեռնվում է...</div>
      ) : exams.length === 0 ? (
        <div className="rounded-[var(--radius)] border border-border bg-surface p-8 text-center text-text-muted">
          Այս առարկայի թեստերը շուտով կավելացվեն։
        </div>
      ) : (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {exams.map((exam) => (
          <div
            key={exam.id}
            className="flex flex-col justify-between rounded-[var(--radius)] border border-border bg-surface p-5"
          >
            <div>
              <h3 className="mb-1 text-lg font-medium text-text">{exam.title}</h3>
              <p className="mb-3 text-sm text-text-muted">{exam.question_count} հարց</p>
              {exam.best_scaled_score !== null && (
                <p className="mb-3 text-sm text-text-muted">
                  Լավագույն արդյունք՝ {exam.best_scaled_score} / 20
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => handleCardClick(exam)}
                className="rounded-md bg-primary px-4 py-2 font-medium text-primary-contrast transition-colors hover:bg-primary-hover"
              >
                {exam.has_draft ? "Շարունակել" : "Սկսել"}
              </button>
              {exam.completed_attempts_count > 0 && (
                <Link
                  to={`/mock-exams/${exam.id}/history`}
                  className="rounded-md border border-border px-4 py-2 text-center text-sm font-medium text-text transition-colors hover:border-primary"
                >
                  Նախորդ պատասխանները ({exam.completed_attempts_count})
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
      )}

      {startingExam && (
        <MockExamStartPanel
          examTitle={startingExam.title}
          onStart={handleStart}
          onClose={() => setStartingExam(null)}
          busy={busy}
        />
      )}
    </div>
  );
}
