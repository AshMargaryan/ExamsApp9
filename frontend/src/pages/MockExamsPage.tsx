import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  listMockExams, getOverview, formatHoursMinutes,
  type MockExamSummary, type MockExamOverview,
} from "../api/mockExams";
import { ExamCard } from "../components/exams/ExamCard";
import { SubjectNav } from "../components/exams/SubjectNav";
import { StatTile } from "../components/ui/StatTile";
import { EmptyState } from "../components/ui/EmptyState";
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
  const [allExams, setAllExams] = useState<MockExamSummary[] | null>(null);
  const [overview, setOverview] = useState<MockExamOverview | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("number");

  useEffect(() => {
    listMockExams().then(setAllExams);
    getOverview().then(setOverview);
  }, []);

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

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link to="/" className="mb-4 inline-block text-sm text-primary hover:underline">
        ← Գլխավոր
      </Link>
      <div className="mt-10 sm:mt-0">
        <h1 className="mb-1 text-2xl font-semibold text-text sm:text-3xl">📝 Ամբողջական թեստեր</h1>
        <p className="mb-6 text-text-muted">Փորձիր քեզ իրական քննության պայմաններում</p>
      </div>

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

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Փնտրել թեստ..."
          className="w-full max-w-xs rounded-[var(--radius)] border border-border bg-surface px-4 py-2 text-sm text-text placeholder:text-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
        <div className="flex flex-wrap gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="rounded-[var(--radius)] border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <option value="all">Բոլորը</option>
            <option value="not_started">Չսկսված</option>
            <option value="in_progress">Ընթացքի մեջ</option>
            <option value="completed">Ավարտված</option>
          </select>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="rounded-[var(--radius)] border border-border bg-surface px-3 py-2 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <option value="number">Թեստի համար</option>
            <option value="recent">Վերջին ակտիվություն</option>
            <option value="best_score">Լավագույն արդյունք</option>
          </select>
        </div>
      </div>

      {!visibleExams ? (
        <div className="text-lg text-text-muted">Բեռնվում է...</div>
      ) : visibleExams.length === 0 && !search && statusFilter === "all" ? (
        <EmptyState icon="📝" title="Այս առարկայի թեստերը շուտով կավելացվեն։" />
      ) : visibleExams.length === 0 ? (
        <EmptyState icon="🔍" title="Ոչ մի թեստ չի համապատասխանում ընտրված զտիչներին։" />
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
