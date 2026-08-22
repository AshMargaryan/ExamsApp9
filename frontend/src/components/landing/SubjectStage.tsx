import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { OrbitItem, SubjectUniverse } from "./subjectUniverseData";

/**
 * One subject rendered as an orbital system.
 *
 * Orbits are three nested elements, which is the whole trick: a pivot at the
 * centre that rotates, an arm that pushes the item out to its radius, and a
 * counter-rotator running the same duration backwards so the item stays
 * upright while it travels. Doing it with transforms alone means the browser
 * animates one rotation per item on the compositor and never touches layout.
 *
 * Depth (`d`) is the other half of the illusion — it drives scale, opacity,
 * blur and z-index together, so a ring of items reads as a sphere seen
 * edge-on rather than as a circle of stickers.
 */

const STAGE_W = 640;
const STAGE_H = 680;

export function SubjectStage({ subject }: { subject: SubjectUniverse }) {
  const radii = [...new Set(subject.items.map((i) => i.r))].sort((a, b) => a - b);

  return (
    <div
      className="su-stage relative shrink-0"
      style={{ width: STAGE_W, height: STAGE_H }}
      aria-hidden="true"
    >
      {/* Field: guide rings plus a warped grid, faded out at the edges so the
          system sits in space instead of on a sheet of graph paper. */}
      <div className="su-field pointer-events-none absolute inset-0 opacity-80">
        {radii.map((r, idx) => (
          <div
            key={r}
            className="absolute top-1/2 left-1/2 rounded-full"
            style={{
              width: r * 2,
              height: r * 2,
              marginLeft: -r,
              marginTop: -r,
              border: `1px solid ${subject.accent}`,
              opacity: Math.min(0.55, subject.fieldStrength * (0.45 + idx * 0.16)),
            }}
          />
        ))}
        <svg
          viewBox={`0 0 ${STAGE_W} ${STAGE_H}`}
          className="absolute inset-0 h-full w-full"
          style={{ opacity: subject.fieldStrength }}
        >
          <defs>
            <filter id={`warp-${subject.id}`} x="-20%" y="-20%" width="140%" height="140%">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.01"
                numOctaves="2"
                seed={subject.seed}
                result="n"
              />
              <feDisplacementMap in="SourceGraphic" in2="n" scale={Math.round(subject.fieldStrength * 30)} />
            </filter>
            <pattern id={`grid-${subject.id}`} width="42" height="42" patternUnits="userSpaceOnUse">
              <path d="M42 0 L0 0 0 42" fill="none" stroke={subject.accent} strokeWidth="1" opacity="0.55" />
            </pattern>
            <radialGradient id={`fade-${subject.id}`} cx="50%" cy="46%" r="55%">
              <stop offset="0%" stopColor="#fff" stopOpacity="0" />
              <stop offset="35%" stopColor="#fff" stopOpacity="1" />
              <stop offset="70%" stopColor="#fff" stopOpacity="1" />
              <stop offset="100%" stopColor="#fff" stopOpacity="0" />
            </radialGradient>
            <mask id={`mask-${subject.id}`}>
              <rect width={STAGE_W} height={STAGE_H} fill={`url(#fade-${subject.id})`} />
            </mask>
          </defs>
          <rect
            width={STAGE_W}
            height={STAGE_H}
            fill={`url(#grid-${subject.id})`}
            filter={`url(#warp-${subject.id})`}
            mask={`url(#mask-${subject.id})`}
          />
        </svg>
      </div>

      <div className="su-central absolute top-1/2 left-1/2 z-[15] -translate-x-1/2 -translate-y-1/2">
        <Central subject={subject} />
      </div>

      {subject.items.map((item, i) => (
        <Orbit key={i} item={item} subject={subject} />
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- centrals */

function Central({ subject }: { subject: SubjectUniverse }) {
  const c = subject.central;
  const { accent, accent2 } = subject;

  if (c.type === "glyph") {
    return (
      <div
        className="font-display leading-none"
        style={{
          fontSize: 180,
          fontWeight: 300,
          color: "#f7f1e6",
          textShadow: `0 0 60px ${accent}, 0 0 160px ${accent}88`,
        }}
      >
        {c.char}
      </div>
    );
  }

  if (c.type === "medallion") {
    const shape = c.style === "cameo" ? "50% / 58%" : "50%";
    return (
      <div className="flex flex-col items-center gap-4">
        <div
          className="relative overflow-hidden"
          style={{
            width: 210,
            height: 210,
            borderRadius: shape,
            boxShadow: `0 0 90px ${accent}70, inset 0 0 46px ${accent}30`,
            border: `2px solid ${accent}cc`,
            background: "#0a0a12",
          }}
        >
          <img
            src={c.src}
            alt=""
            width={210}
            height={210}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0" style={{ boxShadow: "inset 0 0 40px rgba(0,0,0,.5)" }} />
          <div
            className="pointer-events-none absolute"
            style={{ inset: -6, borderRadius: shape, border: `1px solid ${accent2}80` }}
          />
          {c.style === "coin" && (
            <div
              className="pointer-events-none absolute"
              style={{
                inset: -14,
                borderRadius: "50%",
                background: `repeating-conic-gradient(${accent2} 0deg 3deg, transparent 3deg 8deg)`,
                WebkitMask: "radial-gradient(circle,transparent 66%,#000 70%,#000 78%,transparent 82%)",
                mask: "radial-gradient(circle,transparent 66%,#000 70%,#000 78%,transparent 82%)",
              }}
            />
          )}
        </div>
        <div className="font-display" style={{ fontSize: 18, letterSpacing: ".05em", color: "#f2ead9", opacity: 0.85 }}>
          {c.label}
        </div>
      </div>
    );
  }

  if (c.type === "blackhole") {
    return (
      <div className="relative flex items-center justify-center" style={{ width: 320, height: 320 }}>
        <div
          className="absolute rounded-full"
          style={{ inset: -30, background: `radial-gradient(circle,${accent2}55,transparent 60%)`, filter: "blur(24px)", opacity: 0.6 }}
        />
        <div
          className="su-spin absolute rounded-full"
          style={{
            inset: 26,
            transform: "rotate(-14deg) scaleY(.36)",
            background: `conic-gradient(from 0deg,${accent2},${accent} 35%,transparent 55%,${accent},${accent2})`,
            filter: "blur(5px)",
            boxShadow: `0 0 100px ${accent}aa`,
          }}
        />
        <div
          className="absolute rounded-full"
          style={{ inset: 74, transform: "rotate(-14deg) scaleY(.36)", border: `2px solid ${accent2}cc`, boxShadow: `0 0 24px ${accent2}aa` }}
        />
        <div
          className="z-[2] rounded-full"
          style={{ width: 100, height: 100, background: "#000", boxShadow: "0 0 0 2px rgba(255,255,255,.08), inset 0 0 40px #000" }}
        />
      </div>
    );
  }

  if (c.type === "atom") {
    const shells: Array<[number, number, number, string, number]> = [
      [-18, 250, 12, accent, 125],
      [38, 215, 17, accent2, 108],
      [92, 185, 9, accent, 92],
    ];
    return (
      <div className="relative flex items-center justify-center" style={{ width: 250, height: 250 }}>
        <div
          className="z-[3] rounded-full"
          style={{ width: 22, height: 22, background: `radial-gradient(circle,${accent2},${accent})`, boxShadow: `0 0 26px ${accent}` }}
        />
        {shells.map(([rot, size, secs, dot, dist], i) => (
          <div
            key={i}
            className="absolute inset-0 flex items-center justify-center"
            style={{ transform: `rotate(${rot}deg) scaleY(.42)` }}
          >
            <div className="rounded-full" style={{ width: size, height: size, border: `1px solid ${accent}55` }} />
            <div
              className="su-orbit absolute h-0 w-0"
              style={{ ["--start" as string]: `${i * 120}deg`, animationDuration: `${secs}s` }}
            >
              <div
                className="absolute rounded-full"
                style={{ width: 10 - i, height: 10 - i, background: dot, boxShadow: `0 0 12px ${dot}`, transform: `translateX(${dist}px)` }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (c.type === "helix") {
    /* Two phase-shifted sines with rungs between them — generated so the
       strands and the base pairs stay in phase at any size. */
    const pts = Array.from({ length: 41 }, (_, i) => {
      const t = i / 40;
      const y = 10 + t * 260;
      const phase = t * Math.PI * 3.4;
      return { y, a: 110 + Math.sin(phase) * 84, b: 110 - Math.sin(phase) * 84 };
    });
    const strand = (k: "a" | "b") => pts.map((p, i) => `${i ? "L" : "M"}${p[k].toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
    return (
      <svg width={220} height={280} viewBox="0 0 220 280" style={{ filter: `drop-shadow(0 0 30px ${accent}aa)` }}>
        <g fill="none" stroke="#f2ead9" strokeWidth="2.5" strokeLinecap="round">
          <path d={strand("a")} />
          <path d={strand("b")} />
        </g>
        <g stroke={accent2} strokeWidth="2" opacity="0.75">
          {pts.filter((_, i) => i % 3 === 0).map((p, i) => (
            <line key={i} x1={p.a} y1={p.y} x2={p.b} y2={p.y} />
          ))}
        </g>
      </svg>
    );
  }

  /* globe */
  return (
    <div className="relative" style={{ width: 240, height: 240 }}>
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle at 34% 30%, ${accent2}, ${accent} 55%, #0a1420 100%)`,
          boxShadow: `0 0 80px ${accent}66, inset -18px -18px 44px rgba(0,0,0,.55)`,
        }}
      />
      <svg viewBox="0 0 240 240" className="absolute inset-0 h-full w-full" style={{ opacity: 0.55 }}>
        <g fill="none" stroke="#f2ead9" strokeWidth="1">
          <circle cx="120" cy="120" r="119" />
          <ellipse cx="120" cy="120" rx="119" ry="40" />
          <ellipse cx="120" cy="120" rx="119" ry="80" />
          <ellipse cx="120" cy="120" rx="40" ry="119" />
          <ellipse cx="120" cy="120" rx="80" ry="119" />
        </g>
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------ orbit items */

function Orbit({ item, subject }: { item: OrbitItem; subject: SubjectUniverse }) {
  const scale = 0.55 + item.d * 0.6;
  const opacity = 0.3 + item.d * 0.65;
  const blur = (1 - item.d) * 2.2;
  const z = item.behind ? 4 : Math.round(6 + item.d * 24);
  const spin = (reverse: boolean) => (item.dir < 0 ? !reverse : reverse);

  const common: CSSProperties = {
    opacity,
    filter: blur > 0.15 ? `blur(${blur.toFixed(1)}px)` : undefined,
    transform: `translate(-50%,-50%) scale(${scale})`,
  };
  const frame: CSSProperties = {
    background: `linear-gradient(160deg, ${subject.accent}26, rgba(10,10,16,.55))`,
    border: `1px solid ${subject.accent}${item.big ? "cc" : "55"}`,
    boxShadow: item.big ? `0 0 40px ${subject.accent}80` : `0 0 18px ${subject.accent}30`,
  };

  return (
    <div
      className="su-orbit absolute top-1/2 left-1/2 h-0 w-0"
      style={{
        ["--start" as string]: `${item.a}deg`,
        animationDuration: `${item.sp}s`,
        animationDirection: spin(false) ? "reverse" : "normal",
        zIndex: z,
      }}
    >
      <div className="absolute top-0 left-0" style={{ transform: `translateX(${item.r}px)` }}>
        {/* Counter-rotation: same duration, opposite sense, so the content
            never turns upside down halfway round the orbit. */}
        <div
          className="su-orbit absolute top-0 left-0 h-0 w-0"
          style={{
            ["--start" as string]: `${-item.a}deg`,
            animationDuration: `${item.sp}s`,
            animationDirection: spin(true) ? "reverse" : "normal",
          }}
        >
          <OrbitContent item={item} subject={subject} common={common} frame={frame} />
        </div>
      </div>
    </div>
  );
}

function OrbitContent({
  item,
  subject,
  common,
  frame,
}: {
  item: OrbitItem;
  subject: SubjectUniverse;
  common: CSSProperties;
  frame: CSSProperties;
}) {
  const cls = `su-item${item.big ? " su-item-big" : ""}`;

  if (item.shape === "portrait") {
    const rect = item.imgShape === "rect";
    const w = rect ? item.s * 2.2 : item.s * 2.6;
    const h = rect ? item.s * 2.9 : item.s * 2.6;
    return (
      <div
        className={`${cls} relative overflow-hidden`}
        style={{
          ...common,
          width: w,
          height: h,
          borderRadius: rect ? 14 : "50%",
          border: `2px solid ${subject.accent}cc`,
          boxShadow: `${item.big ? "0 0 40px " : "0 0 18px "}${subject.accent}70`,
        }}
      >
        <img
          src={item.src}
          alt=""
          width={Math.round(w)}
          height={Math.round(h)}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  if (item.shape === "clock") {
    const sz = item.s * 2.1;
    return (
      <div className={`${cls} relative flex items-center justify-center rounded-full`} style={{ ...common, ...frame, width: sz, height: sz }}>
        <div className="su-hour absolute top-1/2 left-1/2" style={{ width: 3, height: "26%", background: "#f2ead9", transformOrigin: "bottom center" }} />
        <div className="su-minute absolute top-1/2 left-1/2" style={{ width: 2, height: "36%", background: "#f2ead9cc", transformOrigin: "bottom center" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ width: 6, height: 6, background: subject.accent2 }} />
      </div>
    );
  }

  if (item.shape === "icon") {
    const sz = item.s * 2.1;
    return (
      <div className={`${cls} relative flex items-center justify-center rounded-full`} style={{ ...common, ...frame, width: sz, height: sz }}>
        <Glyph icon={item.icon!} accent={subject.accent} accent2={subject.accent2} />
      </div>
    );
  }

  if (item.shape === "latex") {
    return (
      <TexBit
        tex={item.tex!}
        className={cls}
        style={{
          ...common,
          ...frame,
          fontSize: item.s,
          padding: `${item.s * 0.5}px ${item.s * 0.9}px`,
          borderRadius: 20,
          display: "inline-block",
          whiteSpace: "nowrap",
        }}
      />
    );
  }

  const isPill = item.shape === "pill";
  return (
    <div
      className={cls}
      style={{
        ...common,
        ...(item.solemn
          ? {
              background: "linear-gradient(160deg, #7a0f12cc, rgba(10,4,4,.75))",
              border: "1px solid #c9302ccc",
              boxShadow: "0 0 50px #c9302c99",
            }
          : frame),
        position: "absolute",
        top: 0,
        left: 0,
        fontFamily: isPill ? "var(--font-sans)" : "var(--font-display)",
        fontWeight: isPill ? 500 : 400,
        fontSize: item.s,
        lineHeight: 1.15,
        whiteSpace: item.wrap ? "normal" : "nowrap",
        width: item.wrap ? item.maxW ?? 260 : "max-content",
        color: item.solemn ? "#ffe9e5" : "#f2ead9",
        padding: isPill ? `${item.s * 0.42}px ${item.s * 0.85}px` : 0,
        borderRadius: isPill ? 28 : "50%",
        textAlign: "center",
        letterSpacing: isPill ? ".02em" : 0,
        display: "inline-block",
      }}
    >
      {item.t}
    </div>
  );
}

/**
 * KaTeX, loaded only when a formula actually mounts.
 *
 * The library is ~260 kB and this page is what a stranger downloads before
 * they have an account, so it must not be in the landing bundle. Stages mount
 * lazily as the reader approaches them, so the import fires mid-scroll and the
 * raw TeX — which is still legible as maths — stands in until it lands.
 */
function TexBit({ tex, className, style }: { tex: string; className?: string; style?: CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    import("katex")
      .then(({ default: katex }) => {
        if (!alive || !ref.current) return;
        katex.render(tex, ref.current, { throwOnError: false, displayMode: false });
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [tex]);

  return (
    <div ref={ref} className={className} style={style}>
      {failed ? tex : null}
    </div>
  );
}

function Glyph({ icon, accent, accent2 }: { icon: NonNullable<OrbitItem["icon"]>; accent: string; accent2: string }) {
  const ink = "#f2ead9";
  switch (icon) {
    case "mountain":
      return (
        <div className="relative" style={{ width: 0, height: 0, borderLeft: "26px solid transparent", borderRight: "26px solid transparent", borderBottom: `40px solid ${ink}` }}>
          <div className="absolute top-0" style={{ left: -8, width: 0, height: 0, borderLeft: "8px solid transparent", borderRight: "8px solid transparent", borderBottom: "12px solid #fff" }} />
        </div>
      );
    case "flask":
      return (
        <div className="relative" style={{ width: "52%", height: "64%" }}>
          <div className="absolute top-0" style={{ left: "38%", width: "24%", height: "22%", background: ink }} />
          <div className="absolute bottom-0 left-0 w-full" style={{ height: "60%", background: `${accent}55`, clipPath: "polygon(30% 0,70% 0,100% 100%,0 100%)", border: `1.5px solid ${ink}` }} />
        </div>
      );
    case "manuscript":
      return (
        <div className="relative" style={{ width: "60%", height: "48%", background: `${accent2}33`, border: `1.5px solid ${ink}`, borderRadius: "3px 10px 10px 3px" }}>
          {[28, 52, 76].map((top, i) => (
            <div key={top} className="absolute" style={{ top: `${top}%`, left: "12%", width: `${70 - i * 10}%`, height: 1.5, background: ink }} />
          ))}
        </div>
      );
    case "khachkar":
      return (
        <div className="relative" style={{ width: "50%", height: "60%" }}>
          <div className="absolute top-0" style={{ left: "38%", width: "24%", height: "100%", background: ink, borderRadius: 6 }} />
          <div className="absolute left-0 w-full" style={{ top: "30%", height: "22%", background: ink, borderRadius: 6 }} />
        </div>
      );
    case "quill":
      return <div style={{ width: "14%", height: "70%", background: ink, borderRadius: "0 100% 0 100% / 0 100% 0 100%", transform: "rotate(28deg)" }} />;
    case "book":
      return (
        <div className="relative" style={{ width: "60%", height: "48%" }}>
          <div className="absolute left-0 h-full" style={{ width: "48%", background: ink, borderRadius: "2px 0 0 2px" }} />
          <div className="absolute right-0 h-full" style={{ width: "48%", background: `${accent2}cc`, borderRadius: "0 2px 2px 0" }} />
        </div>
      );
  }
}
