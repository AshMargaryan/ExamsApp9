import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import {
  listMockExams, getOverview, formatHoursMinutes,
  type MockExamSummary, type MockExamOverview,
} from "../api/mockExams";
import { ExamCard } from "../components/exams/ExamCard";
import { SubjectNav } from "../components/exams/SubjectNav";
import { StatTile } from "../components/ui/StatTile";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { PageHeader } from "../components/ui/PageHeader";
import { Select } from "../components/ui/Select";
import { LoadingRegion, Skeleton } from "../components/ui/Skeleton";
import { useAsyncResource } from "../hooks/useAsyncResource";
import { SUBJECTS, type SubjectKey } from "../lib/subjects";
import { extractExamNumber } from "../lib/examTitle";

type StatusFilter = "all" | "not_started" | "in_progress" | "completed";
type SortKey = "number" | "recent" | "best_score";

function examStatus(exam: MockExamSummary): "not_started" | "in_progress" | "completed" {
  if (exam.has_draft) return "in_progress";
  if (exam.completed_attempts_count > 0) return "completed";
  return "not_started";
}

export function MockExamsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const navState = location.state as { examId?: number } | null;
  const [searchParams] = useSearchParams();

  const [subject, setSubject] = useState<SubjectKey>(() => {
    const s = searchParams.get("subject");
    return SUBJECTS.some((x) => x.key === s) ? (s as SubjectKey) : "math";
  });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("number");

  const {
    data: allExams,
    isLoading: examsLoading,
    error: examsError,
    retry: retryExams,
  } = useAsyncResource<MockExamSummary[]>(listMockExams, []);

  // The overview is supporting detail, so it degrades on its own: a failed
  // stats call must not take the exam list down with it.
  const { data: overview } = useAsyncResource<MockExamOverview>(getOverview, []);

  function openExam(exam: MockExamSummary) {
    if (exam.has_draft && exam.draft_attempt_id) {
      navigate(`/mock-exams/attempt/${exam.draft_attempt_id}`);
    } else {
      navigate(`/mock-exams/${exam.id}`);
    }
  }

  // Deep-link from an assignment's "Կատարել" — find the assigned exam
  // (which may be in a different subject tab) and open it directly.
  useEffect(() => {
    if (!navState?.examId || !allExams) return;
    const exam = allExams.find((e) => e.id === navState.examId);
    if (!exam) return;
    setSubject(exam.subject);
    openExam(exam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navState?.examId, location.key, allExams]);

  const subjectExams = useMemo(
    () => allExams?.filter((e) => e.subject === subject) ?? null,
    [allExams, subject],
  );

  const visibleExams = useMemo(() => {
    if (!subjectExams) return null;
    let list = subjectExams;

    if (statusFilter !== "all") {
      list = list.filter((e) => examStatus(e) === statusFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((e) => e.title.toLowerCase().includes(q) || String(extractExamNumber(e.title)) === q);
    }

    const sorted = [...list];
    if (sortKey === "number") {
      sorted.sort((a, b) => (extractExamNumber(a.title) ?? 0) - (extractExamNumber(b.title) ?? 0));
    } else if (sortKey === "recent") {
      sorted.sort((a, b) => (b.last_attempt_at ? Date.parse(b.last_attempt_at) : 0) - (a.last_attempt_at ? Date.parse(a.last_attempt_at) : 0));
    } else if (sortKey === "best_score") {
      sorted.sort((a, b) => (b.best_scaled_score ?? -1) - (a.best_scaled_score ?? -1));
    }
    return sorted;
  }, [subjectExams, statusFilter, search, sortKey]);

  // An exam already in progress is the only thing on this page that is
  // time-sensitive, and it used to be indistinguishable from the other twenty
  // cards in the grid — the student had to find it. It gets its own band.
  const inProgress = useMemo(
    () => (allExams ?? []).filter((e) => e.has_draft && e.draft_attempt_id),
    [allExams],
  );

  return (
    <div className="mx-auto max-w-6xl px-[var(--space-4)] py-[var(--space-8)]">
      <PageHeader
        title="Ամբողջական թեստեր"
        description="Փորձիր քեզ իրական քննության պայմաններում։"
        back={{ to: "/", label: "Գլխավոր" }}
      />

      {inProgress.length > 0 && (
        <section className="mb-[var(--space-7)] rounded-[var(--radius-lg)] border border-primary-line bg-primary-bg p-[var(--space-5)]">
          <h2 className="font-display text-[length:var(--text-lg)] font-semibold text-text">
            {inProgress.length === 1 ? "Անավարտ թեստ" : "Անավարտ թեստեր"}
          </h2>
          <p className="mt-[var(--space-1)] text-[length:var(--text-sm)] text-text-muted">
            Շարունակիր այնտեղից, որտեղ կանգ առար։
          </p>
          <div className="mt-[var(--space-4)] grid grid-cols-1 gap-[var(--space-4)] sm:grid-cols-2 lg:grid-cols-3">
            {inProgress.map((exam) => (
              <ExamCard
                key={exam.id}
                exam={exam}
                primaryTo={`/mock-exams/attempt/${exam.draft_attempt_id}`}
                historyTo={exam.completed_attempts_count > 0 ? `/mock-exams/${exam.id}/history` : undefined}
              />
            ))}
          </div>
        </section>
      )}

      {overview && overview.completed_count > 0 && (
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Ավարտված թեստեր" value={String(overview.completed_count)} />
          <StatTile
            label="Միջին արդյունք"
            value={overview.average_scaled_score !== null ? `${overview.average_scaled_score} / 20` : "—"}
          />
          <StatTile
            label="Լավագույն արդյունք"
            value={overview.best_scaled_score !== null ? `${overview.best_scaled_score} / 20` : "—"}
          />
          <StatTile label="Ժամանակ" value={formatHoursMinutes(overview.total_time_seconds)} />
        </div>
      )}

      <SubjectNav exams={allExams} active={subject} onSelect={setSubject} />

      {/* The two native <select>s here rendered as OS widgets that ignored the
          app's font, radius and theme, and the search input overrode the
          global focus ring with a second, competing idiom. Both now use the
          kit. */}
      <div className="mb-[var(--space-6)] flex flex-col gap-[var(--space-3)] sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-xs">
          <Search
            size={16}
            strokeWidth={1.75}
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-[var(--space-3)] -translate-y-1/2 text-text-muted"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Փնտրել թեստ"
            placeholder="Փնտրել թեստ..."
            className="w-full rounded-[var(--radius-md)] border border-border bg-surface py-[var(--space-2)] pr-[var(--space-3)] pl-[var(--space-8)] text-[length:var(--text-sm)] text-text placeholder:text-text-muted"
          />
        </div>
        <div className="flex flex-wrap gap-[var(--space-2)]">
          <Select<StatusFilter>
            value={statusFilter}
            onChange={setStatusFilter}
            label="Վիճակ"
            options={[
              { value: "all", label: "Բոլորը" },
              { value: "not_started", label: "Չսկսված" },
              { value: "in_progress", label: "Ընթացքի մեջ" },
              { value: "completed", label: "Ավարտված" },
            ]}
          />
          <Select<SortKey>
            value={sortKey}
            onChange={setSortKey}
            label="Դասավորել"
            options={[
              { value: "number", label: "Թեստի համար" },
              { value: "recent", label: "Վերջին ակտիվություն" },
              { value: "best_score", label: "Լավագույն արդյունք" },
            ]}
          />
        </div>
      </div>

      {examsLoading ? (
        <LoadingRegion className="grid grid-cols-1 gap-[var(--space-4)] sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="rounded-[var(--radius-lg)] border border-border bg-surface p-[var(--space-5)]">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="mt-[var(--space-3)] h-6 w-3/4" />
              <Skeleton className="mt-[var(--space-6)] h-9 w-full" />
            </div>
          ))}
        </LoadingRegion>
      ) : examsError ? (
        <ErrorState
          title="Չհաջողվեց բեռնել թեստերը։"
          hint="Ստուգիր կապը և փորձիր կրկին։"
          onRetry={retryExams}
        />
      ) : !visibleExams ? null : visibleExams.length === 0 && !search && statusFilter === "all" ? (
        <EmptyState title="Այս առարկայի թեստերը շուտով կավելացվեն։" hint="Փորձիր մեկ այլ առարկա։" />
      ) : visibleExams.length === 0 ? (
        <EmptyState
          title="Ոչ մի թեստ չի համապատասխանում ընտրված զտիչներին։"
          hint="Փոխիր որոնումը կամ զտիչը։"
          cta={{
            label: "Մաքրել զտիչները",
            onClick: () => {
              setSearch("");
              setStatusFilter("all");
            },
          }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleExams.map((exam) => (
            <ExamCard
              key={exam.id}
              exam={exam}
              primaryTo={exam.has_draft && exam.draft_attempt_id
                ? `/mock-exams/attempt/${exam.draft_attempt_id}`
                : `/mock-exams/${exam.id}`}
              historyTo={exam.completed_attempts_count > 0 ? `/mock-exams/${exam.id}/history` : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
