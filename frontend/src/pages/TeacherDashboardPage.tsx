import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import * as profileApi from "../api/profile";
import type { Profile } from "../api/profile";
import * as teachingApi from "../api/teaching";
import type { Assignment, AssignmentType } from "../api/teaching";
import { listMockExams } from "../api/mockExams";
import type { MockExamSummary } from "../api/mockExams";
import { getHierarchy } from "../api/practice";
import type { SubjectNode } from "../api/practice";
import { PersonBox } from "../components/PersonBox";
import { PublicProfileModal } from "../components/profile/PublicProfileModal";
import { TeachingModal } from "../components/teaching/TeachingModal";
import { MessageModal } from "../components/MessageModal";

const ASSIGNMENT_STATUS_LABELS: Record<Assignment["status"], string> = {
  assigned: "Հանձնարարված",
  in_progress: "Ընթացքի մեջ",
  completed: "Ավարտված",
};

function assignmentTargetLabel(a: Assignment): string {
  if (a.assignment_type === "mock_exam") return a.mock_exam?.title ?? "";
  if (a.assignment_type === "topic") return a.topic?.name ?? "";
  return a.subtopic?.name ?? "";
}

export function TeacherDashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [assignments, setAssignments] = useState<Assignment[] | null>(null);
  const [mockExams, setMockExams] = useState<MockExamSummary[] | null>(null);
  const [subjects, setSubjects] = useState<SubjectNode[] | null>(null);
  const [teachingOpen, setTeachingOpen] = useState(false);
  const [viewingUserId, setViewingUserId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [studentId, setStudentId] = useState("");
  const [assignmentType, setAssignmentType] = useState<AssignmentType>("subtopic");
  const [targetId, setTargetId] = useState("");
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function refreshProfile() {
    profileApi.fetchProfile().then(setProfile);
  }

  function refreshAssignments() {
    teachingApi.fetchAssignments().then(setAssignments);
  }

  useEffect(() => {
    refreshProfile();
    refreshAssignments();
    listMockExams().then(setMockExams);
    getHierarchy().then(setSubjects);
  }, []);

  function handleTeachingClose() {
    setTeachingOpen(false);
    refreshProfile();
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
      refreshAssignments();
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

  if (!profile) {
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
          <h2 className="mb-3 text-lg font-semibold text-text">
            Աշակերտներ {profile.total_students !== null ? `(${profile.total_students})` : ""}
          </h2>
          {profile.students && profile.students.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {profile.students.map((s) => (
                <PersonBox key={s.id} person={s} onClick={() => setViewingUserId(s.id)} />
              ))}
            </div>
          ) : (
            <p className="rounded-[var(--radius)] border border-border bg-surface p-5 text-text-muted">
              Դեռ կապակցված աշակերտներ չկան։ Օգտագործեք «Հրավիրել» կոճակը վերևում։
            </p>
          )}
        </section>

        <section className="mb-8 rounded-[var(--radius)] border border-border bg-surface p-6">
          <h2 className="mb-4 text-lg font-semibold text-text">Նոր առաջադրանք</h2>
          <form onSubmit={handleCreateAssignment} className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Աշակերտ</label>
              <select className={inputClass} value={studentId} onChange={(e) => setStudentId(e.target.value)}>
                <option value="">Ընտրեք աշակերտ</option>
                {profile.students?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {[s.first_name, s.last_name].filter(Boolean).join(" ") || s.username}
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

        <section>
          <h2 className="mb-3 text-lg font-semibold text-text">Իմ առաջադրանքները</h2>
          {assignments === null && <p className="text-text-muted">Բեռնվում է...</p>}
          {assignments?.length === 0 && (
            <p className="rounded-[var(--radius)] border border-border bg-surface p-5 text-text-muted">
              Առաջադրանքներ դեռ չկան։
            </p>
          )}
          <div className="flex flex-col gap-3">
            {assignments?.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-[var(--radius)] border border-border bg-surface p-4"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-text">{a.title}</p>
                  <p className="text-sm text-text-muted">
                    {[a.student.first_name, a.student.last_name].filter(Boolean).join(" ") || a.student.username}
                    {" · "}
                    {assignmentTargetLabel(a)}
                  </p>
                  {a.due_date && (
                    <p className="text-xs text-text-muted">
                      Վերջնաժամկետ՝ {new Date(a.due_date).toLocaleDateString("hy-AM")}
                    </p>
                  )}
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                    a.is_overdue
                      ? "bg-incorrect/10 text-incorrect"
                      : a.status === "completed"
                        ? "bg-primary/10 text-primary"
                        : "bg-surface-muted text-text-muted"
                  }`}
                >
                  {a.is_overdue ? "Ուշացած" : ASSIGNMENT_STATUS_LABELS[a.status]}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {error && <MessageModal message={error} onClose={() => setError(null)} />}
      {teachingOpen && (
        <TeachingModal role="teacher" onClose={handleTeachingClose} onChange={refreshProfile} />
      )}
      {viewingUserId !== null && (
        <PublicProfileModal userId={viewingUserId} onClose={() => setViewingUserId(null)} />
      )}
    </div>
  );
}