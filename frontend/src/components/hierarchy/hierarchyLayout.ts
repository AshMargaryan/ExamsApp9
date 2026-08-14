// Pure geometry/visual-state computation for the spatial knowledge-hierarchy
// map (see PracticeSubjectPage). Ported from the uploaded design's own
// layout math (radial placement around a shared center, a domain/topic
// "settling" toward the focal point as you go deeper) — kept framework-free
// so it's easy to verify against the source design.
import type { DomainNode, SubjectNode, SubtopicNode, TopicNode } from "../../api/practice";

export type HierarchyLevel = "domain" | "topic" | "subtopic";

// Cycled by index so this works for any number of domains/topics a subject
// happens to have — the design hardcodes one accent per (real, fixed)
// subject; ours are data-driven, so we cycle a palette in the same spirit
// instead of guessing subject-specific colors.
const ACCENTS = ["#C4586E", "#7A87FF", "#2FB59D", "#83A75C", "#37A6C9", "#D9A441", "#B15FCB"];
const NODE_GLYPHS = ["∑", "⊕", "◺", "⚡", "⌘", "◑", "⬡", "◎"];
const SUB_GLYPHS = ["◇", "△", "○", "▽", "◻", "⬡"];
export const INTRO_GLYPH = "ℹ"; // ℹ

export function accentFor(index: number): string {
  return ACCENTS[index % ACCENTS.length];
}
function glyphFor(index: number): string {
  return NODE_GLYPHS[index % NODE_GLYPHS.length];
}
function subGlyphFor(index: number): string {
  return SUB_GLYPHS[index % SUB_GLYPHS.length];
}

