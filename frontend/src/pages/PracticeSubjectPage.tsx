import { useCallback, useEffect } from "react";
import { useNavigate, useLocation, useParams, useSearchParams, Link } from "react-router-dom";
import { ChevronDown, ChevronRight, Info } from "lucide-react";
import { getHierarchy, type DomainNode, type SubjectNode, type TopicNode } from "../api/practice";
import { useAsyncResource } from "../hooks/useAsyncResource";
import { TierStatus, nextTier, tierSummary } from "../components/practice/TierStatus";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { PageHeader } from "../components/ui/PageHeader";
import { ProgressBar } from "../components/ui/ProgressBar";
import { LoadingRegion, Skeleton } from "../components/ui/Skeleton";
import { useStudyActivityTracker } from "../hooks/useStudyActivityTracker";
import { cn } from "../lib/cn";

/*
  The practice navigator.

  What was here before, and why it was replaced
  ---------------------------------------------
  This page used to be a fixed, full-viewport radial "constellation": a
  hard-coded #06070b background with domain/topic/subtopic names inside
  circles, laid out by trigonometry against window.innerWidth/innerHeight.
  It looked striking in a desktop screenshot and failed as an interface:

  1. `position: fixed; inset: 0; overflow: hidden` with nodes placed on a
     radius meant that at 375x812 the ring did not fit. Nodes below the fold
     were clipped away with no scroll — a topic could be **unreachable on a
     phone**, which is a functional defect, not a cosmetic one.
  2. Names were set in 'Space Grotesk' / 'JetBrains Mono', neither of which
     has Armenian coverage, inside fixed-diameter circles. Six of eight labels
     broke mid-word into orphans ("Հանրահաշի / վ", "Հավասարում / ներ"), and
     the breadcrumb was 10px uppercase at .26em tracking — Armenian has no
     uppercase tradition, so this was the least legible text in the product.
  3. The layout centred on window.innerWidth while the 256px desktop nav rail
     covered the left edge, so the composition sat 128px left of the visual
     centre of the area it actually occupied.
  4. It ignored the theme entirely: a student in light mode got a black
     full-screen takeover between two light pages.
  5. Every level change cost a 420ms scripted transition, and only one level
     was ever visible, so reaching a subtopic meant three blind hops.

  What replaces it keeps the same information architecture and the same URL
  contract (`?domain=&topic=`), so assignment deep-links and browser
  back/forward behave exactly as before. The differences are that it scrolls,
  it uses the theme, it shows progress next to every choice rather than a
  percentage hidden inside a circle, and topics reveal their subtopics inline
  — which removes one full navigation from the path to a question.
*/

function subtopicCount(topic: TopicNode): number {
  return topic.subtopics.length;
}

function ProgressRow({ percent, avgScore }: { percent: number; avgScore: number | null }) {
  return (
    <div className="mt-[var(--space-4)]">
      <div className="mb-[var(--space-2)] flex items-baseline justify-between gap-[var(--space-3)]">
        <span className="text-[length:var(--text-xs)] text-text-muted">
          {percent > 0 ? "Անցած նյութ" : "Դեռ չսկսված"}
        </span>
        <span className="text-[length:var(--text-xs)] font-semibold text-text">{percent}%</span>
      </div>
      <ProgressBar percent={percent} heightClassName="h-1" />
      {avgScore !== null && (
        <p className="mt-[var(--space-2)] text-[length:var(--text-xs)] text-text-muted">
          Միջին միավորը՝ {avgScore}%
        </p>
      )}
    </div>
  );
}

/* Intro text is real authored content, so it is kept — but as a disclosure at
   the top of the level it describes, rather than as a floating satellite
   circle that overlapped the breadcrumb at narrow widths. */
function IntroPanel({ text }: { text: string }) {
  if (!text?.trim()) return null;
  return (
    <details className="mb-[var(--space-5)] rounded-[var(--radius-lg)] border border-border bg-surface-muted">
      <summary className="flex cursor-pointer items-center gap-[var(--space-2)] rounded-[var(--radius-lg)] px-[var(--space-4)] py-[var(--space-3)] text-[length:var(--text-sm)] font-medium text-text">
        <Info size={16} strokeWidth={1.75} className="shrink-0 text-primary" aria-hidden />
        Ներածություն
      </summary>
      <p className="max-w-[var(--measure-base)] px-[var(--space-4)] pb-[var(--space-4)] text-[length:var(--text-sm)] leading-[var(--leading-body)] whitespace-pre-line text-text-muted">
        {text}
      </p>
    </details>
  );
}

