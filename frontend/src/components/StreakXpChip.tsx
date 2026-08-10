import { Tooltip } from "./ui/Tooltip";

interface StreakXpChipProps {
  streak: number;
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
}

/** Compact header HUD — one composed pill, not two separate stat cards (spec section 18:
 * "Do NOT make them three identical statistic cards"). Expands into the full animated HUD
 * in Phase 2; this is the minimal, real-data version so the header isn't empty until then. */
export function StreakXpChip({ streak, level, xpIntoLevel, xpForNextLevel }: StreakXpChipProps) {
  return (
    <Tooltip label={`${xpIntoLevel} / ${xpForNextLevel} XP`}>
      <div className="flex items-center gap-1 rounded-full border border-border bg-surface-muted p-1 text-sm font-semibold text-text">
        <span className="flex items-center gap-1 px-2 py-1" aria-label={`${streak} օր շարունակ`}>
          <span aria-hidden="true">🔥</span>
          <span>{streak}</span>
        </span>
        <span className="h-4 w-px bg-border" aria-hidden="true" />
        <span
          className="flex items-center gap-1 rounded-full px-2 py-1 text-white"
          style={{ background: "var(--gradient-hero)" }}
          aria-label={`Level ${level}`}
        >
          <span aria-hidden="true">⭐</span>
          <span>{level}</span>
        </span>
      </div>
    </Tooltip>
  );
}
