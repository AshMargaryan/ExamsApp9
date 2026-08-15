import type { LinkVisual } from "./hierarchyLayout";

// Animated SVG lines connecting the focal node to whatever's currently
// orbiting it. Each line "draws itself in" via a dash-offset transition
// (100 -> 0) rather than just appearing, matching the design's connection
// animation.
export function ConnectionLines({ links }: { links: LinkVisual[] }) {
  return (
    <svg
      width="100%"
      height="100%"
      style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "visible" }}
    >
      {links.map((l) => (
        <line
          key={l.key}
          x1={l.x1}
          y1={l.y1}
          x2={l.x2}
          y2={l.y2}
          stroke={l.color}
          strokeWidth={1}
          strokeOpacity={l.opacity}
          pathLength={100}
          strokeDasharray={100}
          strokeDashoffset={l.offset}
          style={{
            transition: `stroke-dashoffset 900ms cubic-bezier(.16,1,.3,1) ${l.delayMs}ms, stroke-opacity 700ms ease ${l.delayMs}ms`,
          }}
        />
      ))}
    </svg>
  );
}