function DomainCard({ domain, onSelect }: { domain: DomainNode; onSelect: () => void }) {
  const topics = domain.topics.length;
  const subtopics = domain.topics.reduce((s, t) => s + t.subtopics.length, 0);

  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex w-full flex-col rounded-[var(--radius-lg)] border border-border bg-surface p-[var(--space-5)] text-left transition-colors hover:border-primary"
    >
      <div className="flex items-start justify-between gap-[var(--space-4)]">
        <div className="min-w-0">
          <h2 className="text-[length:var(--text-lg)] leading-[var(--leading-heading)] font-semibold text-text">
            {domain.name}
          </h2>
          <p className="mt-[var(--space-1)] text-[length:var(--text-sm)] text-text-muted">
            {topics} թեմա · {subtopics} ենթաթեմա
          </p>
        </div>
        <ChevronRight
          size={20}
          strokeWidth={1.75}
          className="mt-1 shrink-0 text-text-muted transition-colors group-hover:text-primary"
          aria-hidden
        />
      </div>
      <ProgressRow percent={domain.progress.percent} avgScore={domain.progress.avg_score} />
    </button>
  );
}

/*
  A topic row that opens in place. Expanding rather than navigating is what
  removes a level from the old flow: the student can compare subtopics under
  two topics without losing their place, and the URL still records which topic
  is open so back/forward and deep links keep working.
*/
function TopicRow({
  topic,
  expanded,
  onToggle,
}: {
  topic: TopicNode;
  expanded: boolean;
  onToggle: () => void;
}) {
  const panelId = `topic-panel-${topic.id}`;

  return (
    <li className="overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={panelId}
        className="flex w-full items-center gap-[var(--space-4)] p-[var(--space-4)] text-left transition-colors hover:bg-surface-muted"
      >
        <ChevronDown
          size={18}
          strokeWidth={2}
          aria-hidden
          className={cn(
            "shrink-0 text-text-muted transition-transform duration-200 motion-reduce:transition-none",
            expanded ? "rotate-0" : "-rotate-90",
          )}
        />
        <div className="min-w-0 flex-1">
          <p className="text-[length:var(--text-base)] leading-[var(--leading-snug)] font-medium text-text">
            {topic.name}
          </p>
          <p className="mt-[var(--space-1)] text-[length:var(--text-xs)] text-text-muted">
            {subtopicCount(topic)} ենթաթեմա · {topic.progress.percent}%
          </p>
        </div>
        <div className="hidden w-28 shrink-0 sm:block">
          <ProgressBar percent={topic.progress.percent} heightClassName="h-1" />
        </div>
      </button>

      {expanded && (
        <div id={panelId} className="border-t border-border bg-surface-muted/50 p-[var(--space-3)]">
          <IntroPanel text={topic.intro_text} />
          {topic.subtopics.length === 0 ? (
            <EmptyState
              size="sm"
              title="Այս թեմայի ենթաթեմաները դեռ պատրաստ չեն։"
              hint="Նյութը ավելացվում է աստիճանաբար։"
            />
          ) : (
            <ul className="flex flex-col gap-[var(--space-2)]">
              {topic.subtopics.map((subtopic) => {
                const { done, total } = tierSummary(subtopic.tier_scores);
                const next = nextTier(subtopic.tier_scores);
                return (
                  <li key={subtopic.id}>
                    <Link
                      to={`/practice/subtopic/${subtopic.id}`}
                      className="group flex items-center gap-[var(--space-3)] rounded-[var(--radius-md)] border border-border bg-surface p-[var(--space-3)] transition-colors hover:border-primary"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-[length:var(--text-sm)] leading-[var(--leading-snug)] font-medium text-text">
                          {subtopic.name}
                        </p>
                        <p className="mt-[var(--space-1)] text-[length:var(--text-xs)] text-text-muted">
                          {done === 0
                            ? "Դեռ չսկսված"
                            : done === total
                              ? "Երեք մակարդակն էլ անցած են"
                              : `${done}/${total} մակարդակ անցած`}
                          {next && done > 0 ? " · շարունակիր" : ""}
                        </p>
                      </div>
                      <TierStatus scores={subtopic.tier_scores} className="shrink-0" />
                      <ChevronRight
                        size={16}
                        strokeWidth={1.75}
                        aria-hidden
                        className="shrink-0 text-text-muted transition-colors group-hover:text-primary"
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}

export function PracticeSubjectPage() {
  useStudyActivityTracker();

  const { subjectId } = useParams<{ subjectId: string }>();
  const id = Number(subjectId);
  const navigate = useNavigate();
  const location = useLocation();
  const navState = location.state as { subtopicId?: number; topicId?: number } | null;
  const [searchParams, setSearchParams] = useSearchParams();

  const fetchSubject = useCallback(
    async (): Promise<SubjectNode | null> => {
      const subjects = await getHierarchy();
      return subjects.find((s) => s.id === id) ?? null;
    },
    [id],
  );

  const { data: subject, isLoading, error, retry } = useAsyncResource(fetchSubject, [id]);

  const domainParam = searchParams.get("domain");
  const topicParam = searchParams.get("topic");
  const selectedDomain = subject && domainParam
    ? subject.domains.find((d) => String(d.id) === domainParam) ?? null
    : null;

  // Deep-link support for "topic" assignments (subtopic assignments go straight
  // to /practice/subtopic/:id — see lib/assignmentLabels.ts). Only runs from
  // nav state, so it never fights the student's own navigation.
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

  function selectDomain(domainId: number) {
    setSearchParams({ domain: String(domainId) });
  }

  function toggleTopic(topicId: number) {
    if (!selectedDomain) return;
    if (String(topicId) === topicParam) {
      setSearchParams({ domain: String(selectedDomain.id) });
    } else {
      setSearchParams({ domain: String(selectedDomain.id), topic: String(topicId) });
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-[var(--space-4)] py-[var(--space-8)]">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-[var(--space-3)] h-9 w-1/2" />
        <LoadingRegion className="mt-[var(--space-7)] flex flex-col gap-[var(--space-3)]">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="rounded-[var(--radius-lg)] border border-border bg-surface p-[var(--space-5)]">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="mt-[var(--space-2)] h-3.5 w-1/4" />
              <Skeleton className="mt-[var(--space-5)] h-1 w-full" />
            </div>
          ))}
        </LoadingRegion>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-[var(--space-4)] py-[var(--space-8)]">
        <PageHeader title="Պարապել" back={{ to: "/practice", label: "Առարկաներ" }} />
        <ErrorState
          title="Չհաջողվեց բեռնել առարկայի բովանդակությունը։"
          hint="Ստուգիր կապը և փորձիր կրկին։"
          onRetry={retry}
        />
      </div>
    );
  }

  if (!subject) {
    return (
      <div className="mx-auto max-w-4xl px-[var(--space-4)] py-[var(--space-8)]">
        <PageHeader title="Առարկան չի գտնվել" back={{ to: "/practice", label: "Առարկաներ" }} />
        <EmptyState
          title="Այս առարկան հասանելի չէ։"
          hint="Հնարավոր է հղումը հնացած է։"
          cta={{ label: "Բոլոր առարկաները", onClick: () => navigate("/practice") }}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-[var(--space-4)] py-[var(--space-8)]">
      {selectedDomain ? (
        <PageHeader
          eyebrow={subject.name}
          title={selectedDomain.name}
          description={`${selectedDomain.topics.length} թեմա։ Ընտրիր թեման՝ ենթաթեմաները տեսնելու համար։`}
          back={{ to: `/practice/${subject.id}`, label: "Բոլոր ոլորտները" }}
        />
      ) : (
        <PageHeader
          title={subject.name}
          description="Ընտրիր ոլորտը, ապա՝ թեման։"
          back={{ to: "/practice", label: "Առարկաներ" }}
        />
      )}

      {selectedDomain ? (
        <>
          <IntroPanel text={selectedDomain.intro_text} />
          {selectedDomain.topics.length === 0 ? (
            <EmptyState
              title="Այս ոլորտի թեմաները դեռ պատրաստ չեն։"
              hint="Նյութը ավելացվում է աստիճանաբար։"
            />
          ) : (
            <ul className="flex flex-col gap-[var(--space-3)]">
              {selectedDomain.topics.map((topic) => (
                <TopicRow
                  key={topic.id}
                  topic={topic}
                  expanded={String(topic.id) === topicParam}
                  onToggle={() => toggleTopic(topic.id)}
                />
              ))}
            </ul>
          )}
        </>
      ) : subject.domains.length === 0 ? (
        <EmptyState
          title="Այս առարկայի նյութը դեռ պատրաստ չէ։"
          hint="Նյութը ավելացվում է աստիճանաբար։"
        />
      ) : (
        <div className="grid gap-[var(--space-4)] sm:grid-cols-2">
          {subject.domains.map((domain) => (
            <DomainCard key={domain.id} domain={domain} onSelect={() => selectDomain(domain.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
