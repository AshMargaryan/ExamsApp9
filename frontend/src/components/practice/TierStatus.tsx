import { Check } from "lucide-react";
import { TIER_LABELS, type Tier } from "../../api/practice";
import { cn } from "../../lib/cn";

const TIERS: Tier[] = ["easy", "medium", "hard"];

/*
  How far a student has got through one subtopic's three difficulty tiers.

  Why this exists
  ---------------
  Three surfaces reported the same fact three different ways: the navigator
  showed a single "0%" inside a circle, the subtopic page showed
  "Ավարտված ✓ (33%)" per tier, and the recommendation cards showed only a
  difficulty word. None of them let a student see at a glance which tier to
  pick up next, which is the actual decision being made.

  Status is never carried by colour alone (§50): an attempted tier gets a
  filled pip *and* a check glyph, an unattempted one stays an outline, and
  every pip has a text label in its accessible name.
*/

export type TierScores = Record<Tier, number | null>;

export function tierSummary(scores: TierScores): { done: number; total: number } {
  return { done: TIERS.filter((t) => scores[t] !== null).length, total: TIERS.length };
}

/** The next tier a student has not attempted, or null when all three are done. */
export function nextTier(scores: TierScores): Tier | null {
  return TIERS.find((t) => scores[t] === null) ?? null;
}

export function TierStatus({ scores, className }: { scores: TierScores; className?: string }) {
  return (
    <div className={cn("flex items-center gap-[var(--space-1)]", className)}>
      {TIERS.map((tier) => {
        const score = scores[tier];
        const done = score !== null;
        return (
          <span
            key={tier}
            title={
              done
                ? `${TIER_LABELS[tier]} · ${score}%`
                : `${TIER_LABELS[tier]} · դեռ չսկսված`
            }
            aria-label={
              done
                ? `${TIER_LABELS[tier]} մակարդակ, ${score} տոկոս`
                : `${TIER_LABELS[tier]} մակարդակ, դեռ չսկսված`
            }
            className={cn(
              "inline-flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-semibold",
              done
                ? "border-transparent text-primary-contrast"
                : "border-dashed border-border text-text-muted",
            )}
            style={done ? { backgroundColor: `var(--color-${tier})` } : undefined}
          >
            {done ? <Check size={12} strokeWidth={3} aria-hidden /> : null}
          </span>
        );
      })}
    </div>
  );
}
