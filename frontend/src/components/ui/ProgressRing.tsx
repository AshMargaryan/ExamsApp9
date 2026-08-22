import { useId, type ReactNode } from "react";
import { cn } from "../../lib/cn";

/*
  Radial progress — the "how far along am I" primitive for mastery, readiness
  and day-completion, where a bar would read as a minor detail rather than the
  headline number.

  Deliberately SVG rather than a conic-gradient: a conic ring can't be dashed
  for the unknown state, can't animate its sweep, and gives assistive tech
  nothing to announce. The stroke transition is the only motion, so this stays
  quiet on the page.

  `value === null` is a real state, not a zero — it renders a dashed track and
  whatever "we don't know yet" content the caller passes as children. Never
  show 0% for missing data.
*/

export type ProgressRingTone = "brand" | "primary" | "correct" | "warning" | "incorrect" | "neutral";

const TONE_COLOR: Record<Exclude<ProgressRingTone, "brand">, string> = {
  primary: "var(--color-primary)",
  correct: "var(--color-correct)",
  warning: "var(--color-medium)",
  incorrect: "var(--color-incorrect)",
  neutral: "var(--color-text-muted)",
};

export function ProgressRing({
  value,
  size = 160,
  thickness = 10,
  tone = "brand",
  label,
  children,
  className,
}: {
  /** 0–100, or null when there is genuinely no data yet. */
  value: number | null;
  size?: number;
  thickness?: number;
  tone?: ProgressRingTone;
  /** Accessible name, e.g. "Միջին իմացություն". */
  label: string;
  /** Centre content — usually the number and a caption. */
  children?: ReactNode;
  className?: string;
}) {
  // useId() emits colons, which break url(#id) references in Safari.
  const gradientId = `ring-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = value == null ? 0 : Math.max(0, Math.min(100, value));
  const stroke = tone === "brand" ? `url(#${gradientId})` : TONE_COLOR[tone];

  return (
    <div
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size }}
      role={value == null ? "img" : "progressbar"}
      aria-label={label}
      aria-valuenow={value == null ? undefined : Math.round(pct)}
      aria-valuemin={value == null ? undefined : 0}
      aria-valuemax={value == null ? undefined : 100}
      aria-valuetext={value == null ? undefined : `${Math.round(pct)}%`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className="-rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--color-primary)" />
            <stop offset="55%" stopColor="var(--color-purple)" />
            <stop offset="100%" stopColor="var(--color-pink)" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-surface-muted)"
          strokeWidth={thickness}
          strokeDasharray={value == null ? "3 7" : undefined}
          strokeLinecap="round"
        />
        {value != null && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={stroke}
            strokeWidth={thickness}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - (pct / 100) * circumference}
            style={{ transition: "stroke-dashoffset var(--motion-emphasis) var(--ease-out)" }}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}
