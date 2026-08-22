import { useEffect, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronRight, ClipboardCheck, Layers } from "lucide-react";
import { getHierarchy, type SubjectNode } from "../api/practice";
import { useAsyncResource } from "../hooks/useAsyncResource";
import { SUBJECTS, subjectMetaForName } from "../lib/subjects";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { PageHeader } from "../components/ui/PageHeader";
import { ProgressBar } from "../components/ui/ProgressBar";
import { LoadingRegion, Skeleton } from "../components/ui/Skeleton";

type NavState = { subtopicId?: number; topicId?: number } | null;

/*
  The product's subject picker — one of them, now.

  There used to be two, and the navigation pointed at the wrong one. Every
  "subjects" entry point in the app — the sidebar item, the mobile tab bar, the
  mission hero's fallback, the study plan's empty-state CTA, the learning
  profile's mastery panel — went to `/subjects`, a full-screen scrolling
  "universe": nine viewport-height panels of orbiting equations and portraits,
  on a hardcoded `#05050a` ground that ignored the theme, set in Spectral and
  Work Sans, neither of which has Armenian glyphs.

  Three things were wrong with that beyond the visuals:

  1. It is a *study* destination that showed no study information. No progress,
     no size, no "what is left" — nothing to choose between subjects with.
  2. Six of its nine panels had no practice content behind them and opened a
     "coming soon" dialog, so the main study destination in the navigation was
     two-thirds dead ends.
  3. Reaching a question meant subjects → subject hub (a four-tile menu) →
     subject navigator → topic → subtopic. This page already existed, showed
     real progress, and was one screen shorter — and nothing in the navigation
     linked to it.

  So this component now answers both routes, the universe is retired, and the
  hub's other two destinations (that subject's mock exams and flashcards) move
  onto the card as secondary links. Same capabilities, two fewer screens.
*/

// Resolves an assignment deep-link (state carrying a subtopicId/topicId with
// no known subject) to the subject that owns it, then redirects into
// /practice/:subjectId. Runs before the subject-picker grid renders.
function findOwningSubjectId(subjects: SubjectNode[], navState: NavState): number | null {
  if (!navState || (!navState.subtopicId && !navState.topicId)) return null;
  for (const subject of subjects) {
    for (const domain of subject.domains) {
      for (const topic of domain.topics) {
        if (navState.topicId === topic.id) return subject.id;
        if (topic.subtopics.some((s) => s.id === navState.subtopicId)) return subject.id;
      }
    }
  }
  return null;
}

function countSubtopics(subject: SubjectNode): number {
  return subject.domains.reduce(
    (sum, d) => sum + d.topics.reduce((s, t) => s + t.subtopics.length, 0),
    0,
  );
}

/*
  A subject card's job is to support one choice: which subject do I open now.
  It previously showed only a name and a 32px "battery" reading "2.4%", so
  every card looked the same and none of them said what was inside. It now
  carries the two facts that actually separate the options — how much of the
  subject is left, and how large it is.
*/
function SubjectCard({ subject }: { subject: SubjectNode }) {
  const percent = subject.progress.percent;
  const avg = subject.progress.avg_score;
  const subtopics = countSubtopics(subject);
  const started = percent > 0;
  // The hierarchy stores the Armenian display name; the other two surfaces
  // filter by subject *key*, so the card can only offer them when the name
  // maps to one.
  const meta = subjectMetaForName(subject.name);

  return (
    // `relative` + a stretched link on the title, rather than a `<Link>`
    // wrapping the card: the card needs two more links inside it, and an
    // anchor inside an anchor is invalid and unpredictable in every browser.
    <div className="group relative flex flex-col rounded-[var(--radius-lg)] border border-border bg-surface p-[var(--space-5)] transition-colors focus-within:border-primary hover:border-primary">
      <div className="flex items-start justify-between gap-[var(--space-4)]">
        <div className="min-w-0">
          <h2 className="text-[length:var(--text-xl)] leading-[var(--leading-heading)] font-semibold text-text">
            <Link to={`/practice/${subject.id}`} className="after:absolute after:inset-0 after:content-['']">
              {subject.name}
            </Link>
          </h2>
          <p className="mt-[var(--space-1)] text-[length:var(--text-sm)] text-text-muted">
            {subject.domains.length} ոլորտ · {subtopics} ենթաթեմա
          </p>
        </div>
        <ChevronRight
          size={20}
          strokeWidth={1.75}
          className="mt-1 shrink-0 text-text-muted transition-colors group-hover:text-primary"
          aria-hidden
        />
      </div>

      <div className="mt-[var(--space-5)] mb-[var(--space-5)]">
        <div className="mb-[var(--space-2)] flex items-baseline justify-between gap-[var(--space-3)]">
          <span className="text-[length:var(--text-sm)] text-text-muted">
            {started ? "Անցած նյութ" : "Դեռ չսկսված"}
          </span>
          <span className="text-[length:var(--text-sm)] font-semibold text-text">{percent}%</span>
        </div>
        <ProgressBar percent={percent} label={`${subject.name}՝ ${percent}%`} />
        {avg !== null && (
          <p className="mt-[var(--space-2)] text-[length:var(--text-xs)] text-text-muted">
            Միջին միավորը՝ {avg}%
          </p>
        )}
      </div>

      {/* The two other ways into this subject, absorbed from the four-tile hub
          page that used to sit between the picker and the practice tree. They
          are secondary — small, unfilled, and below the progress — because the
          card's own answer to "what do I do here" is practice. */}
      {meta && (
        <div className="relative z-10 mt-auto flex flex-wrap gap-[var(--space-2)] border-t border-border pt-[var(--space-4)]">
          <Link
            to={`/mock-exams?subject=${meta.key}`}
            className="inline-flex items-center gap-[var(--space-2)] rounded-[var(--radius-full)] border border-border px-[var(--space-3)] py-[var(--space-1)] text-[length:var(--text-xs)] font-medium text-text-muted transition-colors hover:border-primary hover:text-text"
          >
            <ClipboardCheck size={13} strokeWidth={1.75} aria-hidden />
            Ամբողջական թեստ
          </Link>
          <Link
            to={`/flashcards?subject=${meta.key}`}
            className="inline-flex items-center gap-[var(--space-2)] rounded-[var(--radius-full)] border border-border px-[var(--space-3)] py-[var(--space-1)] text-[length:var(--text-xs)] font-medium text-text-muted transition-colors hover:border-primary hover:text-text"
          >
            <Layers size={13} strokeWidth={1.75} aria-hidden />
            Բառաքարտեր
          </Link>
        </div>
      )}
    </div>
  );
}

