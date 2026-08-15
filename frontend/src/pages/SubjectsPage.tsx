import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MessageModal } from "../components/MessageModal";
import { OrbitField } from "../components/subjects-universe/OrbitField";
import { SUBJECTS_UNIVERSE } from "../lib/subjectsUniverse";

function genStarsShadow(): string {
  let seed = 42;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  const shadows: string[] = [];
  for (let i = 0; i < 260; i++) {
    const x = (rand() * 100).toFixed(2);
    const y = (rand() * 100).toFixed(2);
    const op = (0.25 + rand() * 0.75).toFixed(2);
    shadows.push(`${x}vw ${y}vh 0 rgba(255,255,255,${op})`);
  }
  return shadows.join(",");
}

export function SubjectsPage() {
  const navigate = useNavigate();
  const starsShadow = useMemo(genStarsShadow, []);
  const [comingSoonName, setComingSoonName] = useState<string | null>(null);

  return (
    <div style={{ position: "relative", background: "#05050a" }}>
      <div style={{ position: "fixed", inset: 0, zIndex: 0, background: "#05050a", pointerEvents: "none" }}>
        <div
          style={{
            position: "absolute", inset: 0, width: 2, height: 2, borderRadius: "50%",
            background: "transparent", boxShadow: starsShadow, animation: "su-twinkle 6s ease-in-out infinite",
          }}
        />
      </div>

      <section
        style={{
          position: "relative", zIndex: 1, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", textAlign: "center", gap: 20,
          padding: "60px 40px 60px",
        }}
      >
        <Link to="/" style={{ position: "absolute", left: 24, top: 24, fontSize: 13, color: "#cfc6b8" }}>
          ← Գլխավոր
        </Link>
        <h1 style={{ fontFamily: "'Spectral','Noto Serif Armenian',serif", fontWeight: 400, fontSize: "clamp(56px,9vw,132px)", lineHeight: 1, color: "#f5efe4", margin: 0 }}>
          Առարկաներ
        </h1>
        <p style={{ fontFamily: "'Work Sans','Noto Sans Armenian',sans-serif", fontSize: 20, color: "#cfc6b8", opacity: 0.8, maxWidth: 560, margin: 0 }}>
          Բացահայտեք ձեր գիտելիքի տիեզերքը։
        </p>
        <div style={{ marginTop: 14, width: 1, height: 44, background: "linear-gradient(#d98a6f,transparent)" }} />
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 90, background: "linear-gradient(180deg, transparent, #05050a)", pointerEvents: "none" }} />
      </section>

      <div style={{ position: "relative", zIndex: 1 }}>
        {SUBJECTS_UNIVERSE.map((subject, i) => (
          <OrbitField
            key={subject.id}
            subject={subject}
            align={i % 2 === 0 ? "left" : "right"}
            onSelect={() => {
              if (subject.linkKey) navigate(`/subjects/${subject.linkKey}`);
              else setComingSoonName(subject.nameNative);
            }}
          />
        ))}
      </div>

      {comingSoonName && (
        <MessageModal
          message={`«${comingSoonName}» շուտով հասանելի կլինի։`}
          onClose={() => setComingSoonName(null)}
        />
      )}
    </div>
  );
}
