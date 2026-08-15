import { useEffect, useState } from "react";
import { useNavigate, useLocation, useParams, useSearchParams } from "react-router-dom";
import { getHierarchy, type SubjectNode } from "../api/practice";
import { AmbientBackground } from "../components/hierarchy/AmbientBackground";
import { ConnectionLines } from "../components/hierarchy/ConnectionLines";
import { HierarchyNode } from "../components/hierarchy/HierarchyNode";
import { IntroOverlay } from "../components/hierarchy/IntroOverlay";
import "../components/hierarchy/hierarchy.css";
import {
  accentFor,
  computeLayout,
  INTRO_GLYPH,
  type NodeVisual,
} from "../components/hierarchy/hierarchyLayout";
import { LinkButton } from "../components/ui/LinkButton";
import { useStudyActivityTracker } from "../hooks/useStudyActivityTracker";

// Re-settles the entrance animation on every level change: briefly drop to
// the "just about to arrive" transform (draw=0), then a tick later ease
// back to draw=1 — same trick the design uses so newly-revealed nodes
// always animate in, even though React would otherwise just jump straight
// to their final position.
const REDRAW_DELAY_MS = 70;
const SUBTOPIC_TRANSITION_MS = 420;

function useViewportSize() {
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    function onResize() {
      setSize({ w: window.innerWidth, h: window.innerHeight });
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return size;
}

export function PracticeSubjectPage() {
  useStudyActivityTracker();

  const { subjectId } = useParams<{ subjectId: string }>();
  const id = Number(subjectId);
  const navigate = useNavigate();
  const location = useLocation();
  const navState = location.state as { subtopicId?: number; topicId?: number } | null;
  const [searchParams, setSearchParams] = useSearchParams();
  const { w, h } = useViewportSize();

  const [subject, setSubject] = useState<SubjectNode | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [draw, setDraw] = useState(1);
  const [introOpen, setIntroOpen] = useState<"domain" | "topic" | null>(null);
  const [leavingSubtopicId, setLeavingSubtopicId] = useState<number | null>(null);

  useEffect(() => {
    setSubject(null);
    setNotFound(false);
    getHierarchy().then((subjects) => {
      const found = subjects.find((s) => s.id === id) ?? null;
      setSubject(found);
      setNotFound(!found);
    });
  }, [id]);

  const domainParam = searchParams.get("domain");
  const topicParam = searchParams.get("topic");
  const domainIndex = subject && domainParam
    ? subject.domains.findIndex((d) => String(d.id) === domainParam)
    : -1;
  const selectedDomain = domainIndex >= 0 ? subject!.domains[domainIndex] : null;
  const topicIndex = selectedDomain && topicParam
    ? selectedDomain.topics.findIndex((t) => String(t.id) === topicParam)
    : -1;
  const selectedTopic = topicIndex >= 0 ? selectedDomain!.topics[topicIndex] : null;

  // Deep-link support for "topic" assignments (subtopic assignments now go
  // straight to /practice/subtopic/:id — see lib/assignmentLabels.ts).
  // Only ever runs once the hierarchy actually needs resolving, and only
  // from nav state, so it never fights the user's own navigation.
  useEffect(() => {
    if (!subject || !navState?.topicId) return;
    for (const domain of subject.domains) {
      const topic = domain.topics.find((t) => t.id === navState.topicId);
      if (topic) {
        setSearchParams({ domain: String(domain.id), topic: String(topic.id) }, { replace: true });
        return;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject, location.key]);

  // Replays the entrance transition on every level change, whichever
  // direction it came from (a click, a browser back/forward, or a direct
  // URL visit) — search params are the single source of truth here.
  useEffect(() => {
    setIntroOpen(null);
    setDraw(0);
    const t = setTimeout(() => setDraw(1), REDRAW_DELAY_MS);
    return () => clearTimeout(t);
  }, [domainParam, topicParam]);

  function selectDomain(domainId: number | null) {
    if (domainId === null) {
      setSearchParams({});
    } else {
      setSearchParams({ domain: String(domainId) });
    }
  }

  function selectTopic(topicId: number | null) {
    if (!selectedDomain) return;
    if (topicId === null) {
      setSearchParams({ domain: String(selectedDomain.id) });
    } else {
      setSearchParams({ domain: String(selectedDomain.id), topic: String(topicId) });
    }
  }

  function selectSubtopic(subtopicId: number) {
    if (leavingSubtopicId !== null) return;
    setLeavingSubtopicId(subtopicId);
    setTimeout(() => navigate(`/practice/subtopic/${subtopicId}`), SUBTOPIC_TRANSITION_MS);
  }

  if (notFound) {
    return (
      <div className="p-8">
        <p className="text-lg text-text-muted">Առարկան չի գտնվել։</p>
        <LinkButton to="/practice">← Առարկաներ</LinkButton>
      </div>
    );
  }

  if (!subject) {
    return <div className="p-8 text-lg text-text-muted">Բեռնվում է...</div>;
  }

  const layout = computeLayout({
    domains: subject.domains,
    domainIndex: domainIndex >= 0 ? domainIndex : null,
    topicIndex: topicIndex >= 0 ? topicIndex : null,
    width: w,
    height: h,
    draw,
    onSelectDomain: selectDomain,
    onSelectTopic: selectTopic,
    onSelectSubtopic: (_topic, subtopic) => selectSubtopic(subtopic.id),
  });

  const level = selectedTopic ? "subtopic" : selectedDomain ? "topic" : "domain";
  const small = Math.min(w, h) < 720;

  // Small satellite "Ներածություն" node(s) — deliberately NOT part of the
  // radial layout math (hierarchyLayout.computeLayout only places
  // domain/topic/subtopic nodes): fixed near the top corners so they never
  // collide with the ring of nodes or the focal center node, per the
  // design not specifying a location for this (it doesn't exist in the
  // uploaded design at all — see the written plan).
  const introNodes: NodeVisual[] = [];
  if (selectedDomain && level === "topic") {
    introNodes.push({
      key: "intro-domain",
      kind: "intro",
      name: "Ներածություն",
      glyph: INTRO_GLYPH,
      accent: accentFor(domainIndex),
      x: small ? 64 : 96,
      y: small ? 96 : 120,
      size: small ? 64 : 78,
      scale: draw,
      opacity: draw,
      z: 25,
      delayMs: 260,
      active: false,
      interactive: draw >= 0.6,
      pct: null,
      onSelect: () => setIntroOpen("domain"),
    });
  }
  if (selectedDomain && selectedTopic && level === "subtopic") {
    introNodes.push({
      key: "intro-topic",
      kind: "intro",
      name: "Ներածություն",
      glyph: INTRO_GLYPH,
      accent: accentFor(domainIndex),
      x: w - (small ? 64 : 96),
      y: small ? 96 : 120,
      size: small ? 64 : 78,
      scale: draw,
      opacity: draw,
      z: 25,
      delayMs: 260,
      active: false,
      interactive: draw >= 0.6,
      pct: null,
      onSelect: () => setIntroOpen("topic"),
    });
  }

  const leavingSubtopicName = leavingSubtopicId
    ? selectedTopic?.subtopics.find((s) => s.id === leavingSubtopicId)?.name
    : null;

  const hint = leavingSubtopicId
    ? ""
    : level === "domain"
      ? "Ընտրեք ոլորտ՝ դրա կառուցվածքը տեսնելու համար"
      : level === "topic"
        ? "Ընտրեք թեմա · սեղմեք կենտրոնական հանգույցը՝ դուրս գալու համար"
        : "Ընտրեք ենթաթեմա՝ դասը բացելու համար · սեղմեք կենտրոնական հանգույցը՝ հետ գնալու համար";

  return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "#06070b",
          fontFamily: "'Space Grotesk', system-ui, sans-serif",
          color: "#e8ecf4",
          overflow: "hidden",
        }}
      >
        <AmbientBackground accent={layout.ambientAccent} />

        <ConnectionLines links={layout.links} />

        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%,-50%)",
            opacity: layout.coreOpacity,
            transition: "opacity 900ms ease",
            pointerEvents: "none",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 18,
          }}
        >
          <div
            style={{
              width: 78,
              height: 78,
              borderRadius: "50%",
              border: "1px solid rgba(255,255,255,.07)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                border: "1px solid rgba(255,255,255,.11)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,.5)",
                  boxShadow: "0 0 18px 4px rgba(160,190,255,.35)",
                }}
              />
            </div>
          </div>
          <div
            style={{
              fontFamily: "'JetBrains Mono', system-ui, monospace",
              fontSize: 10,
              letterSpacing: ".34em",
              textTransform: "uppercase",
              color: "rgba(232,236,244,.38)",
            }}
          >
            {subject.name}
          </div>
        </div>

        <div style={{ position: "absolute", inset: 0 }}>
          {layout.nodes.map((n) => (
            <HierarchyNode
              key={n.key}
              node={
                n.kind === "subtopic" && n.key === `subtopic-${leavingSubtopicId}`
                  ? { ...n, scale: n.scale * 1.35, opacity: 1, z: 50 }
                  : n
              }
            />
          ))}
          {introNodes.map((n) => (
            <HierarchyNode key={n.key} node={n} />
          ))}
        </div>

        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            padding: small ? "20px 20px" : "30px 40px",
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 24,
            pointerEvents: "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, pointerEvents: "auto", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => navigate("/practice")}
              style={{
                fontFamily: "'JetBrains Mono', system-ui, monospace",
                fontSize: 10,
                letterSpacing: ".26em",
                textTransform: "uppercase",
                color: "rgba(232,236,244,.5)",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
            >
              ← Առարկաներ
            </button>
            <Crumb label="Ոլորտներ" active={!selectedDomain} onClick={() => selectDomain(null)} />
            {selectedDomain && (
              <Crumb label={selectedDomain.name} active={!selectedTopic} onClick={() => selectTopic(null)} />
            )}
            {selectedTopic && <Crumb label={selectedTopic.name} active clickable={false} />}
          </div>
          <div
            style={{
              fontFamily: "'JetBrains Mono', system-ui, monospace",
              fontSize: 10,
              letterSpacing: ".26em",
              textTransform: "uppercase",
              color: "rgba(232,236,244,.3)",
              whiteSpace: "nowrap",
            }}
          >
            {layout.levelLabel}
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 34,
            display: "flex",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              fontFamily: "'Space Grotesk', system-ui, sans-serif",
              fontWeight: 300,
              fontSize: 13,
              letterSpacing: ".04em",
              color: "rgba(232,236,244,.34)",
              transition: "color 400ms ease",
              textAlign: "center",
              padding: "0 16px",
            }}
          >
            {leavingSubtopicId ? `Բացվում է՝ ${leavingSubtopicName ?? ""}...` : hint}
          </div>
        </div>

        {introOpen === "domain" && selectedDomain && (
          <IntroOverlay
            pathLabel={subject.name}
            title={selectedDomain.name}
            introText={selectedDomain.intro_text}
            accent={accentFor(domainIndex)}
            onClose={() => setIntroOpen(null)}
          />
        )}
        {introOpen === "topic" && selectedDomain && selectedTopic && (
          <IntroOverlay
            pathLabel={[subject.name, selectedDomain.name].join("  /  ")}
            title={selectedTopic.name}
            introText={selectedTopic.intro_text}
            accent={accentFor(domainIndex)}
            onClose={() => setIntroOpen(null)}
          />
        )}
      </div>
  );
}

function Crumb({
  label,
  active,
  onClick,
  clickable = true,
}: {
  label: string;
  active: boolean;
  onClick?: () => void;
  clickable?: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
      <div style={{ fontFamily: "'JetBrains Mono', system-ui, monospace", fontSize: 10, color: "rgba(232,236,244,.22)" }}>
        /
      </div>
      <div
        onClick={clickable ? onClick : undefined}
        role={clickable ? "button" : undefined}
        style={{
          fontFamily: "'JetBrains Mono', system-ui, monospace",
          fontSize: 10,
          letterSpacing: ".26em",
          textTransform: "uppercase",
          color: active ? "rgba(255,255,255,.9)" : "rgba(232,236,244,.42)",
          cursor: clickable ? "pointer" : "default",
          transition: "color 300ms ease",
        }}
      >
        {label}
      </div>
    </div>
  );
}
