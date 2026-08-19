import type { Assignment } from "../../api/teaching";
import { assignmentDisplayTitle, assignmentTargetLabel } from "../../lib/assignmentLabels";
import { formatRelativeTime } from "../../lib/relativeTime";
import { Avatar } from "../ui/Avatar";
import { EmptyState } from "../ui/EmptyState";
import { LinkButton } from "../ui/LinkButton";

export function PendingReviewQueue({ items }: { items: Assignment[] }) {
  if (items.length === 0) {
    return (
      <EmptyState
        tone="positive"
        icon="🎉"
        title="Ստուգման սպասող առաջադրանք չկա"
        hint="Ամեն ինչ ստուգված է։ Նոր ուղարկված աշխատանքները կհայտնվեն այստեղ։"
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((a) => {
        const studentName = [a.student.first_name, a.student.last_name].filter(Boolean).join(" ") || a.student.username;
        return (
          <div
            key={a.id}
            className="flex flex-wrap items-center gap-3 rounded-[var(--radius)] border border-border bg-surface p-3 transition-colors duration-[var(--motion-fast)] hover:border-primary"
          >
            <Avatar src={a.student.avatar} name={studentName} size="md" />
            <div className="min-w-0 flex-1 basis-40">
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
