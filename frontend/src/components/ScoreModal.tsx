import { useEffect } from "react";
import { PartyPopper } from "lucide-react";
import confetti from "canvas-confetti";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { Button } from "./ui/Button";
import { Modal } from "./ui/Modal";

interface Props {
  correctCount: number;
  total: number;
  onContinue: () => void;
  continueLabel: string;
  onClose?: () => void;
}

/*
  The result of a finished practice tier.

  Three things were wrong with the hand-rolled version this replaces.

  1. It was a bare `fixed inset-0` div with a click-outside handler: no
     `role="dialog"`, no `aria-modal`, no focus trap, no Escape, and no focus
     restoration. Tab walked straight out of it into the page underneath,
     which is still there and still scrollable. It is now on `ui/Modal`
     (Radix), the same correction session 5 applied to DeckFormModal.
  2. The confetti burst ignored `prefers-reduced-motion` — 1.2 seconds of
     particles fired from both edges of the screen at a student who has
     asked the system for less motion. The global CSS rule in index.css
     cannot help here, because canvas-confetti paints to a canvas rather
     than running a CSS animation; this is exactly the case
     `useReducedMotion` was written for, and it had no callers.
     The loop also never cancelled, so closing the modal mid-burst left it
     firing particles over the page for the rest of the 1.2s.
  3. How the student did was carried by colour alone — green, amber or red
     on the percentage — which §50 forbids and which is invisible to a
     red/green-colourblind student and to anyone reading the number out.
     The verdict is stated in words now, and the colour merely agrees
     with it.
*/

function verdict(percent: number, perfect: boolean): string {
  if (perfect) return "Անթերի է";
  if (percent >= 80) return "Ամուր արդյունք";
  if (percent >= 50) return "Կիսով չափ յուրացրած";
  return "Այս թեման ուշադրություն է պահանջում";
}

export function ScoreModal({ correctCount, total, onContinue, continueLabel, onClose }: Props) {
  const percent = total > 0 ? Math.round((100 * correctCount) / total) : 0;
  const perfect = total > 0 && correctCount === total;
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!perfect || reducedMotion) return;
    let raf = 0;
    let cancelled = false;
    const end = Date.now() + 1200;
    (function frame() {
      if (cancelled) return;
      confetti({ particleCount: 4, angle: 60, spread: 60, origin: { x: 0 } });
      confetti({ particleCount: 4, angle: 120, spread: 60, origin: { x: 1 } });
      if (Date.now() < end) raf = requestAnimationFrame(frame);
    })();
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [perfect, reducedMotion]);

  const tone = percent >= 80 ? "text-correct" : percent >= 50 ? "text-medium" : "text-incorrect";

  return (
    <Modal
      open
      onOpenChange={(next) => {
        if (!next) onClose?.();
      }}
      title={verdict(percent, perfect)}
      /* Two named actions rather than the old bare "✕" in the corner. Closing
         this modal is not "dismiss" — it puts the student back on their own
         marked answers, which is the more useful of the two things they might
         want next, so it says so. Every other ui/Modal call site offers its
         way out as a labelled footer action too. */
      footer={
        <>
          {onClose && (
            <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
              Տեսնել պատասխանները
            </Button>
          )}
          <Button type="button" className="flex-1" onClick={onContinue}>
            {continueLabel}
          </Button>
        </>
      }
    >
      <div className="text-center">
        {perfect && (
          <PartyPopper size={36} strokeWidth={1.5} aria-hidden className="mx-auto mb-[var(--space-2)] text-accent" />
        )}
        <p className={`text-[length:var(--text-4xl)] font-bold leading-[var(--leading-display)] ${tone}`}>{percent}%</p>
        <p className="mt-[var(--space-2)] text-[length:var(--text-base)] text-text">
          {correctCount} / {total} ճիշտ պատասխան
        </p>
      </div>
    </Modal>
  );
}
