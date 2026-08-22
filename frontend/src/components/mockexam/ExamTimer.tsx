import { Clock } from "lucide-react";
import { formatSeconds } from "../../api/mockExams";
import { cn } from "../../lib/cn";

/*
  Time remaining, with urgency.

  Before, this was `<div className="text-lg font-semibold text-text">` — the
  same weight as the exam title beside it, and identical at sixty minutes and
  at thirty seconds. In a timed exam the single most important changing fact
  on screen gave no signal at all as it ran out, and the attempt simply
  auto-submitted when it hit zero.

  Three states, because a student deep in a question needs peripheral warning
  without being startled out of their train of thought:

    normal   > 5:00   quiet, tabular, low contrast
    warning  <= 5:00  accent colour, "5 րոպե" is the classic last-check point
    critical <= 1:00  error colour and a slow pulse

  The pulse is CSS-only and `motion-reduce` disables it. Colour is never the
  only carrier: the accessible label states the remaining time in words, and
  the critical state adds a visible text warning rather than relying on red.
*/

export function ExamTimer({ remainingSeconds }: { remainingSeconds: number }) {
  const critical = remainingSeconds <= 60;
  const warning = !critical && remainingSeconds <= 300;

  return (
    <div
      role="timer"
      aria-live={critical ? "assertive" : "off"}
      aria-label={`Մնացել է ${formatSeconds(remainingSeconds)}`}
      className={cn(
        "inline-flex items-center gap-[var(--space-2)] rounded-[var(--radius-md)] px-[var(--space-3)] py-[var(--space-2)]",
        "border tabular-nums transition-colors",
        critical
          ? "border-incorrect bg-[color-mix(in_srgb,var(--color-incorrect)_12%,var(--color-surface))] text-incorrect"
          : warning
            ? "border-accent-line bg-accent-bg text-accent"
            : "border-border bg-surface-muted text-text",
      )}
    >
      <Clock
        size={16}
        strokeWidth={2}
        aria-hidden
        className={cn(critical && "animate-pulse motion-reduce:animate-none")}
      />
      <span className="text-[length:var(--text-lg)] font-semibold">{formatSeconds(remainingSeconds)}</span>
      {critical && (
        <span className="text-[length:var(--text-xs)] font-medium">Ավարտվում է</span>
      )}
    </div>
  );
}
