import { useMemo } from "react";
import { hexRgb } from "./hierarchyLayout";

interface Particle {
  px: number;
  py: number;
  size: number;
  dur: number;
  bdur: number;
  delay: number;
}

const PARTICLE_COUNT = 26;

// Fixed dark cosmic backdrop + a slow-drifting particle field + a soft
// accent-colored glow that eases toward whatever's currently focused — all
// decorative, all pointer-events:none. Matches the uploaded design's
// background treatment; deliberately NOT tied to the app's light/dark
// theme tokens since the design specifies its own exact palette for this
// one immersive screen.
export function AmbientBackground({ accent }: { accent: string }) {
  const particles = useMemo<Particle[]>(
    () =>
      Array.from({ length: PARTICLE_COUNT }, () => ({
        px: Math.random() * 100,
        py: Math.random() * 100,
        size: Math.random() * 1.8 + 0.7,
        dur: 18 + Math.random() * 22,
        bdur: 6 + Math.random() * 9,
        delay: Math.random() * -20,
      })),
    []
  );

  const ambientA = hexRgb(accent, 0.14);
  const ambientB = hexRgb(accent, 0.1);
  const particleColor = hexRgb(accent, 0.55);

  return (
    <>
      <div
        style={{
          position: "absolute",
          inset: "-20%",
          background: `radial-gradient(38% 42% at 50% 46%, ${ambientA}, rgba(6,7,11,0) 70%)`,
          transition: "background 1400ms ease",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(90% 70% at 50% 120%, ${ambientB}, rgba(6,7,11,0) 65%)`,
          transition: "background 1400ms ease",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.35,
          pointerEvents: "none",
          backgroundImage: "radial-gradient(rgba(255,255,255,.055) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {particles.map((p, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${p.px}%`,
              top: `${p.py}%`,
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              background: particleColor,
              animation: `hierarchy-drift ${p.dur}s ease-in-out infinite, hierarchy-breathe ${p.bdur}s ease-in-out infinite`,
              animationDelay: `${p.delay}s`,
              transition: "background 1200ms ease",
            }}
          />
        ))}
      </div>
    </>
  );
}
