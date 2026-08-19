import { useState } from "react";
import type { Achievement, AchievementRarity, UserAchievement } from "../../api/profile";
import { Trophy } from "lucide-react";
import { AchievementCard } from "../AchievementCard";
import { EmptyState } from "../ui/EmptyState";
import { FilterChips } from "../ui/FilterChips";
import { SkeletonRows } from "../ui/Skeleton";
import { ProfileCard } from "./ProfileCard";

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
    <ProfileCard
      icon={Trophy}
      title="Նվաճումներ"
      description={achievements ? `Բացված է ${trophiesCount} ${achievements.length}-ից` : undefined}
    >
      <FilterChips
        label="Նվաճումների զտիչ"
        size="sm"
        className="mb-[var(--space-4)]"
        options={(Object.keys(FILTER_LABELS) as Filter[]).map((f) => ({ value: f, label: FILTER_LABELS[f] }))}
        value={filter}
        onChange={setFilter}
      />

      {achievements === null && <SkeletonRows count={3} />}

      {achievements !== null && filtered.length === 0 && (
        <EmptyState
          icon={<Trophy size={22} strokeWidth={1.75} />}
          title="Այս զտիչով նվաճումներ չկան"
          hint="Փոխեք զտիչը՝ մնացած նվաճումները տեսնելու համար։"
          size="sm"
          cta={{ label: "Ցույց տալ բոլորը", onClick: () => setFilter("all") }}
        />
      )}

      {filtered.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {filtered.map((a) => (
            <AchievementCard key={a.id} achievement={a} unlocked={unlockedKeys.has(a.key)} />
          ))}
        </div>
      )}
    </ProfileCard>
  );
}
