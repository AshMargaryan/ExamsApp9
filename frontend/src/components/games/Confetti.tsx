import { useMemo } from "react";

const COLORS = ["#f4c542", "#5b5bd6", "#14b8a6", "#f2726e", "#8785f0", "#4ade9a"];

interface Particle {
  id: number;
  left: number;
  delay: number;
  duration: number;
  dx: number;
  rot: number;
  color: string;
  width: number;
  height: number;
}

/** A one-shot confetti burst covering the viewport. Mount when celebrating,
 * unmount a few seconds later — it doesn't clean up after itself. */
export function Confetti({ count = 70 }: { count?: number }) {
  const particles = useMemo<Particle[]>(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
        duration: 2.4 + Math.random() * 1.6,
        dx: (Math.random() - 0.5) * 240,
        rot: 360 + Math.random() * 720,
        color: COLORS[i % COLORS.length],
        width: 5 + Math.random() * 6,
        height: 8 + Math.random() * 8,
      })),
    [count],
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute top-0 rounded-[2px]"
          style={
            {
              left: `${p.left}%`,
              width: p.width,
              height: p.height,
              backgroundColor: p.color,
              animation: `confetti-fall ${p.duration}s ease-in ${p.delay}s forwards`,
              "--dx": `${p.dx}px`,
              "--rot": `${p.rot}deg`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
