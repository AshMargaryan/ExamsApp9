import { GraduationCap, Target } from "lucide-react";
import type { AcademicPower, Profile, SubjectMastery } from "../../api/profile";
import { EmptyState } from "../ui/EmptyState";
import { DataCard } from "../ui/DataCard";

export function AcademicIdentityCard({
  profile,
  subjectMastery,
  academicPower,
  onSetGoal,
}: {
  profile: Profile;
  subjectMastery: SubjectMastery[] | null;
  academicPower: AcademicPower | null;
  onSetGoal: () => void;
}) {
  const withData = (subjectMastery ?? []).filter((s) => s.has_data && s.mastery !== null);
  const strongest = withData.length ? withData.reduce((a, b) => ((b.mastery ?? 0) > (a.mastery ?? 0) ? b : a)) : null;
  const weakest = withData.length ? withData.reduce((a, b) => ((b.mastery ?? 100) < (a.mastery ?? 100) ? b : a)) : null;
  const applicationYear = profile.target_exam_date ? new Date(profile.target_exam_date).getFullYear() : null;
  const readiness = academicPower?.available ? Math.round(academicPower.power / 10) : null;

  if (!profile.university && !profile.target_major) {
    return (
      <DataCard icon={GraduationCap} title="Ակադեմիական ինքնություն">
        <EmptyState
          icon={<Target size={22} strokeWidth={1.75} />}
          title="Ընտրիր քո նպատակային բուհը"
          hint="Ասա Gitus-ին, թե ուր ես գնում։"
          cta={{ label: "Սահմանել նպատակ", onClick: onSetGoal }}
        />
      </DataCard>
    );
  }

  return (
    <DataCard icon={GraduationCap} title="Ակադեմիական ինքնություն">
      <div className="grid grid-cols-2 gap-[var(--space-4)] text-[length:var(--text-sm)] sm:grid-cols-3">
        {profile.target_major && (
          <div>
            <p className="text-text-muted">Մասնագիտություն</p>
            <p className="font-medium text-text">{profile.target_major}</p>
          </div>
        )}
        {profile.university && (
          <div>
            <p className="text-text-muted">Նպատակային բուհ</p>
            <p className="font-medium text-text">{profile.university.name}</p>
          </div>
        )}
        {applicationYear && (
          <div>
            <p className="text-text-muted">Ընդունելության տարի</p>
            <p className="font-medium text-text">{applicationYear}</p>
          </div>
        )}
        {strongest && (
          <div>
            <p className="text-text-muted">Ուժեղ կողմ</p>
            <p className="font-medium text-text">{strongest.label}</p>
          </div>
        )}
        {weakest && weakest.key !== strongest?.key && (
          <div>
            <p className="text-text-muted">Անհրաժեշտ է աշխատել</p>
            <p className="font-medium text-text">{weakest.label}</p>
          </div>
        )}
        {readiness !== null && (
          <div>
            <p className="text-text-muted">Քննության պատրաստվածություն</p>
            <p className="font-medium text-text">{readiness}%</p>
          </div>
        )}
      </div>
    </DataCard>
  );
}
