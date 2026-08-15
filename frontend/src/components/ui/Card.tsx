import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
  as: As = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section";
}) {
  return (
    <As className={`rounded-[var(--radius)] border border-border bg-surface p-5 ${className}`}>
      {children}
    </As>
  );
}
