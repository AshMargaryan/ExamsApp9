import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import * as teachingApi from "../api/teaching";
import type { AssignmentType, StudentRosterEntry } from "../api/teaching";
import { listMockExams } from "../api/mockExams";
import type { MockExamSummary } from "../api/mockExams";
import { getHierarchy } from "../api/practice";
import type { SubjectNode } from "../api/practice";
import { StudentReviewPanel } from "../components/teaching/StudentReviewPanel";
import { TeachingModal } from "../components/teaching/TeachingModal";
import { MessageModal } from "../components/MessageModal";

function StudentBox({ entry, onClick }: { entry: StudentRosterEntry; onClick: () => void }) {
  const { student, has_pending_review } = entry;
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex flex-col items-center gap-2 rounded-[var(--radius)] border border-border bg-surface p-4 text-center transition-colors hover:border-primary"
    >
      {has_pending_review && (
        <span
          title="Աշակերտն ուղարկել է առաջադրանք՝ սպասում է հաստատման"
          className="absolute right-2 top-2 h-3 w-3 rounded-full bg-primary"
        />
      )}
      <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-muted text-lg font-semibold text-text-muted">
        {student.avatar ? (
          <img src={student.avatar} alt={student.username} className="h-full w-full object-cover" />
        ) : (
          (student.first_name || student.username).slice(0, 1).toUpperCase()
        )}
      </span>
      <span className="text-sm font-medium text-text">
        {[student.first_name, student.last_name].filter(Boolean).join(" ") || student.username}
      </span>
      <span className="text-xs text-text-muted">@{student.username}</span>
    </button>
  );
}