export function hexRgb(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// Subtopics have no single "progress" field (practice is tracked per
// tier) — average whatever tiers have been attempted, same data the
// existing sidebar already showed per-tier, just condensed into one ring
// value instead of inventing a new metric.
export function subtopicMasteryPct(subtopic: SubtopicNode): number {
  const scores = Object.values(subtopic.tier_scores).filter((s): s is number => s !== null);
  if (scores.length === 0) return 0;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

export interface NodeVisual {
  key: string;
  kind: "domain" | "topic" | "subtopic" | "intro";
  name: string;
  glyph: string;
  accent: string;
  x: number;
  y: number;
  size: number;
  scale: number;
  opacity: number;
  z: number;
  delayMs: number;
  active: boolean;
  interactive: boolean;
  pct: number | null;
  onSelect: () => void;
}

export interface LinkVisual {
  key: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  opacity: number;
  offset: number;
  delayMs: number;
}

interface LayoutInput {
  domains: DomainNode[];
  domainIndex: number | null; // index of selected domain within `domains`, or null at root
  topicIndex: number | null; // index of selected topic within the selected domain's topics, or null
  width: number;
  height: number;
  draw: number; // 0 -> just reset (nodes contracted/invisible), 1 -> settled — see `go()` in the page
  onSelectDomain: (domainId: number | null) => void;
  onSelectTopic: (topicId: number | null) => void;
  onSelectSubtopic: (topic: TopicNode, subtopic: SubtopicNode, domain: DomainNode) => void;
}

export interface LayoutResult {
  nodes: NodeVisual[];
  links: LinkVisual[];
  coreOpacity: number;
  ambientAccent: string;
  levelLabel: string;
}

export function computeLayout(input: LayoutInput): LayoutResult {
  const { domains, domainIndex, topicIndex, width: w, height: h, draw } = input;
  const cx = w / 2;
  const cy = h / 2;
  const small = Math.min(w, h) < 720;
  const level: HierarchyLevel = topicIndex !== null ? "subtopic" : domainIndex !== null ? "topic" : "domain";
  const grow = 0.74 + 0.26 * draw;

  const nodes: NodeVisual[] = [];
  const links: LinkVisual[] = [];

  const dSize = small ? 118 : 158;
  const dRx = Math.min(w * 0.33, 470);
  const dRy = Math.min(h * 0.34, 330, Math.max(120, h / 2 - dSize * 0.75 - 48));

  const selectedDomain = domainIndex !== null ? domains[domainIndex] : null;
  const selectedTopic = selectedDomain && topicIndex !== null ? selectedDomain.topics[topicIndex] : null;

  domains.forEach((d, i) => {
    const angle = ((-90 + (i * 360) / domains.length) * Math.PI) / 180;
    const accent = accentFor(i);
    let x: number, y: number, size = dSize, scale = 1, opacity = 1, active = false, ringOn = true;
    const delayMs = i * 40;

    if (level === "domain") {
      x = cx + Math.cos(angle) * dRx;
      y = cy + Math.sin(angle) * dRy;
      scale = grow;
      opacity = draw;
    } else if (i === domainIndex) {
      active = true;
      if (level === "topic") {
        x = cx;
        y = cy;
        scale = 1.18;
      } else {
        x = cx;
        y = cy - dRy * 0.92;
        scale = 0.5;
        ringOn = false;
      }
    } else {
      x = cx + Math.cos(angle) * dRx * 1.65;
      y = cy + Math.sin(angle) * dRy * 1.6;
      scale = 0.6;
      opacity = level === "topic" ? 0.13 : 0;
      ringOn = false;
    }

    nodes.push({
      key: `domain-${d.id}`,
      kind: "domain",
      name: d.name,
      glyph: glyphFor(i),
      accent,
      x,
      y,
      size,
      scale,
      opacity,
      z: active ? 30 : 12,
      delayMs,
      active,
      interactive: opacity >= 0.25,
      pct: ringOn ? Math.round(d.progress.percent) : null,
      onSelect:
        active && level === "topic"
          ? () => input.onSelectDomain(null)
          : () => input.onSelectDomain(d.id),
    });

    if (level === "domain") {
      links.push(
        radialLink(`root-domain-${d.id}`, cx, cy, x, y, "#93a6cc", 44, dSize * 0.6, 80 + i * 90, draw)
      );
    }
  });

  if (selectedDomain) {
    const tSize = small ? 100 : 132;
    const tRx = Math.min(w * 0.3, 415);
    const tRy = Math.min(h * 0.31, 300, Math.max(110, h / 2 - tSize * 0.78 - 40));
    const domainAccent = accentFor(domainIndex ?? 0);

    selectedDomain.topics.forEach((t, i) => {
      const angle = ((-90 + (i * 360) / selectedDomain.topics.length) * Math.PI) / 180;
      let x: number, y: number, scale = 1, opacity = 1, active = false;
      const delayMs = 140 + i * 70;

      if (level === "topic") {
        x = cx + Math.cos(angle) * tRx;
        y = cy + Math.sin(angle) * tRy;
        scale = grow;
        opacity = draw;
        links.push(radialLink(`domain-topic-${t.id}`, cx, cy, x, y, domainAccent, dSize * 0.62, tSize * 0.6, 120 + i * 80, draw));
      } else if (topicIndex === i) {
        active = true;
        x = cx;
        y = cy;
        scale = 1.2;
        links.push(
          radialLink(`topic-center-${t.id}`, cx, cy - tRy * 0.92, cx, cy, domainAccent, dSize * 0.3, tSize * 0.72, 60, draw)
        );
      } else {
        x = cx + Math.cos(angle) * tRx * 1.7;
        y = cy + Math.sin(angle) * tRy * 1.7;
        scale = 0.62;
        opacity = 0;
      }

      nodes.push({
        key: `topic-${t.id}`,
        kind: "topic",
        name: t.name,
        glyph: glyphFor(i),
        accent: domainAccent,
        x,
        y,
        size: tSize,
        scale,
        opacity,
        z: active ? 30 : 20,
        delayMs,
        active,
        interactive: opacity >= 0.25,
        pct: level === "topic" ? Math.round(t.progress.percent) : null,
        onSelect: active ? () => input.onSelectTopic(null) : () => input.onSelectTopic(t.id),
      });
    });
  }

  if (selectedDomain && selectedTopic) {
    const sSize = small ? 96 : 124;
    const sRx = Math.min(w * 0.34, 460);
    const sRy = Math.min(h * 0.3, 290, Math.max(105, h / 2 - sSize * 0.8 - 40));
    const span = 292;
    const start = 90 - span / 2;
    const topicAccent = accentFor(domainIndex ?? 0);

    selectedTopic.subtopics.forEach((s, i) => {
      const count = selectedTopic.subtopics.length;
      const angle =
        ((start + (count === 1 ? span / 2 : (i * span) / (count - 1))) * Math.PI) / 180;
      const x = cx + Math.cos(angle) * sRx;
      const y = cy + Math.sin(angle) * sRy * 1.02;

      nodes.push({
        key: `subtopic-${s.id}`,
        kind: "subtopic",
        name: s.name,
        glyph: subGlyphFor(i),
        accent: topicAccent,
        x,
        y,
        size: sSize,
        scale: grow,
        opacity: draw,
        z: 20,
        delayMs: 180 + i * 75,
        active: false,
        interactive: draw >= 0.25,
        pct: subtopicMasteryPct(s),
        onSelect: () => input.onSelectSubtopic(selectedTopic, s, selectedDomain),
      });
      links.push(radialLink(`topic-subtopic-${s.id}`, cx, cy, x, y, topicAccent, sSize * 0.78, sSize * 0.6, 150 + i * 85, draw));
    });
  }

  const accent = selectedTopic ? accentFor(domainIndex ?? 0) : selectedDomain ? accentFor(domainIndex ?? 0) : "#7C8CB8";
  const levelLabel =
    level === "domain"
      ? `${domains.length} ոլորտ`
      : level === "topic"
        ? `${selectedDomain!.topics.length} թեմա`
        : `${selectedTopic!.subtopics.length} ենթաթեմա`;

  return {
    nodes,
    links,
    coreOpacity: level === "domain" ? draw * 0.9 : 0,
    ambientAccent: accent,
    levelLabel,
  };
}

function radialLink(
  key: string,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  accentHex: string,
  r1: number,
  r2: number,
  delayMs: number,
  draw: number
): LinkVisual {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const len = Math.max(1, Math.hypot(dx, dy));
  const ux = dx / len;
  const uy = dy / len;
  return {
    key,
    x1: Math.round(fromX + ux * r1),
    y1: Math.round(fromY + uy * r1),
    x2: Math.round(toX - ux * r2),
    y2: Math.round(toY - uy * r2),
    color: hexRgb(accentHex, 1),
    opacity: draw * 0.5,
    offset: 100 - 100 * draw,
    delayMs,
  };
}

export function findSubtopicContext(
  subjects: SubjectNode[],
  subtopicId: number
): { subject: SubjectNode; domain: DomainNode; topic: TopicNode; subtopic: SubtopicNode } | null {
  for (const subject of subjects) {
    for (const domain of subject.domains) {
      for (const topic of domain.topics) {
        const subtopic = topic.subtopics.find((s) => s.id === subtopicId);
        if (subtopic) return { subject, domain, topic, subtopic };
      }
    }
  }
  return null;
}
