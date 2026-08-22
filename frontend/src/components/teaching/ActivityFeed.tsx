import { CornerUpLeft, Check, UserPlus, Upload } from "lucide-react";
import type { ActivityEvent } from "../../api/teaching";
import { formatRelativeTime } from "../../lib/relativeTime";
import { EmptyState } from "../ui/EmptyState";

/*
  Recent class events.

  Rendered as a continuous timeline rather than a stack of bordered cards:
  it sits next to the weak-spots panel and the review queue, and three
  identical row lists side by side read as one undifferentiated blur. The
  density here is deliberately lighter — this is glanceable history, not a
  worklist.
*/

const ICON: Record<ActivityEvent["type"], { icon: typeof Check; className: string }> = {
  submitted: { icon: Upload, className: "text-primary" },
  approved: { icon: Check, className: "text-correct" },
  rejected: { icon: CornerUpLeft, className: "text-text-muted" },
  joined: { icon: UserPlus, className: "text-accent" },
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
      return `${name}-ը միացավ Ձեր դասարանին`;
  }
}

export function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  if (events.length === 0) {
    return <EmptyState size="sm" title="Դեռ ակտիվություն չկա" hint="Աշակերտների գործողությունները կհայտնվեն այստեղ։" />;
  }

  return (
    <ol className="relative flex flex-col gap-4 border-l border-border pl-5">
      {events.map((e, i) => {
        const { icon: Icon, className } = ICON[e.type];
        return (
          <li key={i} className="relative">
            <span
              aria-hidden="true"
              className={`absolute -left-[1.72rem] top-0.5 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-surface ${className}`}
            >
              <Icon size={11} strokeWidth={2} />
            </span>
            <p className="text-sm leading-snug text-text">{eventText(e)}</p>
            <p className="mt-0.5 text-xs text-text-muted">{formatRelativeTime(e.at)}</p>
          </li>
        );
      })}
    </ol>
  );
}
