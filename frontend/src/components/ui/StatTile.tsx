import type { ReactNode } from "react";

/*
  A single metric.

  `size` is what creates hierarchy on a dashboard: a "hero" tile reads as the
  headline number and "sm" tiles read as supporting detail, so a metrics band
  stops being N identical boxes competing for attention.
*/

export type StatTileSize = "sm" | "md" | "hero";
export type StatTileTone = "default" | "primary" | "correct" | "incorrect";

const VALUE_SIZE: Record<StatTileSize, string> = {
  sm: "text-xl",
  md: "text-2xl",
  hero: "text-4xl sm:text-5xl",
};

const TONE_CLASS: Record<StatTileTone, string> = {
  default: "text-text",
  primary: "text-primary",
  correct: "text-correct",
  incorrect: "text-incorrect",
};

export function StatTile({
  label,
  value,
  hint,
  delta,
  icon,
  size = "md",
  tone = "default",
  align = "center",
  className = "",
}: {
  label: string;
  value: string;
  hint?: string;
  /** Signed change vs. a prior period, e.g. "+4.2%". Colored by sign. */
  delta?: string;
  icon?: ReactNode;
  size?: StatTileSize;
  tone?: StatTileTone;
  align?: "center" | "start";
  className?: string;
}) {
  const deltaTone = delta?.startsWith("-") ? "text-incorrect" : delta ? "text-correct" : "";
  const alignClass = align === "start" ? "text-left items-start" : "text-center items-center";

  return (
    <div
      className={`flex flex-col rounded-[var(--radius)] border border-border bg-surface p-5 ${alignClass} ${className}`}
    >
      {icon && <span className={`mb-2 flex text-text-muted ${TONE_CLASS[tone]}`}>{icon}</span>}
      <p className={`font-semibold tabular-nums ${VALUE_SIZE[size]} ${TONE_CLASS[tone]}`}>{value}</p>
      <p className="mt-1 text-sm text-text-muted">{label}</p>
      {delta && <p className={`mt-0.5 text-xs font-medium ${deltaTone}`}>{delta}</p>}
      {hint && !delta && <p className="mt-0.5 text-xs text-text-muted">{hint}</p>}
    </div>
  );
}
