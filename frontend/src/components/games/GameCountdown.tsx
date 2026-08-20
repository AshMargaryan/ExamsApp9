import { Timer } from "lucide-react";
import { cn } from "../../lib/cn";

/*
  Seconds left on the current question.

  A live quiz question runs 15–30 seconds, so `ui`'s exam timer — whose
  thresholds are five minutes and one minute — is the wrong instrument
  entirely. Same discipline, different scale.

    normal    > 10s   quiet, so it does not compete with the question
    warning  <= 10s   accent, "you should be deciding by now"
    critical  <= 5s   error colour and a pulse

  The size is fixed across all three. It used to jump from `text-3xl` to
  `text-4xl` at the threshold, which reflowed the header row at the exact
  moment the player most needed the screen to hold still.

  Colour is never the only carrier: the label states the remaining time in
  Armenian words, and the critical state is announced.
*/
export function GameCountdown({ secondsLeft }: { secondsLeft: number | null }) {
  const critical = secondsLeft !== null && secondsLeft <= 5;
  const warning = secondsLeft !== null && !critical && secondsLeft <= 10;

  return (
    <div
      role="timer"
      aria-live={critical ? "assertive" : "off"}
      aria-label={secondsLeft === null ? "Ժամանակը հայտնի չէ" : `Մնացել է ${secondsLeft} վայրկյան`}
      className={cn(
        "inline-flex items-center gap-[var(--space-2)] rounded-[var(--radius-md)] border",
        "px-[var(--space-3)] py-[var(--space-1)] tabular-nums transition-colors duration-[var(--motion-fast)]",
        critical
          ? "border-incorrect bg-incorrect-bg text-incorrect"
          : warning
            ? "border-accent-line bg-accent-bg text-accent"
            : "border-border bg-surface-muted text-text",
      )}
    >
      <Timer
        size={16}
        strokeWidth={2}
        aria-hidden
        className={cn(critical && "animate-pulse motion-reduce:animate-none")}
      />
      <span className="text-[length:var(--text-xl)] font-semibold">
        {secondsLeft ?? "—"}
        <span aria-hidden className="ml-0.5 text-[length:var(--text-sm)] font-normal">վ</span>
      </span>
    </div>
  );
}
