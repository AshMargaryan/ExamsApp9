import type { ActivityEvent } from "../../api/teaching";
import { formatRelativeTime } from "../../lib/relativeTime";

const ICON: Record<ActivityEvent["type"], string> = {
  submitted: "📤",
  approved: "✅",
  rejected: "↩️",
  joined: "👋",
};

function eventText(e: ActivityEvent): string {
  const name = [e.student.first_name, e.student.last_name].filter(Boolean).join(" ") || e.student.username;
  switch (e.type) {
    case "submitted":
      return `${name}-ն ուղարկեց «${e.title || "առաջադրանք"}»`;
    case "approved":
      return `«${e.title || "Առաջադրանք"}» հաստատվեց ${name}-ի համար`;
    case "rejected":
      return `«${e.title || "Առաջադրանք"}» ուղարկվեց ուղղման ${name}-ին`;
    case "joined":
      return `${name}-ը միացավ ձեր դասարանին`;
  }
}

export function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="rounded-[var(--radius)] border border-border bg-surface p-5 text-text-muted">
        Դեռ ակտիվություն չկա։
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {events.map((e, i) => (
        <div key={i} className="flex items-center gap-3 rounded-[var(--radius)] border border-border bg-surface p-3">
          <span className="shrink-0 text-lg">{ICON[e.type]}</span>
          <p className="min-w-0 flex-1 truncate text-sm text-text">{eventText(e)}</p>
          <span className="shrink-0 text-xs text-text-muted">{formatRelativeTime(e.at)}</span>
        </div>
      ))}
    </div>
  );
}
