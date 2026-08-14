import { MarkdownMessage } from "../assistant/MarkdownMessage";
import { hexRgb } from "./hierarchyLayout";

// The "Ներածություն" node's reveal — same full-screen blurred-glass
// treatment the design uses for its reading panel, repurposed to show a
// Domain/Topic's existing intro_text instead of navigating anywhere. Never
// changes the URL; closing it just returns to the map.
export function IntroOverlay({
  pathLabel,
  title,
  introText,
  accent,
  onClose,
}: {
  pathLabel: string;
  title: string;
  introText: string;
  accent: string;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 60,
        background: "rgba(6,7,11,.82)",
        backdropFilter: "blur(26px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 40,
      }}
    >
      <div style={{ width: "100%", maxWidth: 760, display: "flex", flexDirection: "column", gap: 28 }}>
        {pathLabel && (
          <div
            style={{
              fontFamily: "'JetBrains Mono', system-ui, monospace",
              fontSize: 10,
              letterSpacing: ".26em",
              textTransform: "uppercase",
              color: "rgba(232,236,244,.36)",
            }}
          >
            {pathLabel}
          </div>
        )}
        <div
          style={{
            fontFamily: "'Newsreader', system-ui, serif",
            fontWeight: 300,
            fontSize: 44,
            lineHeight: 1.1,
            letterSpacing: "-.01em",
            color: "#f2f5fa",
          }}
        >
          {title}
        </div>
        <div
          style={{
            maxHeight: "50vh",
            overflowY: "auto",
            fontFamily: "system-ui, sans-serif",
            color: "rgba(232,236,244,.85)",
          }}
        >
          <MarkdownMessage
            className="text-lg leading-relaxed"
            content={introText || "Ներածական տեքստը կավելացվի ավելի ուշ։"}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            onClick={onClose}
            role="button"
            style={{
              padding: "13px 28px",
              borderRadius: 999,
              border: `1px solid ${hexRgb(accent, 0.5)}`,
              background: hexRgb(accent, 0.22),
              fontSize: 13,
              letterSpacing: ".08em",
              textTransform: "uppercase",
              fontFamily: "'JetBrains Mono', system-ui, monospace",
              color: "#f4f7fc",
              cursor: "pointer",
              transition: "filter 300ms ease",
            }}
          >
            Վերադառնալ քարտեզ
          </div>
        </div>
      </div>
    </div>
  );
}
