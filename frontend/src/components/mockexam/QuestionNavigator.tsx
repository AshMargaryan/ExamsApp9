import { Flag } from "lucide-react";
import { cn } from "../../lib/cn";

/*
  The map of an exam in progress.

  Why this exists
  ---------------
  The attempt runner rendered a 30-question exam as one flat scroll with no
  index: no way to jump to a question, no view of which ones were still blank,
  and no way to mark one to come back to. The only signal a student got was a
  single line of text at the very bottom saying how many were unanswered —
  which they could only reach by scrolling past everything. §36 asks for
  question navigation, answered/unanswered state and flagged questions; none
  of the three existed.

  Status is not carried by colour alone: answered chips are filled *and*
  solid-bordered, unanswered are dashed outlines, and flagged carry a flag
  glyph. Each chip's accessible name states its status in words.
*/

export type QuestionNavState = {
  answered: boolean;
  flagged: boolean;
};

export function QuestionNavigator({
  states,
  current,
  onJump,
  className,
}: {
  states: QuestionNavState[];
  /** Index of the question nearest the viewport, highlighted as "you are here". */
  current?: number;
  onJump: (index: number) => void;
  className?: string;
}) {
  const answered = states.filter((s) => s.answered).length;
  const flagged = states.filter((s) => s.flagged).length;

  return (
    <div className={cn("rounded-[var(--radius-lg)] border border-border bg-surface p-[var(--space-4)]", className)}>
      <div className="mb-[var(--space-3)] flex flex-wrap items-baseline justify-between gap-[var(--space-2)]">
        <p className="text-[length:var(--text-sm)] font-medium text-text">
          {answered} / {states.length} պատասխանված
        </p>
        {flagged > 0 && (
          <p className="inline-flex items-center gap-[var(--space-1)] text-[length:var(--text-xs)] text-accent">
            <Flag size={12} strokeWidth={2.25} aria-hidden />
            {flagged} նշված
          </p>
        )}
      </div>

      <ul className="flex flex-wrap gap-[var(--space-2)]">
        {states.map((state, index) => (
          <li key={index}>
            <button
              type="button"
              onClick={() => onJump(index)}
              aria-current={current === index ? "true" : undefined}
              aria-label={`Հարց ${index + 1}՝ ${
                state.answered ? "պատասխանված" : "դեռ չպատասխանված"
              }${state.flagged ? ", նշված" : ""}`}
              className={cn(
                "relative flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)]",
                "text-[length:var(--text-sm)] font-medium transition-colors",
                state.answered
                  ? "border border-primary bg-primary text-primary-contrast"
                  : "border border-dashed border-border text-text-muted hover:border-primary hover:text-text",
                current === index && "ring-2 ring-primary ring-offset-2 ring-offset-[var(--color-surface)]",
              )}
            >
              {index + 1}
              {state.flagged && (
                <Flag
                  size={10}
                  strokeWidth={3}
                  aria-hidden
                  className="absolute -top-1 -right-1 rounded-full bg-accent p-[1px] text-primary-contrast"
                />
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
