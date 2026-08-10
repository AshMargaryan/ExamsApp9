import { useState } from "react";
import type { Achievement, AchievementRarity, UserAchievement } from "../../api/profile";
import { AchievementCard } from "../AchievementCard";
import { SectionHeader } from "../ui/SectionHeader";

type Filter = "all" | "unlocked" | "locked" | AchievementRarity;

const FILTER_LABELS: Record<Filter, string> = {
  all: "Բոլորը",
  unlocked: "Ապակողպված",
  locked: "Կողպված",
  common: "Սովորական",
  rare: "Հազվագյուտ",
  epic: "Էպիկական",
  legendary: "Լեգենդար",
};

export function AchievementsSection({
  achievements,
  myAchievements,
  trophiesCount,
}: {
  achievements: Achievement[] | null;
  myAchievements: UserAchievement[] | null;
  trophiesCount: number;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const unlockedKeys = new Set((myAchievements ?? []).map((ua) => ua.achievement.key));

  const filtered = (achievements ?? []).filter((a) => {
    const unlocked = unlockedKeys.has(a.key);
    if (filter === "unlocked") return unlocked;
    if (filter === "locked") return !unlocked;
    if (filter === "all") return true;
    return a.rarity === filter;
  });

  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-5">
      <SectionHeader title={`🏆 Նվաճումներ ${achievements ? `(${trophiesCount}/${achievements.length})` : ""}`} />

      <div className="mb-3 flex flex-wrap gap-1">
        {(Object.keys(FILTER_LABELS) as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${
              filter === f ? "border-primary text-primary" : "border-border text-text-muted"
            }`}
          >
            {FILTER_LABELS[f]}
          </button>
        ))}
      </div>

      {achievements === null && <p className="text-sm text-text-muted">Բեռնվում է...</p>}

      {achievements !== null && filtered.length === 0 && (
        <p className="text-sm text-text-muted">Այս զտիչով նվաճումներ չկան։</p>
      )}

      {filtered.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {filtered.map((a) => (
            <AchievementCard key={a.id} achievement={a} unlocked={unlockedKeys.has(a.key)} />
          ))}
        </div>
      )}
    </div>
  );
}
