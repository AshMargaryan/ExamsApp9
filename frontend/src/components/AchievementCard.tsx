import { Award } from "lucide-react";
import type { Achievement } from "../api/profile";
import { RarityBadge } from "./ui/Badge";

export function AchievementCard({
  achievement,
  unlocked,
  progress,
  onClick,
}: {
  achievement: Achievement;
  unlocked: boolean;
  /** 0-100, shown as a thin progress bar for locked achievements when known. */
  progress?: number;
  onClick?: () => void;
}) {
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      title={achievement.description}
      className={`rounded-[var(--radius)] border border-border bg-surface p-4 text-center transition-colors ${
        unlocked ? "" : "opacity-40 grayscale"
      } ${onClick ? "hover:border-primary" : ""}`}
    >
      <p className="flex justify-center text-2xl">
        {unlocked ? achievement.icon || <Award size={22} strokeWidth={1.75} /> : <Award size={22} strokeWidth={1.75} />}
      </p>
      <p className="mt-1 text-sm font-medium text-text">{achievement.name}</p>
      <RarityBadge rarity={achievement.rarity} />
      {!unlocked && typeof progress === "number" && (
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-surface-muted">
          <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, progress)}%` }} />
        </div>
      )}
    </Wrapper>
  );
}
