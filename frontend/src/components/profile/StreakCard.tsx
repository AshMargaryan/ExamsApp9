import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { Check, Flame } from "lucide-react";
import { ProgressBar } from "../ui/ProgressBar";
import { DataCard } from "../ui/DataCard";

const MILESTONES = [7, 14, 30, 60, 100, 365];

export function StreakCard({ currentStreak, longestStreak }: { currentStreak: number; longestStreak: number }) {
  const celebratedRef = useRef<number | null>(null);

  const nextMilestone = MILESTONES.find((m) => m > currentStreak) ?? null;
  const prevMilestone = [...MILESTONES].reverse().find((m) => m <= currentStreak) ?? 0;
  const percent = nextMilestone
    ? ((currentStreak - prevMilestone) / (nextMilestone - prevMilestone)) * 100
    : 100;

  useEffect(() => {
    if (!MILESTONES.includes(currentStreak)) return;
    if (celebratedRef.current === currentStreak) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    // Deferred to a macrotask so React StrictMode's dev-only mount→unmount→
    // remount cycle cancels the first (throwaway) invocation via the cleanup
    // below, instead of firing confetti twice and racing canvas-confetti's
    // shared canvas mid-animation.
    const timer = setTimeout(() => {
      celebratedRef.current = currentStreak;
      try {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      } catch {
        // Never worth crashing the page over a celebration animation.
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [currentStreak]);

  return (
    <DataCard
      icon={Flame}
      title="Ուսումնական շարք"
      description={`Լավագույն շարք՝ ${longestStreak} օր`}
    >
      <p className="font-display text-[length:var(--text-3xl)] font-semibold leading-[var(--leading-display)] text-text">
        {currentStreak}
        <span className="ml-[var(--space-2)] text-[length:var(--text-base)] font-normal text-text-muted">
          օր անընդմեջ
        </span>
      </p>

      {nextMilestone && (
        <div className="mt-[var(--space-4)]">
          <div className="flex items-baseline justify-between text-xs text-text-muted">
            <span>Հաջորդ նպատակակետ՝ {nextMilestone} օր</span>
            <span>{currentStreak}/{nextMilestone}</span>
          </div>
          <div className="mt-1">
            <ProgressBar percent={percent} colorClassName="bg-medium" />
          </div>
        </div>
      )}

      {/* Reached milestones are marked with a tick as well as a colour —
          "which of these have I passed" must survive greyscale. */}
      <ul className="mt-[var(--space-4)] flex flex-wrap gap-[var(--space-2)]">
        {MILESTONES.map((m) => {
          const reached = currentStreak >= m;
          return (
            <li
              key={m}
              className={`flex items-center gap-1 rounded-[var(--radius-full)] border px-[var(--space-2)] py-[2px] text-[length:var(--text-xs)] font-medium ${
                reached ? "border-medium text-medium" : "border-border text-text-muted"
              }`}
            >
              {reached && <Check size={11} strokeWidth={3} aria-hidden="true" />}
              <span>{m}</span>
              <span className="sr-only">
                {reached ? " օր՝ հասած" : " օր՝ դեռ չհասած"}
              </span>
            </li>
          );
        })}
      </ul>
    </DataCard>
  );
}
