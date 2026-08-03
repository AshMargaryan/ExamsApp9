import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import * as profileApi from "../api/profile";
import type { Profile } from "../api/profile";
import * as teachingApi from "../api/teaching";
import type { Assignment } from "../api/teaching";
import { PersonBox } from "../components/PersonBox";
import { PublicProfileModal } from "../components/profile/PublicProfileModal";
import { TeachingModal } from "../components/teaching/TeachingModal";

function assignmentTargetLabel(a: Assignment): string {
  if (a.assignment_type === "mock_exam") return a.mock_exam?.title ?? "";
  if (a.assignment_type === "topic") return a.topic?.name ?? "";
  return a.subtopic?.name ?? "";
}

function assignmentLink(a: Assignment): string {
  return a.assignment_type === "mock_exam" ? "/mock-exams" : "/practice";
}

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
  );
}

function AssignmentCard({
  assignment,
  onStart,
  onComplete,
}: {
  assignment: Assignment;
  onStart: (id: number) => void;
  onComplete: (id: number) => void;
}) {
  const teacherName =
    [assignment.teacher.first_name, assignment.teacher.last_name].filter(Boolean).join(" ") ||
    assignment.teacher.username;

  return (
    <div className="flex items-center justify-between gap-4 rounded-[var(--radius)] border border-border bg-surface p-4">
      <div className="min-w-0">
        <p className="truncate font-medium text-text">{assignment.title}</p>
        <p className="text-sm text-text-muted">
          {teacherName} · {assignmentTargetLabel(assignment)}
        </p>
        {assignment.instructions && (
          <p className="mt-1 text-sm text-text-muted">{assignment.instructions}</p>
        )}
        {assignment.due_date && (
          <p className="text-xs text-text-muted">
            Վերջնաժամկետ՝ {new Date(assignment.due_date).toLocaleDateString("hy-AM")}
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            assignment.is_overdue
              ? "bg-incorrect/10 text-incorrect"
              : assignment.status === "completed"
                ? "bg-primary/10 text-primary"
                : "bg-surface-muted text-text-muted"
          }`}
        >
          {assignment.is_overdue
            ? "Ուշացած"
            : assignment.status === "assigned"
              ? "Հանձնարարված"
              : assignment.status === "in_progress"
                ? "Ընթացքի մեջ"
                : "Ավարտված"}
        </span>
        {assignment.status !== "completed" && (
          <div className="flex gap-2">
            <Link
              to={assignmentLink(assignment)}
              onClick={() => assignment.status === "assigned" && onStart(assignment.id)}
              className="text-sm text-primary hover:underline"
            >
              Բացել
            </Link>
            <button
              type="button"
              onClick={() => onComplete(assignment.id)}
              className="text-sm text-text-muted hover:underline"
            >
              Նշել ավարտված
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function StudentDashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [assignments, setAssignments] = useState<Assignment[] | null>(null);
  const [teachingOpen, setTeachingOpen] = useState(false);
  const [viewingUserId, setViewingUserId] = useState<number | null>(null);

  function refreshProfile() {
    profileApi.fetchProfile().then(setProfile);
  }

  function refreshAssignments() {
    teachingApi.fetchAssignments().then(setAssignments);
  }

  useEffect(() => {
    refreshProfile();
    refreshAssignments();
  }, []);

  function handleTeachingClose() {
    setTeachingOpen(false);
    refreshProfile();
  }

  async function handleStart(id: number) {
    await teachingApi.updateAssignmentStatus(id, "in_progress");
    refreshAssignments();
  }

  async function handleComplete(id: number) {
    await teachingApi.updateAssignmentStatus(id, "completed");
    refreshAssignments();
  }

  if (!profile) {
    return <div className="p-8 text-lg text-text-muted">Բեռնվում է...</div>;
  }

  const active = assignments ?? [];
  const overdue = active.filter((a) => a.is_overdue);
  const completed = active.filter((a) => a.status === "completed");
  const today = active.filter(
    (a) => !a.is_overdue && a.status !== "completed" && a.due_date && isToday(a.due_date),
  );
  const todayIds = new Set(today.map((a) => a.id));
  const overdueIds = new Set(overdue.map((a) => a.id));
  const upcoming = active.filter(
    (a) => a.status !== "completed" && !overdueIds.has(a.id) && !todayIds.has(a.id),
  );

  return (
    <div className="min-h-screen bg-bg px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/" className="text-sm text-primary hover:underline">
            ← Գլխավոր
          </Link>
          <h1 className="text-xl font-semibold text-text">Աշակերտի վահանակ</h1>
          <button
            type="button"
            onClick={() => setTeachingOpen(true)}
            className="rounded-md border border-primary px-4 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-surface-muted"
          >
            Հրավերներ
          </button>
        </div>

        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-text">Այսօրվա առաջադրանքները</h2>
          {today.length === 0 ? (
            <p className="rounded-[var(--radius)] border border-border bg-surface p-5 text-text-muted">
              Այսօրվա համար առաջադրանքներ չկան։
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {today.map((a) => (
                <AssignmentCard key={a.id} assignment={a} onStart={handleStart} onComplete={handleComplete} />
              ))}
            </div>
          )}
        </section>

        {overdue.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-lg font-semibold text-incorrect">Ուշացած առաջադրանքներ</h2>
            <div className="flex flex-col gap-3">
              {overdue.map((a) => (
                <AssignmentCard key={a.id} assignment={a} onStart={handleStart} onComplete={handleComplete} />
              ))}
            </div>
          </section>
        )}

        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-text">Առաջադրանքներ</h2>
          {assignments === null && <p className="text-text-muted">Բեռնվում է...</p>}
          {assignments !== null && upcoming.length === 0 && (
            <p className="rounded-[var(--radius)] border border-border bg-surface p-5 text-text-muted">
              Այլ ընթացիկ առաջադրանքներ չկան։
            </p>
          )}
          <div className="flex flex-col gap-3">
            {upcoming.map((a) => (
              <AssignmentCard key={a.id} assignment={a} onStart={handleStart} onComplete={handleComplete} />
            ))}
          </div>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-text">
            Ավարտված առաջադրանքներ {completed.length > 0 ? `(${completed.length})` : ""}
          </h2>
          {completed.length === 0 ? (
            <p className="rounded-[var(--radius)] border border-border bg-surface p-5 text-text-muted">
              Ավարտված առաջադրանքներ դեռ չկան։
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {completed.map((a) => (
                <AssignmentCard key={a.id} assignment={a} onStart={handleStart} onComplete={handleComplete} />
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-text">
            Ուսուցիչներ {profile.teachers !== null ? `(${profile.teachers.length})` : ""}
          </h2>
          {profile.teachers && profile.teachers.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {profile.teachers.map((t) => (
                <PersonBox key={t.id} person={t} onClick={() => setViewingUserId(t.id)} />
              ))}
            </div>
          ) : (
            <p className="rounded-[var(--radius)] border border-border bg-surface p-5 text-text-muted">
              Դեռ կապակցված ուսուցիչներ չկան։ Ուսուցչի հրավերները հայտնվում են «Հրավերներ» կոճակի տակ։
            </p>
          )}
        </section>
      </div>

      {teachingOpen && (
        <TeachingModal role="student" onClose={handleTeachingClose} onChange={refreshProfile} />
      )}
      {viewingUserId !== null && (
        <PublicProfileModal userId={viewingUserId} onClose={() => setViewingUserId(null)} />
      )}
    </div>
  );
}