import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { getHierarchy, type SubjectNode } from "../api/practice";
import { useAsyncResource } from "../hooks/useAsyncResource";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { PageHeader } from "../components/ui/PageHeader";
import { ProgressBar } from "../components/ui/ProgressBar";
import { LoadingRegion, Skeleton } from "../components/ui/Skeleton";

type NavState = { subtopicId?: number; topicId?: number } | null;

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

  return (
    <Link
      to={`/practice/${subject.id}`}
      className="group flex flex-col rounded-[var(--radius-lg)] border border-border bg-surface p-[var(--space-5)] transition-colors hover:border-primary"
    >
      <div className="flex items-start justify-between gap-[var(--space-4)]">
        <div className="min-w-0">
          <h2 className="text-[length:var(--text-xl)] leading-[var(--leading-heading)] font-semibold text-text">
            {subject.name}
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

      <div className="mt-[var(--space-5)]">
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
    </Link>
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

  return (
    <div className="mx-auto max-w-4xl px-[var(--space-4)] py-[var(--space-8)]">
      <PageHeader
        title="Պարապել"
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
        <div className="grid gap-[var(--space-4)] sm:grid-cols-2">
          {subjects.map((subject) => (
            <SubjectCard key={subject.id} subject={subject} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Դեռ ոչ մի առարկա հասանելի չէ։"
          hint="Նյութերը ավելացվում են աստիճանաբար։ Այս ընթացքում փորձիր ամբողջական թեստերը։"
        />
      )}
    </div>
  );
}
