import { GoalsCard } from "../components/profile/GoalsCard";
import { ExamsSection } from "../components/learning-profile/ExamsSection";
import { LearningPreferencesSection } from "../components/learning-profile/LearningPreferencesSection";
import { ProfileHeroSection } from "../components/learning-profile/ProfileHeroSection";
import { SubjectMasteryGrid } from "../components/learning-profile/SubjectMasteryGrid";
import { StudyAvailabilitySection } from "../components/learning-profile/StudyAvailabilitySection";
import { LinkButton } from "../components/ui/LinkButton";

export function LearningProfilePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <LinkButton to="/" className="mb-4">← Գլխավոր</LinkButton>

      <div className="flex flex-col gap-6">
        <ProfileHeroSection />
        <SubjectMasteryGrid />
        <div id="goals-section">
          <GoalsCard />
        </div>
        <ExamsSection />
        <StudyAvailabilitySection />
        <LearningPreferencesSection />
      </div>
    </div>
  );
}
