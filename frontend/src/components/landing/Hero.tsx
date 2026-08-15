import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

function useHeroStage() {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(1), 250),
      setTimeout(() => setStage(2), 850),
      setTimeout(() => setStage(3), 1500),
      setTimeout(() => setStage(4), 2200),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);
  return stage;
}

function HeroMockup() {
  const stage = useHeroStage();

  return (
    <div
      className={`relative w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-2xl shadow-black/10 transition-all duration-700 ${
        stage >= 1 ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      }`}
    >
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold text-text">Այսօրվա նպատակը</p>
        <span
          className={`flex items-center gap-1 rounded-full bg-surface-muted px-2.5 py-1 text-xs font-semibold text-text transition-all duration-500 ${
            stage >= 1 ? "scale-100 opacity-100" : "scale-75 opacity-0"
          }`}
        >
          🔥 7 օրյա շարք
        </span>
      </div>

      <div className="rounded-xl border border-border bg-bg p-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="flex items-center gap-1.5 font-medium text-text">🧮 Մաթեմատիկա</span>
          <span className="text-text-muted">Քառակուսի հավասարումներ</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-muted">
          <div
            className="h-full rounded-full bg-accent transition-all duration-[1200ms] ease-out"
            style={{ width: stage >= 2 ? "82%" : "0%" }}
          />
        </div>
        <p className="mt-1.5 text-right text-xs font-medium text-text-muted">
          {stage >= 2 ? "82%" : "0%"}
        </p>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-bg p-4">
        <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-text">🤖 AI Tutor</p>
        <p className="mb-2 inline-block rounded-lg rounded-tr-sm bg-surface-muted px-3 py-1.5 text-xs text-text">
          Ինչպե՞ս լուծեմ այս հավասարումը։
        </p>
        <div
          className={`inline-block rounded-lg rounded-tl-sm bg-primary px-3 py-1.5 text-xs text-primary-contrast transition-opacity duration-500 ${
            stage >= 3 ? "opacity-100" : "opacity-0"
          }`}
        >
          {stage >= 3 ? "Եկ քայլ առ քայլ լուծենք…" : "···"}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-xl border border-border bg-bg px-4 py-3">
        <span
          className={`text-sm font-semibold text-correct transition-all duration-500 ${
            stage >= 4 ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
          }`}
        >
          +42 XP
        </span>
        <span className="flex items-center gap-1.5 text-sm text-text">
          <span className={stage >= 4 ? "text-text-muted line-through" : "font-semibold"}>#7</span>
          {stage >= 4 && (
            <>
              <span className="text-text-muted">→</span>
              <span className="font-semibold text-primary">#4</span>
            </>
          )}
        </span>
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <div id="top" className="relative overflow-hidden pt-28 pb-16 sm:pt-36 sm:pb-24">
      {/* Subtle grid + soft glow — no gradients/blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--color-border) 1px, transparent 1px), linear-gradient(to bottom, var(--color-border) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          opacity: 0.35,
          maskImage: "radial-gradient(ellipse 70% 60% at 50% 0%, black 40%, transparent 90%)",
          WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 0%, black 40%, transparent 90%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-[-10%] left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full opacity-[0.10]"
        style={{ backgroundColor: "var(--color-primary)", filter: "blur(120px)" }}
      />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-8 lg:px-8">
        <div className="text-center lg:text-left">
          <h1 className="text-balance text-4xl leading-[1.1] font-bold tracking-tight text-text sm:text-5xl lg:text-6xl">
            Սովորիր ավելի խելացի։
            <br />
            Հասիր ավելի հեռու։
          </h1>

          {/* subtle Armenian-inspired diamond-chain divider */}
          <div className="my-6 flex justify-center gap-2 lg:justify-start" aria-hidden>
            {Array.from({ length: 5 }).map((_, i) => (
              <span
                key={i}
                className="h-2 w-2 rotate-45 border border-primary"
                style={{ opacity: 0.25 + i * 0.12 }}
              />
            ))}
          </div>

          <p className="mx-auto max-w-lg text-lg text-text-muted lg:mx-0">
            Gitus-ը AI ուսումնական հարթակ է, որը օգնում է հասկանալ բարդ թեմաները, պատրաստվել քննություններին
            և կառուցել քո սեփական առաջընթացը։
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <Link
              to="/register"
              className="bg-primary w-full rounded-lg px-6 py-3.5 text-center text-base font-semibold text-primary-contrast shadow-lg shadow-blue-600/20 transition-colors hover:bg-primary-hover sm:w-auto"
            >
              🚀 Սկսել սովորել
            </Link>
            <Link
              to="/register"
              className="w-full rounded-lg border border-border bg-surface px-6 py-3.5 text-center text-base font-semibold text-text transition-colors hover:border-primary sm:w-auto"
            >
              🤖 Փորձել AI Tutor-ը
            </Link>
          </div>
        </div>

        <div className="flex justify-center lg:justify-end">
          <HeroMockup />
        </div>
      </div>
    </div>
  );
}
