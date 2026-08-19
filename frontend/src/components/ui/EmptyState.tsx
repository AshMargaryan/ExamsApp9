import type { ReactNode } from "react";
import { Button } from "./Button";

/*
  The "there's nothing here yet" surface.

  `tone="positive"` is for empty states that are good news — an empty review
  queue or an empty mistakes list means the class is on top of things, and it
  should read that way rather than as a failure.
*/

export type EmptyStateTone = "neutral" | "positive";
export type EmptyStateSize = "sm" | "md";

export function EmptyState({
  icon,
  title,
  hint,
  cta,
  tone = "neutral",
  size = "md",
  className = "",
}: {
  icon?: ReactNode;
  title: string;
  hint?: string;
  cta?: { label: string; onClick: () => void };
  tone?: EmptyStateTone;
  size?: EmptyStateSize;
  className?: string;
}) {
  const pad = size === "sm" ? "p-4" : "p-6";
  const iconTone = tone === "positive" ? "text-correct" : "text-text-muted";

  return (
    <div
      className={`rounded-[var(--radius)] border border-dashed border-border bg-surface text-center ${pad} ${className}`}
    >
      {icon && <p className={`flex justify-center text-2xl ${iconTone}`}>{icon}</p>}
      <p className={`text-sm font-medium text-text ${icon ? "mt-2" : ""}`}>{title}</p>
      {hint && <p className="mt-1 text-xs text-text-muted">{hint}</p>}
      {cta && (
        <Button variant="secondary" size="sm" onClick={cta.onClick} className="mt-3">
          {cta.label} →
        </Button>
      )}
    </div>
  );
}
