import { useEffect } from "react";
import confetti from "canvas-confetti";

interface Props {
  correctCount: number;
  total: number;
  onContinue: () => void;
  continueLabel: string;
  onClose?: () => void;
}

export function ScoreModal({ correctCount, total, onContinue, continueLabel, onClose }: Props) {
  const percent = total > 0 ? Math.round((100 * correctCount) / total) : 0;
  const perfect = total > 0 && correctCount === total;

  useEffect(() => {
    if (!perfect) return;
    const end = Date.now() + 1200;
    (function frame() {
      confetti({ particleCount: 4, angle: 60, spread: 60, origin: { x: 0 } });
      confetti({ particleCount: 4, angle: 120, spread: 60, origin: { x: 1 } });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  }, [perfect]);

  const color = percent >= 80 ? "text-correct" : percent >= 50 ? "text-medium" : "text-incorrect";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-[var(--radius)] border border-border bg-surface p-8 text-center shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Փակել"
            className="absolute top-3 right-3 text-lg text-text-muted transition-colors hover:text-text"
          >
            ✕
          </button>
        )}
        {perfect && <p className="mb-2 text-4xl">🎉</p>}
        <p className={`text-4xl font-bold ${color}`}>{percent}%</p>
        <p className="mt-2 text-lg text-text">
          {correctCount} / {total} ճիշտ պատասխան
        </p>
        <button
          type="button"
          onClick={onContinue}
          className="mt-6 w-full rounded-md bg-primary py-2.5 text-lg font-medium text-primary-contrast transition-colors hover:bg-primary-hover"
        >
          {continueLabel}
        </button>
      </div>
    </div>
  );
}
