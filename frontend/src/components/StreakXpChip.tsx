import { Flame, Star } from "lucide-react";
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
        <span className="flex items-center gap-1 px-1.5 py-1 sm:px-2" aria-label={`${streak} օր շարունակ`}>
          <Flame size={14} strokeWidth={2} aria-hidden className="text-accent" />
          <span>{streak}</span>
        </span>
        <span className="hidden h-4 w-px bg-border sm:block" aria-hidden="true" />
        <span
          // `--gradient-hero` aliases the brand band, whose text token is
          // `--color-on-brand` — `text-white` happened to match it, but only
          // by coincidence, and only until someone changes the band.
          className="hidden items-center gap-1 rounded-full px-2 py-1 text-on-brand sm:flex"
          style={{ background: "var(--gradient-brand)" }}
          aria-label={`Level ${level}`}
        >
          <Star size={13} strokeWidth={2} aria-hidden fill="currentColor" />
          <span>{level}</span>
        </span>
      </div>
    </Tooltip>
  );
}
