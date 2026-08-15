import type { ReactNode } from "react";
import { Button } from "./Button";

export function EmptyState({
  icon,
  title,
  hint,
  cta,
}: {
  icon: ReactNode;
  title: string;
  hint?: string;
  cta?: { label: string; onClick: () => void };
}) {
  return (
    <div className="rounded-[var(--radius)] border border-dashed border-border bg-surface p-6 text-center">
      <p className="flex justify-center text-2xl text-text-muted">{icon}</p>
      <p className="mt-2 text-sm font-medium text-text">{title}</p>
      {hint && <p className="mt-1 text-xs text-text-muted">{hint}</p>}
      {cta && (
        <Button variant="secondary" size="sm" onClick={cta.onClick} className="mt-3">
          {cta.label} →
        </Button>
      )}
    </div>
  );
}
