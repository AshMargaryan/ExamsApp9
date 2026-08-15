import { GraduationCap } from "lucide-react";
import type { AcademicPower, Profile, SubjectMastery } from "../../api/profile";
import { EmptyState } from "../ui/EmptyState";

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
      <div className="rounded-[var(--radius)] border border-border bg-surface p-5">
        <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-text">
          <GraduationCap size={16} strokeWidth={1.75} /> Ակադեմիական ինքնություն
        </p>
        <EmptyState
          icon="🎯"
          title="Ընտրեք ձեր նպատակային բուհը"
          hint="Ասացեք Gitus-ին, թե ուր եք գնում։"
          cta={{ label: "Սահմանել նպատակ", onClick: onSetGoal }}
        />
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-5">
      <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-text">
        <GraduationCap size={16} strokeWidth={1.75} /> Ակադեմիական ինքնություն
      </p>
      <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
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
    </div>
  );
}
