import { useNavigate, Link } from "react-router-dom";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { cn } from "../../lib/cn";
import { parseExamTitle } from "../../lib/examTitle";
import type { MockExamSummary } from "../../api/mockExams";
import { subjectMeta } from "../../lib/subjects";

interface Props {
  exam: MockExamSummary;
  /** Where the primary action (and the card body) navigate to — a draft
   * resumes straight into the attempt, everything else opens the detail page. */
  primaryTo: string;
  historyTo?: string;
}

export function ExamCard({ exam, primaryTo, historyTo }: Props) {
  const navigate = useNavigate();
  const subject = subjectMeta(exam.subject);
  const { main, secondary } = parseExamTitle(exam.title, subject?.label ?? exam.title);

  const status: "not_started" | "in_progress" | "completed" = exam.has_draft
    ? "in_progress"
    : exam.completed_attempts_count > 0
      ? "completed"
      : "not_started";

  const primaryLabel = status === "in_progress" ? "Շարունակել" : status === "completed" ? "Կրկնել" : "Սկսել";
  const primaryIcon = status === "completed" ? "↻" : "▶";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(primaryTo)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate(primaryTo);
        }
      }}
      className={cn(
        "group flex cursor-pointer flex-col justify-between rounded-[var(--radius)] border border-border bg-surface p-5",
        "transition-[transform,box-shadow,border-color] duration-[var(--motion-fast)] ease-[var(--ease-out)]",
        "hover:-translate-y-0.5 hover:border-primary hover:shadow-md active:translate-y-0",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
      )}
    >
      <div>
        <div className="mb-2 flex items-start justify-between gap-2">
          <h3 className="text-lg font-semibold text-text">{main}</h3>
          <StatusBadge status={status} />
        </div>
        {secondary && <p className="mb-3 text-sm text-text-muted">{secondary}</p>}
        <p className="mb-3 text-sm text-text-muted">{exam.question_count} հարց</p>
        {exam.best_scaled_score !== null && (
          <p className="mb-3 text-sm font-medium text-primary">
            Լավագույն արդյունք՝ {exam.best_scaled_score} / 20
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Button variant="primary" className="pointer-events-none w-full" tabIndex={-1}>
          {primaryIcon} {primaryLabel}
        </Button>
        {historyTo && (
          <Link
            to={historyTo}
            onClick={(e) => e.stopPropagation()}
            className="rounded-[var(--radius)] border border-border px-4 py-2 text-center text-sm font-medium text-text transition-colors hover:border-primary"
          >
            Տեսնել արդյունքը ({exam.completed_attempts_count})
          </Link>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: "not_started" | "in_progress" | "completed" }) {
  if (status === "in_progress") return <Badge tone="primary">Ընթացքի մեջ</Badge>;
  if (status === "completed") return <Badge tone="correct">Ավարտված</Badge>;
  return <Badge tone="neutral">Չսկսված</Badge>;
}
