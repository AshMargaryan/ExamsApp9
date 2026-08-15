import type { Assignment } from "../../api/teaching";
import { assignmentDisplayTitle, assignmentTargetLabel } from "../../lib/assignmentLabels";
import { formatRelativeTime } from "../../lib/relativeTime";
import { LinkButton } from "../ui/LinkButton";

export function PendingReviewQueue({ items }: { items: Assignment[] }) {
  if (items.length === 0) {
    return (
      <p className="rounded-[var(--radius)] border border-border bg-surface p-5 text-text-muted">
        Ստուգման սպասող առաջադրանք չկա։ 🎉
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((a) => {
        const studentName = [a.student.first_name, a.student.last_name].filter(Boolean).join(" ") || a.student.username;
        return (
          <div
            key={a.id}
            className="flex items-center gap-3 rounded-[var(--radius)] border border-border bg-surface p-3"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-muted text-sm font-semibold text-text-muted">
              {a.student.avatar ? (
                <img src={a.student.avatar} alt={a.student.username} className="h-full w-full object-cover" />
              ) : (
                studentName.slice(0, 1).toUpperCase()
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-text">{studentName}</p>
              <p className="truncate text-xs text-text-muted">
                {assignmentDisplayTitle(a)} · {assignmentTargetLabel(a)}
              </p>
            </div>
            <span className="shrink-0 text-xs text-text-muted">
              {a.submitted_at && formatRelativeTime(a.submitted_at)}
            </span>
            <LinkButton to={`/assignments/${a.id}`} variant="primary" size="sm" className="shrink-0">
              Ստուգել
            </LinkButton>
          </div>
        );
      })}
    </div>
  );
}
