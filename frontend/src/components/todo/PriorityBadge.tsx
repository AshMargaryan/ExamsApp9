import { cn } from "../../lib/cn";
import type { TaskPriority } from "../../api/todo";

const PRIORITY_META: Record<TaskPriority, { emoji: string; label: string; twClass?: string; color?: string }> = {
  urgent: { emoji: "🔴", label: "Հրատապ", twClass: "border-hard text-hard" },
  // No "orange" design token exists yet (theme.css only has easy/medium/hard) — this is
  // the one deliberate exception, not a pattern to copy elsewhere.
  high: { emoji: "🟠", label: "Բարձր", color: "#f97316" },
  medium: { emoji: "🟡", label: "Միջին", twClass: "border-medium text-medium" },
  low: { emoji: "🟢", label: "Ցածր", twClass: "border-easy text-easy" },
};

export function PriorityBadge({ priority, className }: { priority: TaskPriority; className?: string }) {
  const meta = PRIORITY_META[priority];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        meta.twClass,
        className,
      )}
      style={meta.color ? { color: meta.color, borderColor: meta.color } : undefined}
    >
      <span aria-hidden="true">{meta.emoji}</span>
      {meta.label}
    </span>
  );
}

export function PriorityDot({ priority }: { priority: TaskPriority }) {
  return <span aria-hidden="true">{PRIORITY_META[priority].emoji}</span>;
}

export const PRIORITY_OPTIONS: { value: TaskPriority; emoji: string; label: string }[] = (
  ["urgent", "high", "medium", "low"] as TaskPriority[]
).map((value) => ({ value, emoji: PRIORITY_META[value].emoji, label: PRIORITY_META[value].label }));
