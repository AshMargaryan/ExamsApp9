import katex from "katex";
import type { CSSProperties } from "react";
import type { IconKey, OrbitItem, SubjectUniverseData } from "../../lib/subjectsUniverse";
import "./subjectsUniverse.css";

const ICON_GLYPHS: Record<IconKey, (accent: string) => React.ReactNode> = {
  mountain: () => (
    <div style={{ position: "relative", width: 0, height: 0, borderLeft: "26px solid transparent", borderRight: "26px solid transparent", borderBottom: "40px solid #f2ead9" }}>
      <div style={{ position: "absolute", top: 0, left: -8, width: 0, height: 0, borderLeft: "8px solid transparent", borderRight: "8px solid transparent", borderBottom: "12px solid #fff" }} />
    </div>
  ),
  flask: (accent) => (
    <div style={{ position: "relative", width: "52%", height: "64%" }}>
      <div style={{ position: "absolute", top: 0, left: "38%", width: "24%", height: "22%", background: "#f2ead9" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: "60%", background: `${accent}55`, clipPath: "polygon(30% 0,70% 0,100% 100%,0 100%)", border: "1.5px solid #f2ead9" }} />
    </div>
  ),
  manuscript: (accent2) => (
    <div style={{ position: "relative", width: "60%", height: "48%", background: `${accent2}33`, border: "1.5px solid #f2ead9", borderRadius: "3px 10px 10px 3px" }}>
      <div style={{ position: "absolute", top: "28%", left: "12%", width: "70%", height: 1.5, background: "#f2ead9" }} />
      <div style={{ position: "absolute", top: "52%", left: "12%", width: "60%", height: 1.5, background: "#f2ead9" }} />
      <div style={{ position: "absolute", top: "76%", left: "12%", width: "50%", height: 1.5, background: "#f2ead9" }} />
    </div>
  ),
  khachkar: () => (
    <div style={{ position: "relative", width: "50%", height: "60%" }}>
      <div style={{ position: "absolute", top: 0, left: "38%", width: "24%", height: "100%", background: "#f2ead9", borderRadius: 6 }} />
      <div style={{ position: "absolute", top: "30%", left: 0, width: "100%", height: "22%", background: "#f2ead9", borderRadius: 6 }} />
    </div>
  ),
  quill: () => (
    <div style={{ width: "14%", height: "70%", background: "#f2ead9", borderRadius: "0 100% 0 100% / 0 100% 0 100%", transform: "rotate(28deg)" }} />
  ),
  book: (accent2) => (
    <div style={{ position: "relative", width: "60%", height: "48%" }}>
      <div style={{ position: "absolute", left: 0, width: "48%", height: "100%", background: "#f2ead9", borderRadius: "2px 0 0 2px" }} />
      <div style={{ position: "absolute", right: 0, width: "48%", height: "100%", background: `${accent2}cc`, borderRadius: "0 2px 2px 0" }} />
    </div>
  ),
};

