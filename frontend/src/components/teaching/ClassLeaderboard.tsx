import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import * as teachingApi from "../../api/teaching";
import type { LeaderboardEntry } from "../../api/teaching";
import { rankTier } from "../../lib/rankTier";
import { Avatar } from "../ui/Avatar";
import { EmptyState } from "../ui/EmptyState";
import { SkeletonRows } from "../ui/Skeleton";

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
    return <SkeletonRows count={4} />;
  }

  if (entries.length === 0) {
    return (
      <EmptyState
        icon={<Trophy size={26} strokeWidth={1.5} />}
        title="Դեռ կապակցված աշակերտներ չկան"
        hint="Հրավիրեք աշակերտների՝ ամսվա դասակարգումը տեսնելու համար։"
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {entries.map((entry) => {
        const tier = rankTier(entry.rank);
        const name =
          [entry.student.first_name, entry.student.last_name].filter(Boolean).join(" ") ||
          entry.student.username;
        return (
          <button
            key={entry.student.id}
            type="button"
            onClick={() => onSelectStudent(entry.student.id)}
            className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[var(--radius)] border border-border bg-surface p-3 text-left transition-colors duration-[var(--motion-fast)] ease-[var(--ease-out)] hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            style={tier ? { borderColor: tier.line } : undefined}
          >
            {/* Top three carry their tier colour — the platform's existing
             * gold/silver/bronze system, reused rather than reinvented. */}
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums"
              style={
                tier
                  ? { color: tier.text, backgroundColor: tier.bg }
                  : { color: "var(--color-text-muted)" }
              }
            >
              {entry.rank}
            </span>
            <Avatar src={entry.student.avatar} name={name} size="md" />
            <span className="min-w-0 flex-1 basis-32">
              <span className="block truncate text-sm font-medium text-text">{name}</span>
              <span className="block truncate text-xs text-text-muted">@{entry.student.username}</span>
            </span>
            <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-xs text-text-muted">
              Մակարդակ {entry.level}
            </span>
            <span className="shrink-0 text-right text-sm font-semibold tabular-nums text-text">
              {entry.monthly_xp} XP
            </span>
            <span className="shrink-0 text-right">
              <TrendBadge trend={entry.trend} />
            </span>
          </button>
        );
      })}
    </div>
  );
}