export function TeacherDashboardPage() {
  const [roster, setRoster] = useState<StudentRosterEntry[] | null>(null);
  const [mockExams, setMockExams] = useState<MockExamSummary[] | null>(null);
  const [subjects, setSubjects] = useState<SubjectNode[] | null>(null);
  const [teachingOpen, setTeachingOpen] = useState(false);
  const [viewingStudentId, setViewingStudentId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [studentId, setStudentId] = useState("");
  const [assignmentType, setAssignmentType] = useState<AssignmentType>("subtopic");
  const [targetId, setTargetId] = useState("");
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function refreshRoster() {
    teachingApi.fetchStudentRoster().then(setRoster);
  }

  useEffect(() => {
    refreshRoster();
    listMockExams().then(setMockExams);
    getHierarchy().then(setSubjects);
  }, []);

  function handleTeachingClose() {
    setTeachingOpen(false);
    refreshRoster();
  }

  function handleReviewPanelClose() {
    setViewingStudentId(null);
    refreshRoster();
  }

  const subtopicOptions =
    subjects?.flatMap((s) =>
      s.domains.flatMap((d) =>
        d.topics.flatMap((t) =>
          t.subtopics.map((sub) => ({
            id: sub.id,
            label: `${d.name} / ${t.name} / ${sub.name}`,
          })),
        ),
      ),
    ) ?? [];

  const topicOptions =
    subjects?.flatMap((s) =>
      s.domains.flatMap((d) => d.topics.map((t) => ({ id: t.id, label: `${d.name} / ${t.name}` }))),
    ) ?? [];

  async function handleCreateAssignment(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!studentId || !targetId || !title.trim()) {
      setError("Խնդրում ենք լրացնել բոլոր պարտադիր դաշտերը։");
      return;
    }
    setSubmitting(true);
    try {
      await teachingApi.createAssignment({
        student_id: Number(studentId),
        assignment_type: assignmentType,
        mock_exam_id: assignmentType === "mock_exam" ? Number(targetId) : undefined,
        topic_id: assignmentType === "topic" ? Number(targetId) : undefined,
        subtopic_id: assignmentType === "subtopic" ? Number(targetId) : undefined,
        title,
        instructions,
        due_date: dueDate ? new Date(dueDate).toISOString() : undefined,
      });
      setTargetId("");
      setTitle("");
      setInstructions("");
      setDueDate("");
    } catch (err) {
      const detail =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : undefined;
      setError(detail ?? "Առաջադրանքը ստեղծելիս սխալ տեղի ունեցավ։");
    } finally {
      setSubmitting(false);
    }
  }

  if (!roster) {
    return <div className="p-8 text-lg text-text-muted">Բեռնվում է...</div>;
  }

  const inputClass =
    "w-full rounded-md border border-border bg-bg px-3 py-2 text-text outline-none focus:border-primary";
  const labelClass = "mb-1 block text-sm text-text-muted";
  const targetOptions =
    assignmentType === "mock_exam"
      ? (mockExams ?? []).map((m) => ({ id: m.id, label: m.title }))
      : assignmentType === "topic"
        ? topicOptions
        : subtopicOptions;

  return (
    <div className="min-h-screen bg-bg px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/" className="text-sm text-primary hover:underline">
            ← Գլխավոր
          </Link>
          <h1 className="text-xl font-semibold text-text">Ուսուցչի վահանակ</h1>
          <button
            type="button"
            onClick={() => setTeachingOpen(true)}
            className="rounded-md border border-primary px-4 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-surface-muted"
          >
            Հրավիրել / Հրավերներ
          </button>
        </div>

        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-text">Աշակերտներ {`(${roster.length})`}</h2>
          {roster.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {roster.map((entry) => (
                <StudentBox
                  key={entry.student.id}
                  entry={entry}
                  onClick={() => setViewingStudentId(entry.student.id)}
                />
              ))}
            </div>
          ) : (
            <p className="rounded-[var(--radius)] border border-border bg-surface p-5 text-text-muted">
              Դեռ կապակցված աշակերտներ չկան։ Օգտագործեք «Հրավիրել» կոճակը վերևում։
            </p>
          )}
        </section>

        <section className="rounded-[var(--radius)] border border-border bg-surface p-6">
          <h2 className="mb-4 text-lg font-semibold text-text">Նոր առաջադրանք</h2>
          <form onSubmit={handleCreateAssignment} className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Աշակերտ</label>
              <select className={inputClass} value={studentId} onChange={(e) => setStudentId(e.target.value)}>
                <option value="">Ընտրեք աշակերտ</option>
                {roster.map((entry) => (
                  <option key={entry.student.id} value={entry.student.id}>
                    {[entry.student.first_name, entry.student.last_name].filter(Boolean).join(" ") ||
                      entry.student.username}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Տեսակ</label>
              <select
                className={inputClass}
                value={assignmentType}
                onChange={(e) => {
                  setAssignmentType(e.target.value as AssignmentType);
                  setTargetId("");
                }}
              >
                <option value="subtopic">Ենթաթեմա</option>
                <option value="topic">Թեմա</option>
                <option value="mock_exam">Ամբողջական թեստ</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>
                {assignmentType === "mock_exam" ? "Թեստ" : assignmentType === "topic" ? "Թեմա" : "Ենթաթեմա"}
              </label>
              <select className={inputClass} value={targetId} onChange={(e) => setTargetId(e.target.value)}>
                <option value="">Ընտրեք</option>
                {targetOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Վերնագիր</label>
              <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Հրահանգներ</label>
              <textarea
                className={`${inputClass} min-h-20 resize-y`}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Վերջնաժամկետ</label>
              <input
                type="date"
                className={inputClass}
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="flex items-end sm:col-span-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-md bg-primary px-6 py-2 font-medium text-primary-contrast transition-colors hover:bg-primary-hover disabled:opacity-60"
              >
                {submitting ? "..." : "Հանձնարարել"}
              </button>
            </div>
          </form>
        </section>
      </div>

      {error && <MessageModal message={error} onClose={() => setError(null)} />}
      {teachingOpen && (
        <TeachingModal role="teacher" onClose={handleTeachingClose} onChange={refreshRoster} />
      )}
      {viewingStudentId !== null && (
        <StudentReviewPanel studentId={viewingStudentId} onClose={handleReviewPanelClose} />
      )}
    </div>
  );
}