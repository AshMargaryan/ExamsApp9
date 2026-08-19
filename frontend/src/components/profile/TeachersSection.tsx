import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GraduationCap, Users } from "lucide-react";
import type { Profile } from "../../api/profile";
import { PersonBox } from "../PersonBox";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { TeachingModal } from "../teaching/TeachingModal";
import { ProfileCard } from "./ProfileCard";

export function TeachersSection({ profile, onProfileChange }: { profile: Profile; onProfileChange: () => void }) {
  const navigate = useNavigate();
  const [teachingOpen, setTeachingOpen] = useState(false);

  const isTeacher = profile.role === "teacher";
  const people = isTeacher ? profile.students : profile.teachers;
  const count = isTeacher ? profile.total_students ?? 0 : profile.teachers?.length ?? 0;
  const title = isTeacher ? "Աշակերտներ" : "Ուսուցիչներ";
  const Icon = isTeacher ? Users : GraduationCap;
  const emptyText = isTeacher ? "Դեռ կապակցված աշակերտներ չկան" : "Դեռ կապակցված ուսուցիչներ չկան";

  function handleTeachingClose() {
    setTeachingOpen(false);
    onProfileChange();
  }

  return (
    <ProfileCard
      icon={Icon}
      title={title}
      description={`${count} ${isTeacher ? "աշակերտ" : "ուսուցիչ"}`}
      action={
        <Button variant="secondary" size="sm" onClick={() => setTeachingOpen(true)}>
          {isTeacher ? "Հրավիրել" : "Հրավերներ"}
        </Button>
      }
    >
      {people && people.length > 0 ? (
        <div className="grid grid-cols-3 gap-[var(--space-2)] sm:grid-cols-6">
          {people.map((p) => (
            <PersonBox key={p.id} person={p} onClick={() => navigate(`/profile/${p.id}`)} />
          ))}
        </div>
      ) : (
        <EmptyState
          size="sm"
          icon={<Icon size={22} strokeWidth={1.75} />}
          title={emptyText}
          hint={isTeacher ? "Հրավիրեք ձեր աշակերտներին։" : "Ուսուցիչը կարող է հրավեր ուղարկել ձեզ։"}
        />
      )}

      {teachingOpen && <TeachingModal role={profile.role} onClose={handleTeachingClose} onChange={onProfileChange} />}
    </ProfileCard>
  );
}