export function PracticeSubjectsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const navState = location.state as NavState;

  const { data: subjects, isLoading, error, retry } = useAsyncResource(getHierarchy, []);

  useEffect(() => {
    if (!subjects) return;
    const subjectId = findOwningSubjectId(subjects, navState);
    if (subjectId !== null) {
      navigate(`/practice/${subjectId}`, { state: navState, replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjects, location.key]);

  // One quiet line instead of six full-screen panels that opened a "coming
  // soon" dialog. A student should be able to see what is on the way without
  // being invited to click into it six times.
  const upcoming = useMemo(() => {
    if (!subjects) return [];
    const present = new Set(subjects.map((s) => subjectMetaForName(s.name)?.key).filter(Boolean));
    return SUBJECTS.filter((s) => !present.has(s.key)).map((s) => s.label);
  }, [subjects]);

  return (
    <div className="mx-auto max-w-4xl px-[var(--space-4)] py-[var(--space-8)]">
      <PageHeader
        title="Առարկաներ"
        description="Ընտրիր առարկան, ապա՝ թեման։ Յուրաքանչյուր ենթաթեմա ունի երեք մակարդակ։"
        back={{ to: "/", label: "Գլխավոր" }}
      />

      {isLoading ? (
        <LoadingRegion className="grid gap-[var(--space-4)] sm:grid-cols-2">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="rounded-[var(--radius-lg)] border border-border bg-surface p-[var(--space-5)]">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="mt-[var(--space-2)] h-3.5 w-2/3" />
              <Skeleton className="mt-[var(--space-6)] h-1.5 w-full" />
              <Skeleton className="mt-[var(--space-6)] h-6 w-2/3 rounded-[var(--radius-full)]" />
            </div>
          ))}
        </LoadingRegion>
      ) : error ? (
        <ErrorState
          title="Չհաջողվեց բեռնել առարկաները։"
          hint="Ստուգիր կապը և փորձիր կրկին։"
          onRetry={retry}
        />
      ) : subjects && subjects.length > 0 ? (
        <>
          <div className="grid gap-[var(--space-4)] sm:grid-cols-2">
            {subjects.map((subject) => (
              <SubjectCard key={subject.id} subject={subject} />
            ))}
          </div>

          {upcoming.length > 0 && (
            <p className="mt-[var(--space-6)] text-[length:var(--text-sm)] text-text-muted">
              Պատրաստվում են՝ {upcoming.join(", ")}։
            </p>
          )}
        </>
      ) : (
        <EmptyState
          title="Դեռ ոչ մի առարկա հասանելի չէ։"
          hint="Նյութերը ավելացվում են աստիճանաբար։ Այս ընթացքում փորձիր ամբողջական թեստերը։"
        />
      )}
    </div>
  );
}
