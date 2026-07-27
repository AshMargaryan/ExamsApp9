import { useEffect, useMemo, useState } from "react";

const COLORS = ["#f4c542", "#f2726e", "#8785f0", "#4ade9a", "#2dd4c4"];
const PARTICLES_PER_BURST = 14;

interface Burst {
  id: number;
  top: number;
  left: number;
  color: string;
}

function BurstParticles({ color }: { color: string }) {
  const particles = useMemo(
    () =>
      Array.from({ length: PARTICLES_PER_BURST }, (_, i) => {
        const angle = (i / PARTICLES_PER_BURST) * Math.PI * 2;
        const radius = 45 + Math.random() * 35;
        return { id: i, dx: Math.cos(angle) * radius, dy: Math.sin(angle) * radius };
      }),
    [],
  );

  return (
    <>
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute h-1.5 w-1.5 rounded-full"
          style={
            {
              backgroundColor: color,
              animation: "firework-particle 900ms ease-out forwards",
              "--dx": `${p.dx}px`,
              "--dy": `${p.dy}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </>
  );
}

/** A handful of firework bursts scheduled over `durationMs`, each mounted
 * fresh (so its animation always starts at t=0 for that burst — simpler and
 * more reliable than trying to stagger via CSS animation-delay). */
export function Fireworks({ count = 5, durationMs = 2500 }: { count?: number; durationMs?: number }) {
  const [bursts, setBursts] = useState<Burst[]>([]);

  useEffect(() => {
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    for (let i = 0; i < count; i++) {
      const delay = (i / count) * durationMs + Math.random() * 200;
      timeouts.push(
        setTimeout(() => {
          setBursts((prev) => [
            ...prev,
            {
              id: i,
              top: 15 + Math.random() * 35,
              left: 10 + Math.random() * 80,
              color: COLORS[i % COLORS.length],
            },
          ]);
        }, delay),
      );
    }
    return () => timeouts.forEach(clearTimeout);
  }, [count, durationMs]);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
      {bursts.map((b) => (
        <div key={b.id} className="absolute" style={{ top: `${b.top}%`, left: `${b.left}%` }}>
          <BurstParticles color={b.color} />
        </div>
      ))}
    </div>
  );
}
