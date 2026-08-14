import { hexRgb } from "./hierarchyLayout";
import type { NodeVisual } from "./hierarchyLayout";

function lengthScale(charCount: number): number {
  if (charCount <= 10) return 1;
  if (charCount <= 16) return 0.86;
  if (charCount <= 24) return 0.74;
  return 0.64;
}

// One node in the spatial hierarchy map — domain, topic, subtopic, or the
// small "Ներածություն" intro satellite. Purely presentational: all position/
// size/opacity/timing math already happened in hierarchyLayout.computeLayout;
// this just renders one node at the coordinates it's given and lets CSS
// transitions animate between successive layouts (see PracticeSubjectPage).
export function HierarchyNode({ node }: { node: NodeVisual }) {
  const glow = node.active ? 0.55 : 0.3;
  const fill =
    `radial-gradient(125% 120% at 30% 20%, ${hexRgb(node.accent, node.active ? 0.42 : 0.26)}, ` +
    `${hexRgb(node.accent, 0.1)} 46%, rgba(10,12,18,.92) 100%)`;
  const border = `1px solid ${hexRgb(node.accent, node.active ? 0.42 : 0.24)}`;
  const shadow =
    `inset 0 1px 1px rgba(255,255,255,.16), inset 0 -26px 46px rgba(4,5,9,.6), ` +
    `0 30px 70px -26px ${hexRgb(node.accent, glow)}, 0 0 0 6px ${hexRgb(node.accent, 0.03)}`;

  const dash = node.pct !== null ? `${node.pct} 100` : "0 100";
  const ringVisible = node.pct !== null;
  const glyphSize = Math.round(node.size * (node.kind === "intro" ? 0.26 : 0.2));
  const pctSize = Math.round(Math.max(9, node.size * 0.072));

  // Armenian domain/topic/subtopic names run considerably longer than the
  // design's English placeholders (e.g. "Փոխակերպումներ և կապակցում" vs
  // "Algebra") — a fixed font size let long names spill past the node's
  // circular border. Scale down for longer names, then hard-clip to 2
  // lines with an ellipsis so anything still too long truncates cleanly
  // instead of overflowing the circle.
  const baseNameSize = Math.max(node.kind === "intro" ? 11 : 13, node.size * 0.115);
  const nameSize = Math.round(baseNameSize * lengthScale(node.name.length));

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: node.size,
        height: node.size,
        transform: `translate(${Math.round(node.x)}px, ${Math.round(node.y)}px) translate(-50%, -50%) scale(${node.scale})`,
        opacity: node.opacity,
        zIndex: node.z,
        pointerEvents: node.interactive ? "auto" : "none",
        cursor: "pointer",
        transition: `transform 1100ms cubic-bezier(.16,1,.3,1) ${node.delayMs}ms, opacity 800ms ease ${node.delayMs}ms`,
      }}
      onClick={node.onSelect}
      role="button"
      aria-label={node.name}
    >
      <svg
        viewBox="0 0 100 100"
        style={{
          position: "absolute",
          left: "-9%",
          top: "-9%",
          width: "118%",
          height: "118%",
          overflow: "visible",
          opacity: ringVisible ? 1 : 0,
          transition: "opacity 600ms ease",
        }}
      >
        <circle cx="50" cy="50" r="48" fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="0.7" />
        <circle
          cx="50"
          cy="50"
          r="48"
          fill="none"
          stroke={hexRgb(node.accent, 0.9)}
          strokeWidth="1.6"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={dash}
          transform="rotate(-90 50 50)"
          style={{ transition: "stroke-dasharray 1200ms cubic-bezier(.16,1,.3,1)" }}
        />
      </svg>
      <div
        className="hierarchy-node-face"
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "50%",
          background: fill,
          border,
          boxShadow: shadow,
          backdropFilter: "blur(10px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          overflow: "hidden",
          transition: "box-shadow 500ms ease, filter 400ms ease",
        }}
      >
        <div
          style={{
            fontFamily: "'JetBrains Mono', system-ui, monospace",
            fontSize: glyphSize,
            lineHeight: 1,
            color: hexRgb(node.accent, 0.95),
            textShadow: `0 0 22px ${hexRgb(node.accent, 0.9)}`,
          }}
        >
          {node.glyph}
        </div>
        <div
          style={{
            fontFamily: "'Newsreader', system-ui, serif",
            fontWeight: 400,
            fontSize: nameSize,
            lineHeight: 1.15,
            letterSpacing: ".005em",
            textAlign: "center",
            maxWidth: "70%",
            color: "rgba(255,255,255,.93)",
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: 2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            wordBreak: "break-word",
          }}
        >
          {node.name}
        </div>
        {ringVisible && (
          <div
            style={{
              fontFamily: "'JetBrains Mono', system-ui, monospace",
              fontSize: pctSize,
              letterSpacing: ".12em",
              color: hexRgb(node.accent, 0.95),
            }}
          >
            {node.pct}%
          </div>
        )}
      </div>
    </div>
  );
}
