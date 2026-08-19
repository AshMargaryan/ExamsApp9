import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

/*
  A number and its label, with no box around it.

  StatTile is the *bordered* metric — correct when a number needs to stand
  alone as a card. Metric is for the far more common case of several numbers
  living inside a card that already has a border: nesting boxes in boxes is the
  main thing that makes a dashboard look like an admin panel.

  `tone` is semantic, never decorative: use `correct`/`incorrect` when the
  number itself means good/bad (correct answers, mistakes), and leave it
  default when it is merely a count.
*/

export type MetricTone = "default" | "primary" | "correct" | "incorrect" | "muted";

const TONE_CLASS: Record<MetricTone, string> = {
  default: "text-text",
  primary: "text-primary",
  correct: "text-correct",
  incorrect: "text-incorrect",
  muted: "text-text-muted",
};

const SIZE_CLASS = {
  sm: "text-lg",
  md: "text-2xl",
  lg: "text-3xl",
} as const;

export function Metric({
  label,
  value,
  hint,
  tone = "default",
  size = "md",
  icon,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: MetricTone;
  size?: keyof typeof SIZE_CLASS;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className={cn("flex items-center gap-1.5 font-semibold tabular-nums", SIZE_CLASS[size], TONE_CLASS[tone])}>
        {icon}
        {value}
      </p>
      <p className="mt-0.5 truncate text-xs text-text-muted">{label}</p>
      {hint && <p className="mt-0.5 truncate text-[11px] text-text-muted">{hint}</p>}
    </div>
  );
}
