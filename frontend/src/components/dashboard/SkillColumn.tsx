import { CircleAlert, CircleCheck, CircleDot } from "lucide-react";
import { cn } from "../../lib/cn";

/*
  One mastery bucket in the parent's skills breakdown.

  The three columns used to be distinguished by a prop literally called
  `color`, whose values were the emoji "🟢" / "🟡" / "🔴". So the only signal
  of which bucket a skill sat in was a coloured circle — unreadable in
  greyscale, unreadable to the ~8% of fathers with red/green colour
  blindness looking at their child's report, and announced by a screen
  reader as "large green circle" in the middle of an Armenian heading.

  Each bucket now carries its own icon shape as well as its own hue, and the
  hue comes from the semantic tokens rather than from an emoji font.
*/

export type SkillTone = "mastered" | "practicing" | "needs_improvement";

const TONE: Record<SkillTone, { Icon: typeof CircleCheck; className: string }> = {
  mastered: { Icon: CircleCheck, className: "text-correct" },
  practicing: { Icon: CircleDot, className: "text-warning" },
  needs_improvement: { Icon: CircleAlert, className: "text-incorrect" },
};

export function SkillColumn({
  title,
  tone,
  items,
}: {
  title: string;
  tone: SkillTone;
  items: { name: string; subject_name: string; avg_score: number }[];
}) {
  const { Icon, className } = TONE[tone];

  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-[var(--space-4)]">
      <h3 className="mb-[var(--space-2)] flex items-center gap-[var(--space-2)] text-[length:var(--text-sm)] font-semibold text-text">
        <Icon size={15} strokeWidth={2.25} aria-hidden="true" className={cn("shrink-0", className)} />
        <span className="min-w-0">
          {title} ({items.length})
        </span>
      </h3>
      {items.length === 0 ? (
        <p className="text-[length:var(--text-xs)] text-text-muted">Դեռ ոչինչ այս խմբում։</p>
      ) : (
        <ul className="flex flex-col gap-[var(--space-2)]">
          {items.slice(0, 8).map((item) => (
            <li key={item.name} className="text-[length:var(--text-xs)] text-text-muted">
              <span className="text-text">{item.name}</span> · {item.subject_name} · {item.avg_score}%
            </li>
          ))}
          {items.length > 8 && (
            <li className="text-[length:var(--text-xs)] text-text-muted">
              +{items.length - 8} այլ
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
