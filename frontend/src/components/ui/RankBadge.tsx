import { cn } from "../../lib/cn";
import { rankTier } from "../../lib/rankTier";

/*
  A leaderboard position.

  There were two of these — `components/rankings/RankBadge` (tiered gold /
  silver / bronze, three sizes) and, alongside them in three other places, a
  copy-pasted `{ 1: "🥇", 2: "🥈", 3: "🥉" }` emoji map. The emoji version had
  three problems beyond the mixed icon language: it *replaced* the number, so
  a column showed a glyph for the top three and "#7" for everyone else; emoji
  render at different widths per platform, so that column did not line up; and
  a screen reader announced "2nd place medal" in English inside an otherwise
  Armenian row.

  This is the tiered version, promoted out of the rankings folder so the
  profile, the monthly-ranking card and the season awards use the same badge
  as the leaderboard itself. The number is always shown; the metal is added
  on top of it, never instead of it.
*/

const DIMENSION = {
  sm: "h-6 w-6 text-[length:var(--text-xs)]",
  md: "h-7 w-7 text-[length:var(--text-xs)]",
  lg: "h-11 w-11 text-[length:var(--text-lg)]",
} as const;

export function RankBadge({
  rank,
  size = "md",
  className,
}: {
  rank: number;
  size?: keyof typeof DIMENSION;
  className?: string;
}) {
  const tier = rankTier(rank);

  return (
    <span
      aria-label={`${rank}-րդ տեղ`}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-[var(--radius-full)] font-mono font-bold tabular-nums",
        DIMENSION[size],
        !tier && "bg-surface-muted text-text-muted",
        className,
      )}
      style={tier ? { color: tier.text, backgroundColor: tier.bg, border: `1px solid ${tier.line}` } : undefined}
    >
      <span aria-hidden="true">{rank}</span>
    </span>
  );
}
