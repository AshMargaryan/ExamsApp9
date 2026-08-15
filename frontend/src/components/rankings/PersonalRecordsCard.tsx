import type { ReactNode } from "react";
import { Flame, Trophy, Zap } from "lucide-react";
import type { PersonalRecords } from "../../api/profile";
import { rankTier } from "../../lib/rankTier";

export function PersonalRecordsCard({ records }: { records: PersonalRecords }) {
  const bestRankTier = records.best_rank_ever != null ? rankTier(records.best_rank_ever) : null;
  const iconSize = { size: 15, strokeWidth: 1.75 };

  const items = [
    records.best_rank_ever != null && {
      icon: <Trophy {...iconSize} />,
      label: "Լավագույն դիրք",
      value: `#${records.best_rank_ever}`,
      color: bestRankTier?.text,
    },
    records.best_month_xp != null && {
      icon: <Zap {...iconSize} />,
      label: "Ամենաշատ XP մեկ ամսում",
      value: `${records.best_month_xp} XP`,
    },
    records.longest_streak_days != null && {
      icon: <Flame {...iconSize} />,
      label: "Ամենաերկար շարք",
      value: `${records.longest_streak_days} օր`,
    },
  ].filter(Boolean) as { icon: ReactNode; label: string; value: string; color?: string }[];

  if (items.length === 0) {
    return (
      <p className="p-4 text-center text-sm text-text-muted">Դեռ բավարար տվյալ չկա անձնական ռեկորդների համար։</p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-center justify-between rounded-md border border-border bg-bg px-3 py-2"
        >
          <span className="flex items-center gap-1.5 text-sm text-text-muted">
            {item.icon} {item.label}
          </span>
          <span
            className="font-mono text-sm font-bold tabular-nums"
            style={{ color: item.color ?? "var(--color-text)" }}
          >
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}