function CentralVisual({ subject }: { subject: SubjectUniverseData }) {
  const { accent, accent2 } = subject;

  if (subject.centralType === "glyph") {
    return (
      <div className="su-central" style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 15, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <div style={{ fontFamily: "'Spectral',serif", fontWeight: 300, fontSize: 180, lineHeight: 1, color: "#f7f1e6", textShadow: `0 0 60px ${accent}, 0 0 160px ${accent}88` }}>
          {subject.glyphChar}
        </div>
        {subject.caption && (
          <div style={{ fontFamily: "'Noto Sans Armenian','Work Sans',sans-serif", fontSize: 14, letterSpacing: ".22em", textTransform: "uppercase", color: accent, opacity: 0.8 }}>
            {subject.caption}
          </div>
        )}
      </div>
    );
  }

  if (subject.centralType === "medallion") {
    const shape = subject.medallionStyle === "cameo" ? "50% / 58%" : "50%";
    return (
      <div className="su-central" style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 15, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <div style={{ width: 210, height: 210, borderRadius: shape, position: "relative", overflow: "hidden", boxShadow: `0 0 90px ${accent}70, inset 0 0 46px ${accent}30`, border: `2px solid ${accent}cc`, background: "#0a0a12" }}>
          {subject.portraitSrc && (
            <img src={subject.portraitSrc} alt={subject.personLabel} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          )}
          <div style={{ position: "absolute", inset: 0, boxShadow: "inset 0 0 40px rgba(0,0,0,.5)" }} />
          <div style={{ position: "absolute", inset: -6, borderRadius: shape, border: `1px solid ${accent2}80`, pointerEvents: "none" }} />
          {subject.medallionStyle === "coin" && (
            <div
              style={{
                position: "absolute", inset: -14, borderRadius: "50%",
                background: `repeating-conic-gradient(${accent2} 0deg 3deg, transparent 3deg 8deg)`,
                WebkitMask: "radial-gradient(circle,transparent 66%,#000 70%,#000 78%,transparent 82%)",
                mask: "radial-gradient(circle,transparent 66%,#000 70%,#000 78%,transparent 82%)",
                pointerEvents: "none",
              }}
            />
          )}
        </div>
        <div style={{ fontFamily: "'Spectral',serif", fontSize: 18, letterSpacing: ".05em", color: "#ece3d3", opacity: 0.85 }}>{subject.personLabel}</div>
      </div>
    );
  }

  if (subject.centralType === "photo") {
    return (
      <div className="su-central" style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 15, width: 230, height: 230, borderRadius: "50%", overflow: "hidden", boxShadow: `0 0 100px ${accent}66, inset 0 0 40px rgba(0,0,0,.4)`, border: `2px solid ${accent}cc` }}>
        {subject.portraitSrc && <img src={subject.portraitSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
      </div>
    );
  }

  if (subject.centralType === "blackhole") {
    return (
      <div className="su-central" style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 15, width: 320, height: 320, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "absolute", inset: -30, borderRadius: "50%", background: `radial-gradient(circle,${accent2}55,transparent 60%)`, filter: "blur(24px)", opacity: 0.6 }} />
        <div style={{ position: "absolute", inset: 26, borderRadius: "50%", transform: "rotate(-14deg) scaleY(.36)", background: `conic-gradient(from 0deg,${accent2},${accent} 35%,transparent 55%,${accent},${accent2})`, filter: "blur(5px)", animation: "su-slow-spin 20s linear infinite", boxShadow: `0 0 100px ${accent}aa` }} />
        <div style={{ position: "absolute", inset: 74, borderRadius: "50%", transform: "rotate(-14deg) scaleY(.36)", border: `2px solid ${accent2}cc`, boxShadow: `0 0 24px ${accent2}aa` }} />
        <div style={{ width: 100, height: 100, borderRadius: "50%", background: "#000", boxShadow: "0 0 0 2px rgba(255,255,255,.08), inset 0 0 40px #000", zIndex: 2 }} />
      </div>
    );
  }

  // atom
  const rings = [
    { rotate: -18, size: 250, dur: "12s", dir: "normal", start: "0deg", dotSize: 10, color: accent, tx: 125 },
    { rotate: 38, size: 215, dur: "17s", dir: "reverse", start: "120deg", dotSize: 9, color: accent2, tx: 108 },
    { rotate: 92, size: 185, dur: "9s", dir: "normal", start: "250deg", dotSize: 8, color: accent, tx: 92 },
  ] as const;
  return (
    <div className="su-central" style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 15, width: 250, height: 250, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 22, height: 22, borderRadius: "50%", background: `radial-gradient(circle,${accent2},${accent})`, boxShadow: `0 0 26px ${accent}`, zIndex: 3 }} />
      {rings.map((ring, i) => (
        <div key={i} style={{ position: "absolute", inset: 0, transform: `rotate(${ring.rotate}deg) scaleY(.42)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: ring.size, height: ring.size, borderRadius: "50%", border: `1px solid ${ring.color}66` }} />
          <div style={{ position: "absolute", width: 0, height: 0, animation: `su-orbit-spin ${ring.dur} linear infinite ${ring.dir}`, ["--start" as string]: ring.start }}>
            <div style={{ position: "absolute", width: ring.dotSize, height: ring.dotSize, borderRadius: "50%", background: ring.color, boxShadow: `0 0 12px ${ring.color}`, transform: `translateX(${ring.tx}px)` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function orbitContentStyle(item: OrbitItem, accent: string): CSSProperties {
  const scale = 0.55 + item.d * 0.6;
  const opacity = 0.3 + item.d * 0.65;
  const blur = (1 - item.d) * 2.2;
  const filter = blur > 0.15 ? `blur(${blur.toFixed(1)}px)` : undefined;
  const isPill = item.shape === "pill";
  const isPortrait = item.shape === "portrait";
  const isIconOrClock = item.shape === "icon" || item.shape === "clock";
  const isLatex = item.shape === "latex";

  if (isPortrait) {
    const rect = item.imgShape === "rect";
    const w = rect ? item.s * 2.2 : item.s * 2.6;
    const h = rect ? item.s * 2.9 : item.s * 2.6;
    return {
      width: w, height: h, borderRadius: rect ? 14 : "50%", overflow: "hidden",
      border: `2px solid ${accent}cc`,
      boxShadow: `${item.big ? "0 0 40px " : "0 0 18px "}${accent}70`,
      opacity, filter, transform: `translate(-50%,-50%) scale(${scale})`, position: "relative",
    };
  }
  if (isIconOrClock) {
    const sz = item.s * 2.1;
    return {
      width: sz, height: sz, borderRadius: "50%",
      display: "flex", alignItems: "center", justifyContent: "center", position: "relative",
      background: `linear-gradient(160deg, ${accent}26, rgba(10,10,16,.55))`,
      border: `1px solid ${accent}${item.big ? "cc" : "55"}`,
      boxShadow: item.big ? `0 0 40px ${accent}80` : `0 0 18px ${accent}30`,
      opacity, filter, transform: `translate(-50%,-50%) scale(${scale})`,
    };
  }
  if (isLatex) {
    return {
      fontSize: item.s,
      padding: `${item.s * 0.5}px ${item.s * 0.9}px`,
      borderRadius: 20,
      background: `linear-gradient(160deg, ${accent}26, rgba(10,10,16,.55))`,
      border: `1px solid ${accent}${item.big ? "cc" : "55"}`,
      boxShadow: item.big ? `0 0 40px ${accent}80` : `0 0 18px ${accent}30`,
      opacity, filter, transform: `translate(-50%,-50%) scale(${scale})`,
      display: "inline-block", whiteSpace: "nowrap",
    };
  }
  // pill or glyph text
  const pad = isPill ? `${item.s * 0.42}px ${item.s * 0.85}px` : "0px";
  return {
    position: "absolute", top: 0, left: 0,
    fontFamily: isPill ? "'Work Sans','Noto Sans Armenian','Noto Sans',sans-serif" : "'Spectral','Noto Serif Armenian','Noto Serif',serif",
    fontWeight: isPill ? 500 : 400,
    fontSize: item.s,
    lineHeight: 1.15,
    whiteSpace: item.wrap ? "normal" : "nowrap",
    width: item.wrap ? (item.maxW || 260) : "max-content",
    color: item.bloody ? "#ffe9e5" : "#f2ead9",
    padding: pad,
    borderRadius: isPill ? 28 : "50%",
    background: item.bloody ? "linear-gradient(160deg, #7a0f12cc, rgba(10,4,4,.75))" : `linear-gradient(160deg, ${accent}26, rgba(10,10,16,.55))`,
    border: `1px solid ${item.bloody ? "#c9302ccc" : `${accent}${item.big ? "cc" : "55"}`}`,
    boxShadow: item.bloody ? "0 0 50px #c9302c99" : item.big ? `0 0 40px ${accent}80` : `0 0 18px ${accent}30`,
    opacity, filter, transform: `translate(-50%,-50%) scale(${scale})`,
    textAlign: "center", letterSpacing: isPill ? ".02em" : "0", display: "inline-block",
  };
}

function OrbitItemContent({ item, accent, accent2 }: { item: OrbitItem; accent: string; accent2: string }) {
  const style = orbitContentStyle(item, accent);
  const cls = `su-item${item.big ? " su-item-big" : ""}`;

  if (item.shape === "portrait") {
    return (
      <div className={cls} style={style}>
        {item.src && <img src={item.src} alt={item.t} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
      </div>
    );
  }
  if (item.shape === "clock") {
    return (
      <div className={cls} style={style}>
        <div style={{ position: "absolute", top: "50%", left: "50%", width: 3, height: "26%", background: "#f2ead9", transformOrigin: "bottom center", animation: "su-hour-hand 43200s linear infinite" }} />
        <div style={{ position: "absolute", top: "50%", left: "50%", width: 2, height: "36%", background: "#f2ead9cc", transformOrigin: "bottom center", animation: "su-minute-hand 3600s linear infinite" }} />
        <div style={{ position: "absolute", top: "50%", left: "50%", width: 6, height: 6, borderRadius: "50%", background: accent2, transform: "translate(-50%,-50%)" }} />
      </div>
    );
  }
  if (item.shape === "icon" && item.icon) {
    return (
      <div className={cls} style={style}>
        {ICON_GLYPHS[item.icon](item.icon === "flask" || item.icon === "mountain" || item.icon === "khachkar" || item.icon === "quill" ? accent : accent2)}
      </div>
    );
  }
  if (item.shape === "latex" && item.tex) {
    const html = (() => {
      try {
        return katex.renderToString(item.tex!, { throwOnError: false, displayMode: false });
      } catch {
        return item.tex;
      }
    })();
    return <div className={cls} style={style} dangerouslySetInnerHTML={{ __html: html }} />;
  }
  return (
    <div className={cls} style={style}>
      {item.t}
    </div>
  );
}

function OrbitItemView({ item, accent, accent2 }: { item: OrbitItem; accent: string; accent2: string }) {
  const dirNormal = item.dir < 0 ? "reverse" : "normal";
  const dirCounter = item.dir < 0 ? "normal" : "reverse";
  const z = item.behind ? 4 : Math.round(6 + item.d * 24);

  return (
    <div style={{ position: "absolute", top: "50%", left: "50%", width: 0, height: 0, ["--start" as string]: `${item.a}deg`, animation: `su-orbit-spin ${item.sp}s linear infinite ${dirNormal}`, zIndex: z }}>
      <div style={{ position: "absolute", top: 0, left: 0, transform: `translateX(${item.r}px)` }}>
        <div style={{ position: "absolute", top: 0, left: 0, width: 0, height: 0, ["--start" as string]: `${-item.a}deg`, animation: `su-orbit-spin ${item.sp}s linear infinite ${dirCounter}` }}>
          <OrbitItemContent item={item} accent={accent} accent2={accent2} />
        </div>
      </div>
    </div>
  );
}

export function OrbitField({
  subject,
  align,
  onSelect,
}: {
  subject: SubjectUniverseData;
  align: "left" | "right";
  onSelect: () => void;
}) {
  const { accent, accent2, fieldStrength, seed } = subject;
  const uniqueRadii = [...new Set(subject.items.map((i) => i.r))].sort((a, b) => a - b);
  const warpScale = Math.round(fieldStrength * 30);

  return (
    <section
      className="su-section"
      onClick={onSelect}
      style={{
        position: "relative", minHeight: 640, display: "flex", alignItems: "center",
        justifyContent: align === "right" ? "flex-end" : "flex-start",
        overflow: "hidden", padding: "70px 6%", cursor: "pointer",
        background: `radial-gradient(ellipse at 50% 50%, ${accent}14, #05050a 62%)`,
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 120, background: "linear-gradient(180deg, #05050a, transparent)", pointerEvents: "none", zIndex: 1 }} />

      <div className="su-stage" style={{ position: "relative", width: 640, height: 680, flexShrink: 0 }}>
        <div className="su-field" style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.8 }}>
          {uniqueRadii.map((r, idx) => (
            <div
              key={r}
              style={{
                position: "absolute", top: "50%", left: "50%", width: r * 2, height: r * 2,
                marginLeft: -r, marginTop: -r, borderRadius: "50%", border: `1px solid ${accent}`,
                opacity: Math.min(0.55, fieldStrength * (0.45 + idx * 0.16)),
              }}
            />
          ))}
          <svg viewBox="0 0 640 680" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: fieldStrength }}>
            <defs>
              <filter id={`su-warp-${subject.id}`} x="-20%" y="-20%" width="140%" height="140%">
                <feTurbulence type="fractalNoise" baseFrequency="0.01" numOctaves={2} seed={seed} result="n" />
                <feDisplacementMap in="SourceGraphic" in2="n" scale={warpScale} />
              </filter>
              <pattern id={`su-grid-${subject.id}`} width={42} height={42} patternUnits="userSpaceOnUse">
                <path d="M42 0 L0 0 0 42" fill="none" stroke={accent} strokeWidth={1} opacity={0.55} />
              </pattern>
              <radialGradient id={`su-fade-${subject.id}`} cx="50%" cy="46%" r="55%">
                <stop offset="0%" stopColor="#fff" stopOpacity={0} />
                <stop offset="35%" stopColor="#fff" stopOpacity={1} />
                <stop offset="70%" stopColor="#fff" stopOpacity={1} />
                <stop offset="100%" stopColor="#fff" stopOpacity={0} />
              </radialGradient>
              <mask id={`su-mask-${subject.id}`}>
                <rect width={640} height={680} fill={`url(#su-fade-${subject.id})`} />
              </mask>
            </defs>
            <rect width={640} height={680} fill={`url(#su-grid-${subject.id})`} filter={`url(#su-warp-${subject.id})`} mask={`url(#su-mask-${subject.id})`} />
          </svg>
        </div>

        <CentralVisual subject={subject} />

        {subject.items.map((item, i) => (
          <OrbitItemView key={i} item={item} accent={accent} accent2={accent2} />
        ))}

        <div style={{ position: "absolute", left: 0, bottom: 0, zIndex: 40, display: "flex", flexDirection: "column", gap: 8, maxWidth: 520, padding: "22px 28px" }}>
          <div style={{ fontFamily: "'Work Sans',sans-serif", fontSize: 13, letterSpacing: ".3em", textTransform: "uppercase", color: accent }}>{subject.index}</div>
          <div style={{ fontFamily: "'Spectral','Noto Serif Armenian','Noto Serif',serif", fontWeight: 500, fontSize: "clamp(34px,4.5vw,58px)", color: "#f5efe4", lineHeight: 1.03 }}>
            {subject.nameNative}
          </div>
        </div>
      </div>
    </section>
  );
}
