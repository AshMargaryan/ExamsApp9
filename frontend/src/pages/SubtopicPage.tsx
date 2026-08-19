import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  getHierarchy, getSubtopicMaterial, TIER_LABELS, MATH_SUBJECT_NAME,
  type SubjectNode, type DomainNode, type TopicNode, type SubtopicNode,
  type SubtopicMaterial, type Tier,
} from "../api/practice";
import { Send } from "lucide-react";
import * as teachingApi from "../api/teaching";
import type { StudentRosterEntry } from "../api/teaching";
import { MarkdownMessage } from "../components/assistant/MarkdownMessage";
import { SpeakOnSelect } from "../components/SpeakOnSelect";
import { AssignmentPicker } from "../components/teaching/AssignmentPicker";
import { nextTier, tierSummary } from "../components/practice/TierStatus";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { PageHeader } from "../components/ui/PageHeader";
import { Section } from "../components/ui/Section";
import { LoadingRegion, Skeleton, SkeletonText } from "../components/ui/Skeleton";
import { useAsyncResource } from "../hooks/useAsyncResource";
import { useStudyActivityTracker } from "../hooks/useStudyActivityTracker";
import { useAuth } from "../auth/AuthContext";
import { cn } from "../lib/cn";

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
  subtopic, trackAssignmentId, backHref, breadcrumb, onAssignClick,
}: {
  subtopic: SubtopicNode;
  trackAssignmentId?: number;
  backHref: string;
  breadcrumb: string;
  /** Present only for a teacher — opens the assignment picker preset to this subtopic. */
  onAssignClick?: () => void;
}) {
  const [sectionIndex, setSectionIndex] = useState(0);
  const exercisesRef = useRef<HTMLDivElement>(null);

  const fetchMaterial = useCallback(
    (): Promise<SubtopicMaterial | null> =>
      subtopic.has_learning_material ? getSubtopicMaterial(subtopic.id) : Promise.resolve(null),
    [subtopic.id, subtopic.has_learning_material],
  );

  const {
    data: material,
    isLoading: materialLoading,
    error: materialError,
    retry: retryMaterial,
  } = useAsyncResource(fetchMaterial, [subtopic.id, subtopic.has_learning_material]);

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

  const { done, total } = tierSummary(subtopic.tier_scores);
  const next = nextTier(subtopic.tier_scores);

  return (
    <div>
      <PageHeader
        eyebrow={breadcrumb}
        title={subtopic.name}
        back={{ to: backHref, label: "Թեմա" }}
        description={
          done === 0
            ? "Կարդա նյութը, ապա անցիր վարժություններին։"
            : done === total
              ? "Երեք մակարդակն էլ անցած են։ Կարող ես կրկնել ցանկացածը։"
              : `${done}/${total} մակարդակ անցած է։`
        }
        actions={
          <>
            {onAssignClick && (
              <Button
                variant="secondary"
                size="sm"
                iconLeft={<Send size={15} strokeWidth={1.75} />}
                onClick={onAssignClick}
              >
                Հանձնարարել աշակերտի
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => exercisesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            >
              Անցնել վարժություններին
            </Button>
          </>
        }
      />

      {!subtopic.has_learning_material ? (
        <EmptyState
          title="Ուսումնական նյութը կավելացվի ավելի ուշ։"
          hint="Վարժությունները արդեն հասանելի են՝ ներքևում։"
        />
      ) : materialLoading ? (
        <LoadingRegion>
          <Skeleton className="h-8 w-2/3" />
          <SkeletonText lines={6} className="mt-[var(--space-5)]" />
        </LoadingRegion>
      ) : materialError ? (
        <ErrorState
          title="Չհաջողվեց բեռնել ուսումնական նյութը։"
          hint="Վարժությունները դրանից անկախ հասանելի են՝ ներքևում։"
          onRetry={retryMaterial}
        />
      ) : material ? (
        <div>
          {/*
            Section pills are a step indicator, not a filter row: they are the
            student's position in the lesson. The active one is filled, and the
            count beneath the body says how far through the material they are.
          */}
          {sections.length > 1 && (
            <div className="mb-[var(--space-5)] flex flex-wrap gap-[var(--space-2)]">
              {sections.map((section, index) => (
                <button
                  key={index}
                  type="button"
                  aria-current={index === sectionIndex ? "step" : undefined}
                  onClick={() => goToSection(index)}
                  className={cn(
                    "rounded-full border px-[var(--space-3)] py-[var(--space-1)] text-[length:var(--text-sm)] transition-colors",
                    index === sectionIndex
                      ? "border-primary bg-primary text-primary-contrast"
                      : "border-border text-text-muted hover:border-primary hover:text-text",
                  )}
                >
                  {section.heading || `Մաս ${index + 1}`}
                </button>
              ))}
            </div>
          )}

          <MarkdownMessage
            className="max-w-[var(--measure-base)] text-[length:var(--text-lg)] leading-[var(--leading-relaxed)]"
            content={sections[sectionIndex].body}
          />

          {sections.length > 1 && (
            <div className="mt-[var(--space-6)] flex items-center justify-between gap-[var(--space-4)] border-t border-border pt-[var(--space-4)]">
              <Button
                variant="secondary"
                size="sm"
                disabled={sectionIndex === 0}
                onClick={() => goToSection(sectionIndex - 1)}
              >
                ← Նախորդ
              </Button>
              <span className="text-[length:var(--text-sm)] text-text-muted">
                {sectionIndex + 1} / {sections.length}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={sectionIndex === sections.length - 1}
                onClick={() => goToSection(sectionIndex + 1)}
              >
                Հաջորդ →
              </Button>
            </div>
          )}
        </div>
      ) : null}

      {/*
        The three tiers are a sequence, not three equal options, so exactly one
        of them is marked as the one to do next. Previously every card looked
        identical and a completed tier read "Ավարտված ✓ (33%)" — a tick labelled
        "completed" directly beside a failing score, which told the student the
        opposite of what the number meant.
      */}
      <Section
        title="Վարժություններ"
        description="Երեք մակարդակ՝ հեշտից դժվար։"
        className="scroll-mt-8"
      >
        <div ref={exercisesRef} className="grid gap-[var(--space-4)] sm:grid-cols-3">
          {TIERS.map((tier) => {
            const score = subtopic.tier_scores[tier];
            const attempted = score !== null;
            const isNext = tier === next;
            return (
              <Link
                key={tier}
                to={`/practice/subtopic/${subtopic.id}/${tier}`}
                state={{ subtopicName: subtopic.name }}
                className={cn(
                  "flex flex-col rounded-[var(--radius-lg)] border bg-surface p-[var(--space-5)] transition-colors",
                  isNext ? "border-primary" : "border-border hover:border-primary",
                )}
              >
                <div className="flex items-center justify-between gap-[var(--space-2)]">
                  <span
                    className="h-2 w-10 shrink-0 rounded-full"
                    style={{ backgroundColor: `var(--color-${tier})` }}
                    aria-hidden
                  />
                  {isNext && (
                    <span className="text-[length:var(--text-xs)] font-medium text-primary">Հաջորդը</span>
                  )}
                </div>
                <p className="mt-[var(--space-3)] text-[length:var(--text-lg)] font-medium text-text">
                  {TIER_LABELS[tier]}
                </p>
                <p className="mt-[var(--space-1)] text-[length:var(--text-sm)] text-text-muted">
                  {attempted ? `Վերջին արդյունքը՝ ${score}%` : "Դեռ չսկսված"}
                </p>
              </Link>
            );
          })}
        </div>
      </Section>
    </div>
  );
}

export function SubtopicPage() {
  useStudyActivityTracker();

  const { subtopicId } = useParams<{ subtopicId: string }>();
  const id = Number(subtopicId);
  const navigate = useNavigate();
  const { user } = useAuth();

  const [trackAssignmentId, setTrackAssignmentId] = useState<number | undefined>(undefined);
  const [roster, setRoster] = useState<StudentRosterEntry[] | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);

  const fetchContext = useCallback(
    async () => findSubtopicContext(await getHierarchy(), id),
    [id],
  );
  const { data: context, isLoading, error, retry } = useAsyncResource(fetchContext, [id]);

  useEffect(() => {
    if (user?.role !== "student") return;
    teachingApi
      .fetchAssignments()
      .then((list) => {
        const match = list.find(
          (a) =>
            a.assignment_type === "subtopic" &&
            (a.status === "assigned" || a.status === "in_progress") &&
            a.subtopic?.id === id
        );
        setTrackAssignmentId(match?.id);
      })
      // Assignment tracking is a side feature here — if it fails, the lesson
      // itself must still open.
      .catch(() => setTrackAssignmentId(undefined));
  }, [user, id]);

  useEffect(() => {
    if (user?.role !== "teacher") return;
    teachingApi.fetchStudentRoster().then(setRoster).catch(() => setRoster([]));
  }, [user]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-[var(--space-4)] py-[var(--space-8)]">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-[var(--space-3)] h-9 w-2/3" />
        <LoadingRegion className="mt-[var(--space-7)]">
          <SkeletonText lines={7} />
        </LoadingRegion>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-[var(--space-4)] py-[var(--space-8)]">
        <PageHeader title="Ենթաթեմա" back={{ to: "/practice", label: "Առարկաներ" }} />
        <ErrorState
          title="Չհաջողվեց բեռնել ենթաթեման։"
          hint="Ստուգիր կապը և փորձիր կրկին։"
          onRetry={retry}
        />
      </div>
    );
  }

  if (!context) {
    return (
      <div className="mx-auto max-w-4xl px-[var(--space-4)] py-[var(--space-8)]">
        <PageHeader title="Ենթաթեման չի գտնվել" back={{ to: "/practice", label: "Առարկաներ" }} />
        <EmptyState
          title="Այս ենթաթեման հասանելի չէ։"
          hint="Հնարավոր է հղումը հնացած է։"
          cta={{ label: "Բոլոր առարկաները", onClick: () => navigate("/practice") }}
        />
      </div>
    );
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
      onAssignClick={user?.role === "teacher" ? () => setAssignOpen(true) : undefined}
    />
  );

  return (
    <div className="mx-auto max-w-4xl px-8 py-8">
      {isMath ? content : <SpeakOnSelect>{content}</SpeakOnSelect>}
      {user?.role === "teacher" && (
        <AssignmentPicker
          open={assignOpen}
          onOpenChange={setAssignOpen}
          roster={roster ?? []}
          presetContent={{ assignment_type: "subtopic", id: subtopic.id, label: subtopic.name }}
        />
      )}
    </div>
  );
}
