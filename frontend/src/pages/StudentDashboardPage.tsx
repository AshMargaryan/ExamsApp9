import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import * as profileApi from "../api/profile";
import type { Profile } from "../api/profile";
import * as teachingApi from "../api/teaching";
import type { Assignment } from "../api/teaching";
import { PersonBox } from "../components/PersonBox";
import { PublicProfileModal } from "../components/profile/PublicProfileModal";
import { TeachingModal } from "../components/teaching/TeachingModal";
import { AssignmentCard } from "../components/teaching/AssignmentCard";

export function StudentDashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [assignments, setAssignments] = useState<Assignment[] | null>(null);
  const [teachingOpen, setTeachingOpen] = useState(false);
  const [viewingUserId, setViewingUserId] = useState<number | null>(null);

  function refreshProfile() {
    profileApi.fetchProfile().then(setProfile);
  }

  function refreshAssignments() {
    teachingApi.fetchAssignments().then((list) => {
      setAssignments(list);
      list.filter((a) => !a.seen_by_student).forEach((a) => teachingApi.markAssignmentSeen(a.id));
    });
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
    await teachingApi.startAssignment(id);
    refreshAssignments();
  }

  if (!profile) {
    return <div className="p-8 text-lg text-text-muted">Բեռնվում է...</div>;
  }

  const active = assignments ?? [];
  const overdue = active.filter((a) => a.is_overdue);
  const completed = active.filter((a) => a.status === "completed");
  const overdueIds = new Set(overdue.map((a) => a.id));
  const upcoming = active.filter((a) => a.status !== "completed" && !overdueIds.has(a.id));

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

        {overdue.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 text-lg font-semibold text-incorrect">Ուշացած առաջադրանքներ</h2>
            <div className="flex flex-col gap-3">
              {overdue.map((a) => (
                <AssignmentCard key={a.id} assignment={a} onStart={handleStart} onRefresh={refreshAssignments} />
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
              <AssignmentCard key={a.id} assignment={a} onStart={handleStart} onRefresh={refreshAssignments} />
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
                <AssignmentCard key={a.id} assignment={a} onStart={handleStart} onRefresh={refreshAssignments} />
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