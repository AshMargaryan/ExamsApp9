import { useEffect, useState } from "react";
import * as teachingApi from "../../api/teaching";
import type { LeaderboardEntry } from "../../api/teaching";

function TrendBadge({ trend }: { trend: LeaderboardEntry["trend"] }) {
  if (!trend) return <span className="text-xs text-text-muted">—</span>;
  if (trend.xp_change > 0) {
    return <span className="text-xs font-medium text-correct">▲ {trend.xp_change}</span>;
  }
  if (trend.xp_change < 0) {
    return <span className="text-xs font-medium text-incorrect">▼ {Math.abs(trend.xp_change)}</span>;
  }
  return <span className="text-xs text-text-muted">— 0</span>;
}

export function ClassLeaderboard({ onSelectStudent }: { onSelectStudent: (studentId: number) => void }) {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);

  useEffect(() => {
    teachingApi.fetchClassLeaderboard().then(setEntries);
  }, []);

  if (!entries) {
    return <p className="text-text-muted">Բեռնվում է...</p>;
  }

  if (entries.length === 0) {
    return (
      <p className="rounded-[var(--radius)] border border-border bg-surface p-5 text-text-muted">
        Դեռ կապակցված աշակերտներ չկան։
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {entries.map((entry) => (
        <button
          key={entry.student.id}
          type="button"
          onClick={() => onSelectStudent(entry.student.id)}
          className="flex items-center gap-3 rounded-[var(--radius)] border border-border bg-surface p-3 text-left transition-colors hover:border-primary"
        >
          <span className="w-6 shrink-0 text-center text-sm font-semibold text-text-muted">
            {entry.rank}
          </span>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-muted text-sm font-semibold text-text-muted">
            {entry.student.avatar ? (
              <img src={entry.student.avatar} alt={entry.student.username} className="h-full w-full object-cover" />
            ) : (
              (entry.student.first_name || entry.student.username).slice(0, 1).toUpperCase()
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-text">
              {[entry.student.first_name, entry.student.last_name].filter(Boolean).join(" ") ||
                entry.student.username}
            </span>
            <span className="block text-xs text-text-muted">@{entry.student.username}</span>
          </span>
          <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-xs text-text-muted">
            Մակարդակ {entry.level}
          </span>
          <span className="w-16 shrink-0 text-right text-sm font-semibold text-text">
            {entry.monthly_xp} XP
          </span>
          <span className="w-14 shrink-0 text-right">
            <TrendBadge trend={entry.trend} />
          </span>
        </button>
      ))}
    </div>
  );
}
