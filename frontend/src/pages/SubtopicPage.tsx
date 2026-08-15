import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  getHierarchy, getSubtopicMaterial, TIER_LABELS, MATH_SUBJECT_NAME,
  type SubjectNode, type DomainNode, type TopicNode, type SubtopicNode,
  type SubtopicMaterial, type Tier,
} from "../api/practice";
import * as teachingApi from "../api/teaching";
import { MarkdownMessage } from "../components/assistant/MarkdownMessage";
import { SpeakOnSelect } from "../components/SpeakOnSelect";
import { ToolsDock } from "../components/ToolsDock";
import { NotepadProvider } from "../context/NotepadContext";
import { useStudyActivityTracker } from "../hooks/useStudyActivityTracker";
import { useAuth } from "../auth/AuthContext";

const TIERS: Tier[] = ["easy", "medium", "hard"];

type MaterialSection = { heading: string; body: string };

// Learning material is authored with "## " headers per section (intro, examples,
// summary, etc.) and, within the worked-examples section, individual examples
// marked either with a "### " heading (math) or a bold "**Օրինակ N...**" line
// (English) — but it's stored as one flat markdown string. Split it here so it
// can be shown step by step: one step per "##" section, further split into one
// step per example/subsection where those markers exist.
// A line that's nothing but a "---"/"***"/"___" thematic break (used as a
// decorative divider between sections in the source files) carries no content
// of its own — it shouldn't count toward whether a step has real text.
function isThematicBreak(line: string): boolean {
  return /^(-{3,}|\*{3,}|_{3,})\s*$/.test(line.trim());
}

function meaningfulBody(lines: string[]): string {
  return lines.filter((l) => !isThematicBreak(l)).join("\n").trim();
}

// Math material marks each worked example with a "### " heading. English material
// has no H3s at all — its examples are instead a bold marker line on its own,
// e.g. "**Օրինակ 1 (...):**". Recognize either as a subsection boundary.
const EXAMPLE_MARKER = /^\*\*Օրինակ\s+\d+.*\*\*\s*$/;

