import type { CSSProperties, ReactNode } from "react";
import { cn } from "../../lib/cn";

export function Card({
  children,
  className = "",
  as: As = "div",
  style,
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section";
  style?: CSSProperties;
}) {
  return (
    <As className={cn("rounded-[var(--radius)] border border-border bg-surface p-5", className)} style={style}>
      {children}
    </As>
  );
}
