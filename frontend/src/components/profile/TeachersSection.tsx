import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GraduationCap, Users } from "lucide-react";
import type { Profile } from "../../api/profile";
import { PersonBox } from "../PersonBox";
import { TeachingModal } from "../teaching/TeachingModal";

export function TeachersSection({ profile, onProfileChange }: { profile: Profile; onProfileChange: () => void }) {
  const navigate = useNavigate();
  const [teachingOpen, setTeachingOpen] = useState(false);

  const isTeacher = profile.role === "teacher";
  const people = isTeacher ? profile.students : profile.teachers;
  const count = isTeacher ? profile.total_students ?? 0 : profile.teachers?.length ?? 0;
  const title = isTeacher ? "Աշակերտներ" : "Ուսուցիչներ";
  const icon = isTeacher ? <Users size={20} strokeWidth={1.75} /> : <GraduationCap size={20} strokeWidth={1.75} />;
  const emptyText = isTeacher ? "Դեռ կապակցված աշակերտներ չկան։" : "Դեռ կապակցված ուսուցիչներ չկան։";

  function handleTeachingClose() {
    setTeachingOpen(false);
    onProfileChange();
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ backgroundImage: "linear-gradient(135deg, var(--color-primary), var(--color-accent))" }}
      >
        <div className="flex items-center gap-2 text-white">
          <span className="text-xl">{icon}</span>
          <div>
            <p className="text-sm font-bold leading-tight">{title}</p>
            <p className="text-xs leading-tight text-white/75">{count} {isTeacher ? "աշակերտ" : "ուսուցիչ"}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setTeachingOpen(true)}
          className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md transition-colors hover:bg-white/25"
        >
          {isTeacher ? "Հրավիրել" : "Հրավերներ"}
        </button>
      </div>

      <div className="p-5">
        {people && people.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {people.map((p) => (
              <PersonBox key={p.id} person={p} onClick={() => navigate(`/profile/${p.id}`)} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-muted">{emptyText}</p>
        )}
      </div>

      {teachingOpen && <TeachingModal role={profile.role} onClose={handleTeachingClose} onChange={onProfileChange} />}
    </div>
  );
}
