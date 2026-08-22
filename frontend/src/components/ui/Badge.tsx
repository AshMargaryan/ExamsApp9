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
  /** `incorrect` means the thing this labels *is* wrong or failed — not that
   *  it needs attention. "Waiting for you" is the latter, which is what
   *  `accent` is for. */
  tone?: "neutral" | "primary" | "accent" | "correct" | "incorrect";
}) {
  const toneClass = {
    neutral: "border-border text-text-muted",
    primary: "border-primary text-primary",
    accent: "border-accent-line text-accent",
    correct: "border-correct text-correct",
    incorrect: "border-incorrect text-incorrect",
  }[tone];
  return (
    // `shrink-0`: a badge is almost always the trailing item of a flex row
    // whose leading item is long Armenian text, and without it the badge is
    // the thing that gives way — measured at 38px tall against 22px for its
    // siblings, wrapping "Քո հերթն է" mid-phrase while the title beside it
    // had a `truncate` it was never allowed to use. Wrapping is still
    // possible if the row is genuinely too narrow; it is no longer the
    // *first* resort.
    <span className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${toneClass}`}>
      {children}
    </span>
  );
}
