import { useState } from "react";
import type { Profile } from "../../api/profile";
import { PersonBox } from "../PersonBox";
import { SectionHeader } from "../ui/SectionHeader";
import { TeachingModal } from "../teaching/TeachingModal";
import { PublicProfileModal } from "./PublicProfileModal";

export function TeachersSection({ profile, onProfileChange }: { profile: Profile; onProfileChange: () => void }) {
  const [teachingOpen, setTeachingOpen] = useState(false);
  const [viewingUserId, setViewingUserId] = useState<number | null>(null);

  const isTeacher = profile.role === "teacher";
  const people = isTeacher ? profile.students : profile.teachers;
  const title = isTeacher ? `Աշակերտներ ${profile.total_students !== null ? `(${profile.total_students})` : ""}` : `Ուսուցիչներ ${profile.teachers ? `(${profile.teachers.length})` : ""}`;
  const emptyText = isTeacher ? "Դեռ կապակցված աշակերտներ չկան։" : "Դեռ կապակցված ուսուցիչներ չկան։";

  function handleTeachingClose() {
    setTeachingOpen(false);
    onProfileChange();
  }

  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-5">
      <SectionHeader
        title={title}
        action={
          <button
            type="button"
            onClick={() => setTeachingOpen(true)}
            className="rounded-md border border-primary px-3 py-1 text-sm font-medium text-primary transition-colors hover:bg-surface-muted"
          >
            {isTeacher ? "Հրավիրել / Հրավերներ" : "Հրավերներ"}
          </button>
        }
      />
      {people && people.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {people.map((p) => (
            <PersonBox key={p.id} person={p} onClick={() => setViewingUserId(p.id)} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-text-muted">{emptyText}</p>
      )}

      {teachingOpen && <TeachingModal role={profile.role} onClose={handleTeachingClose} onChange={onProfileChange} />}
      {viewingUserId !== null && <PublicProfileModal userId={viewingUserId} onClose={() => setViewingUserId(null)} />}
    </div>
  );
}
