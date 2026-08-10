import type { ReactNode } from "react";
import type { AchievementRarity } from "../../api/profile";
import { RARITY_COLORS, RARITY_LABELS } from "../../lib/achievementRarity";

export function RarityBadge({ rarity }: { rarity: AchievementRarity }) {
  return (
    <span
      className="text-xs font-medium"
      style={{ color: RARITY_COLORS[rarity] }}
    >
      {RARITY_LABELS[rarity]}
    </span>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "primary" | "correct" | "incorrect";
}) {
  const toneClass = {
    neutral: "border-border text-text-muted",
    primary: "border-primary text-primary",
    correct: "border-correct text-correct",
    incorrect: "border-incorrect text-incorrect",
  }[tone];
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${toneClass}`}>
      {children}
    </span>
  );
}
