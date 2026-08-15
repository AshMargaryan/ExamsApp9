import { SUBJECTS, type SubjectKey } from "../../lib/subjects";
import { ProgressBar } from "../ui/ProgressBar";
import { cn } from "../../lib/cn";
import type { MockExamSummary } from "../../api/mockExams";

interface Props {
  exams: MockExamSummary[] | null;
  active: SubjectKey;
  onSelect: (subject: SubjectKey) => void;
}

export function SubjectNav({ exams, active, onSelect }: Props) {
  return (
    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {SUBJECTS.map((s) => {
        const subjectExams = exams?.filter((e) => e.subject === s.key) ?? [];
        const total = subjectExams.length;
        const completed = subjectExams.filter((e) => e.completed_attempts_count > 0).length;
        const isActive = active === s.key;

        return (
          <button
            key={s.key}
            type="button"
            onClick={() => onSelect(s.key)}
            aria-pressed={isActive}
            className={cn(
              "flex flex-col gap-2 rounded-[var(--radius)] border p-4 text-left",
              "transition-[border-color,background-color,box-shadow] duration-[var(--motion-fast)] ease-[var(--ease-out)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
              isActive
                ? "border-primary bg-surface shadow-sm"
                : "border-border bg-surface hover:border-primary/60",
            )}
          >
            <div className="flex items-center gap-2">
              <span className="text-xl" aria-hidden="true">{s.icon}</span>
              <span className={cn("text-sm font-medium", isActive ? "text-primary" : "text-text")}>
                {s.label}
              </span>
            </div>
            <p className="text-xs text-text-muted">
              {exams === null ? "…" : `${completed} / ${total}`}
            </p>
            <ProgressBar
              percent={total ? (100 * completed) / total : 0}
              colorClassName={isActive ? "bg-primary" : "bg-text-muted/50"}
              heightClassName="h-1"
              label={`${s.label} առաջընթաց`}
            />
          </button>
        );
      })}
    </div>
  );
}
