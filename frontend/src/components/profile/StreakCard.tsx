import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { ProgressBar } from "../ui/ProgressBar";

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
    <div className="rounded-[var(--radius)] border border-border bg-surface p-5">
      <div className="flex items-center justify-between">
        <p className="text-2xl font-semibold text-text">🔥 {currentStreak}-օրյա շարք</p>
      </div>
      <p className="mt-1 text-sm text-text-muted">Լավագույն շարք՝ {longestStreak} օր</p>

      {nextMilestone && (
        <div className="mt-3">
          <div className="flex items-baseline justify-between text-xs text-text-muted">
            <span>Հաջորդ նպատակակետ՝ {nextMilestone} օր</span>
            <span>{currentStreak}/{nextMilestone}</span>
          </div>
          <div className="mt-1">
            <ProgressBar percent={percent} colorClassName="bg-medium" />
          </div>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {MILESTONES.map((m) => (
          <span
            key={m}
            className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
              currentStreak >= m ? "border-medium text-medium" : "border-border text-text-muted"
            }`}
          >
            {m}
          </span>
        ))}
      </div>
    </div>
  );
}