function subsectionHeading(line: string): string | null {
  if (/^###\s+/.test(line)) return line.replace(/^###\s+/, "").trim();
  const trimmed = line.trim();
  if (EXAMPLE_MARKER.test(trimmed)) {
    return trimmed.replace(/^\*\*/, "").replace(/\*\*$/, "").replace(/:$/, "").trim();
  }
  return null;
}

function splitByH3(heading: string, lines: string[]): MaterialSection[] {
  const subsections: { heading: string; lines: string[] }[] = [];
  let current: { heading: string; lines: string[] } | null = null;
  const intro: string[] = [];

  for (const line of lines) {
    const subHeading = subsectionHeading(line);
    if (subHeading !== null) {
      if (current) subsections.push(current);
      current = { heading: subHeading, lines: [line] };
    } else if (current) {
      current.lines.push(line);
    } else {
      intro.push(line);
    }
  }
  if (current) subsections.push(current);

  if (subsections.length === 0) {
    return [{ heading, body: meaningfulBody(intro) }];
  }

  const result: MaterialSection[] = [];
  const introBody = meaningfulBody(intro);
  if (introBody) result.push({ heading, body: introBody });
  for (const sub of subsections) {
    result.push({ heading: sub.heading, body: sub.lines.join("\n").trim() });
  }
  return result;
}

function splitIntoSections(markdown: string): MaterialSection[] {
  const lines = markdown.split("\n");
  const rawSections: { heading: string; lines: string[] }[] = [];
  let current: { heading: string; lines: string[] } | null = null;
  const preamble: string[] = [];

  for (const line of lines) {
    if (/^##\s+/.test(line)) {
      if (current) rawSections.push(current);
      // The "## " line itself isn't included in the section's body — its text
      // becomes the step's heading/pill label instead, via `heading` below.
      current = { heading: line.replace(/^##\s+/, "").trim(), lines: [] };
    } else if (current) {
      current.lines.push(line);
    } else {
      preamble.push(line);
    }
  }
  if (current) rawSections.push(current);

  const sections: MaterialSection[] = [];
  const preambleBody = meaningfulBody(preamble.filter((l) => !/^#\s+/.test(l)));
  if (preambleBody) sections.push({ heading: "Ներածություն", body: preambleBody });

  for (const raw of rawSections) {
    sections.push(...splitByH3(raw.heading, raw.lines).filter((s) => s.body.length > 0));
  }

  return sections.length > 0 ? sections : [{ heading: "", body: markdown }];
}

function findSubtopicContext(
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

function SubtopicContent({
  subtopic, trackAssignmentId, backHref, breadcrumb,
}: {
  subtopic: SubtopicNode;
  trackAssignmentId?: number;
  backHref: string;
  breadcrumb: string;
}) {
  const [material, setMaterial] = useState<SubtopicMaterial | null>(null);
  const [sectionIndex, setSectionIndex] = useState(0);
  const exercisesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMaterial(null);
    setSectionIndex(0);
    if (subtopic.has_learning_material) {
      getSubtopicMaterial(subtopic.id).then(setMaterial);
    }
  }, [subtopic.id, subtopic.has_learning_material]);

  const sections = material ? splitIntoSections(material.learning_material) : [];

  useEffect(() => {
    setSectionIndex(0);
  }, [material]);

  useEffect(() => {
    if (!trackAssignmentId || !subtopic.has_learning_material || sections.length === 0) return;
    const fraction = (sectionIndex + 1) / sections.length;
    teachingApi.updateLearningProgress(trackAssignmentId, fraction).catch(() => {});
    // sections.length is derived from material, which is already a dep of the effect
    // that resets sectionIndex — including it here would just duplicate that trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackAssignmentId, subtopic.id, subtopic.has_learning_material, sectionIndex]);

  function goToSection(index: number) {
    setSectionIndex(index);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div>
      <Link to={backHref} className="mb-4 inline-block text-sm text-primary hover:underline">
        ← {breadcrumb}
      </Link>

      <div className="mb-4 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold text-text">{subtopic.name}</h1>
        <button
          type="button"
          onClick={() => exercisesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
          className="shrink-0 rounded-[var(--radius)] border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary hover:text-primary-contrast"
        >
          Անցնել վարժություններին
        </button>
      </div>

      {subtopic.has_learning_material ? (
        material ? (
          <div>
            {sections.length > 1 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {sections.map((section, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => goToSection(index)}
                    className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                      index === sectionIndex
                        ? "border-primary bg-primary text-primary-contrast"
                        : "border-border text-text-muted hover:border-primary hover:text-text"
                    }`}
                  >
                    {section.heading || `Մաս ${index + 1}`}
                  </button>
                ))}
              </div>
            )}

            <MarkdownMessage className="text-xl leading-relaxed" content={sections[sectionIndex].body} />

            {sections.length > 1 && (
              <div className="mt-6 flex items-center justify-between gap-4 border-t border-border pt-4">
                <button
                  type="button"
                  disabled={sectionIndex === 0}
                  onClick={() => goToSection(sectionIndex - 1)}
                  className="rounded-[var(--radius)] border border-border px-4 py-2 text-sm font-medium text-text hover:border-primary hover:text-primary disabled:pointer-events-none disabled:opacity-40"
                >
                  ← Նախորդ
                </button>
                <span className="text-sm text-text-muted">
                  {sectionIndex + 1} / {sections.length}
                </span>
                <button
                  type="button"
                  disabled={sectionIndex === sections.length - 1}
                  onClick={() => goToSection(sectionIndex + 1)}
                  className="rounded-[var(--radius)] border border-border px-4 py-2 text-sm font-medium text-text hover:border-primary hover:text-primary disabled:pointer-events-none disabled:opacity-40"
                >
                  Հաջորդ →
                </button>
              </div>
            )}
          </div>
        ) : (
          <p className="text-lg text-text-muted">Բեռնվում է...</p>
        )
      ) : (
        <p className="text-lg text-text-muted">Ուսումնական նյութը կավելացվի ավելի ուշ։</p>
      )}

      <div ref={exercisesRef} className="mt-8 grid scroll-mt-8 gap-4 pt-2 sm:grid-cols-3">
        {TIERS.map((tier) => {
          const score = subtopic.tier_scores[tier];
          const done = score !== null;
          return (
            <Link
              key={tier}
              to={`/practice/subtopic/${subtopic.id}/${tier}`}
              state={{ subtopicName: subtopic.name }}
              className="rounded-[var(--radius)] border border-border bg-surface p-6 text-center transition-colors hover:border-primary"
            >
              <div
                className="mx-auto mb-3 h-2 w-12 rounded-full"
                style={{ backgroundColor: `var(--color-${tier})` }}
              />
              <p className="text-lg font-medium text-text">{TIER_LABELS[tier]}</p>
              <p className="text-text-muted">{done ? `Ավարտված ✓ (${score}%)` : "Չսկսված"}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function SubtopicPage() {
  useStudyActivityTracker();

  const { subtopicId } = useParams<{ subtopicId: string }>();
  const id = Number(subtopicId);
  const navigate = useNavigate();
  const { user } = useAuth();

  const [context, setContext] = useState<ReturnType<typeof findSubtopicContext>>(null);
  const [notFound, setNotFound] = useState(false);
  const [trackAssignmentId, setTrackAssignmentId] = useState<number | undefined>(undefined);

  useEffect(() => {
    setContext(null);
    setNotFound(false);
    getHierarchy().then((subjects) => {
      const found = findSubtopicContext(subjects, id);
      setContext(found);
      setNotFound(!found);
    });
  }, [id]);

  useEffect(() => {
    if (user?.role !== "student") return;
    teachingApi.fetchAssignments().then((list) => {
      const match = list.find(
        (a) =>
          a.assignment_type === "subtopic" &&
          (a.status === "assigned" || a.status === "in_progress") &&
          a.subtopic?.id === id
      );
      setTrackAssignmentId(match?.id);
    });
  }, [user, id]);

  if (notFound) {
    return (
      <div className="p-8">
        <p className="text-lg text-text-muted">Ենթաթեման չի գտնվել։</p>
        <button type="button" onClick={() => navigate("/practice")} className="text-sm text-primary hover:underline">
          ← Առարկաներ
        </button>
      </div>
    );
  }

  if (!context) {
    return <div className="p-8 text-lg text-text-muted">Բեռնվում է...</div>;
  }

  const { subject, domain, topic, subtopic } = context;
  const isMath = subject.name === MATH_SUBJECT_NAME;
  const backHref = `/practice/${subject.id}?domain=${domain.id}&topic=${topic.id}`;
  const breadcrumb = `${domain.name} / ${topic.name}`;

  const content = (
    <SubtopicContent
      subtopic={subtopic}
      trackAssignmentId={trackAssignmentId}
      backHref={backHref}
      breadcrumb={breadcrumb}
    />
  );

  return (
    <NotepadProvider>
      <div className="mx-auto max-w-4xl px-8 py-8">
        {isMath ? content : <SpeakOnSelect>{content}</SpeakOnSelect>}
      </div>
      {isMath && <ToolsDock />}
    </NotepadProvider>
  );
}
