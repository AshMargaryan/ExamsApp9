import { rankTier } from "../../lib/rankTier";

export function RankBadge({ rank, size = "md" }: { rank: number; size?: "sm" | "md" | "lg" }) {
  const tier = rankTier(rank);
  const dimension = size === "lg" ? "h-11 w-11 text-lg" : size === "sm" ? "h-6 w-6 text-[11px]" : "h-7 w-7 text-xs";

  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-mono font-bold tabular-nums ${dimension} ${
        tier ? "" : "bg-surface-muted text-text-muted"
      }`}
      style={tier ? { color: tier.text, backgroundColor: tier.bg, border: `1px solid ${tier.line}` } : undefined}
    >
      {rank}
    </span>
  );
}
