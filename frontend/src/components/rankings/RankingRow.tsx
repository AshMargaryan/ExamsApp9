import type { RankingEntry } from "../../api/rankings";
import { Avatar } from "./Avatar";
import { RankBadge } from "../ui/RankBadge";

export function RankingRow({ entry, isMe }: { entry: RankingEntry; isMe: boolean }) {
  return (
    <div
      className={`grid grid-cols-[1.75rem_2rem_1fr_auto] items-center gap-3 border-b border-border px-4 py-2.5 last:border-b-0 ${
        isMe ? "bg-primary/10" : ""
      }`}
    >
      <RankBadge rank={entry.rank} size="sm" />
      <Avatar avatar={entry.avatar} username={entry.username} size="sm" />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-text">
          {entry.first_name || entry.username} {entry.last_name}
          {isMe && <span className="ml-1 text-xs text-primary">(Դուք)</span>}
        </p>
        <p className="truncate text-xs text-text-muted">
          {entry.school?.name ?? "—"} · Մակարդակ {entry.level}
        </p>
      </div>
      <p className="shrink-0 font-mono text-sm font-bold tabular-nums text-text">{entry.xp} XP</p>
    </div>
  );
}
