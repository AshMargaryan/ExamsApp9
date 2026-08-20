import { ChevronDown, ChevronUp, ChevronsUp, Minus, type LucideIcon } from "lucide-react";
import { cn } from "../../lib/cn";
import type { TaskPriority } from "../../api/todo";

/*
  A task's priority.

  This was `{ urgent: "🔴", high: "🟠", medium: "🟡", low: "🟢" }` rendered
  inside a badge that *already* carried the same information twice more, in
  its border colour and its text colour. Three encodings of one fact, all
  three of them hue — so to a colour-blind reader the badge said only its
  label, and `PriorityDot`, which exported the bare emoji as a standalone
  indicator with `aria-hidden`, said nothing whatsoever.

  Priority is ordinal, so the icon encodes rank rather than temperature:
  a double chevron up, a single chevron up, a dash, a chevron down. That
  survives greyscale, survives a screen reader (the dot carries a label now),
  and matches the one icon language.

  `high` also held the codebase's one hardcoded hex, `#f97316`, with a comment
  explaining that no orange token existed. One does — the identity's apricot
  accent is exactly that colour, and unlike the literal it moves correctly
  between light and dark.
*/
const PRIORITY_META: Record<
  TaskPriority,
  { Icon: LucideIcon; label: string; className: string }
> = {
  urgent: { Icon: ChevronsUp, label: "Հրատապ", className: "border-hard text-hard" },
  high: { Icon: ChevronUp, label: "Բարձր", className: "border-accent-line text-accent" },
  medium: { Icon: Minus, label: "Միջին", className: "border-medium text-medium" },
  low: { Icon: ChevronDown, label: "Ցածր", className: "border-easy text-easy" },
};

export function PriorityBadge({ priority, className }: { priority: TaskPriority; className?: string }) {
  const { Icon, label, className: toneClass } = PRIORITY_META[priority];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5",
        "text-[length:var(--text-xs)] font-medium",
        toneClass,
        className,
      )}
    >
      <Icon size={12} strokeWidth={2.25} aria-hidden />
      {label}
    </span>
  );
}

/** The icon alone, for rows too dense for the full badge. Keeps an accessible
 *  name, because an icon with no label is exactly the case the badge exists
 *  to avoid. */
export function PriorityDot({ priority }: { priority: TaskPriority }) {
  const { Icon, label, className } = PRIORITY_META[priority];
  return (
    <span className={cn("inline-flex shrink-0", className.split(" ").find((c) => c.startsWith("text-")))}>
      <Icon size={14} strokeWidth={2.25} aria-label={`Առաջնահերթություն՝ ${label}`} />
    </span>
  );
}

export const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = (
  ["urgent", "high", "medium", "low"] as TaskPriority[]
).map((value) => ({ value, label: PRIORITY_META[value].label }));
