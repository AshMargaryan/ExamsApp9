import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { CoachCadenceSection } from "../components/learning-profile/CoachCadenceSection";
import { ExamsSection } from "../components/learning-profile/ExamsSection";
import { GoalsSection } from "../components/learning-profile/GoalsSection";
import { LearningPreferencesSection } from "../components/learning-profile/LearningPreferencesSection";
import { LearningProfileDataProvider } from "../components/learning-profile/LearningProfileData";
import { ProfileHeroSection } from "../components/learning-profile/ProfileHeroSection";
import { StudyAvailabilitySection } from "../components/learning-profile/StudyAvailabilitySection";
import { SubjectMasterySection } from "../components/learning-profile/SubjectMasterySection";
import { SectionNav, SectionNavBar, useScrollSpy, type SectionNavItem } from "../components/ui/SectionNav";

/*
  Six tall sections need a table of contents, or the only way to find anything
  is to scroll past everything else. The nav is a sticky rail on desktop and a
  sticky pill strip on mobile, both driven by the same scroll-spy.

  All six sections read from one LearningProfileDataProvider: the page used to
  issue the subjects/mastery/goals/exams requests twice each (once for the hero
  summary, once for the section that owns them) and each copy could drift out
  of sync with the other after an edit.
*/

const SECTIONS: SectionNavItem[] = [
  { id: "overview", label: "Ընդհանուր" },
  { id: "subjects", label: "Առարկաներ" },
  { id: "goals", label: "Նպատակներ" },
  { id: "exams", label: "Քննություններ" },
  { id: "schedule", label: "Ժամանակացույց" },
  { id: "coach", label: "Ռիթմ" },
  { id: "tutor", label: "AI Tutor" },
];

/** `tabIndex={-1}` makes the section a focus target for the nav, and
 *  `scroll-mt` keeps its heading clear of the sticky mobile strip. */
function Section({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <section id={id} tabIndex={-1} className="scroll-mt-24 focus:outline-none lg:scroll-mt-6">
      {children}
    </section>
  );
}

export function LearningProfilePage() {
  const active = useScrollSpy(SECTIONS.map((s) => s.id));

  return (
    <LearningProfileDataProvider>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <Link
          to="/"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ArrowLeft size={15} strokeWidth={2} />
          Գլխավոր
        </Link>

        <div className="sticky top-0 z-20 lg:hidden">
          <SectionNavBar items={SECTIONS} active={active} />
        </div>

        <div className="grid gap-8 lg:grid-cols-[168px_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <div className="sticky top-6">
              <p className="mb-2 pl-4 text-[11px] font-semibold tracking-[0.12em] text-text-muted">ԲԱԺԻՆՆԵՐ</p>
              <SectionNav items={SECTIONS} active={active} />
            </div>
          </aside>

          <div className="flex min-w-0 flex-col gap-6">
            <Section id="overview">
              <ProfileHeroSection />
            </Section>
            <Section id="subjects">
              <SubjectMasterySection />
            </Section>
            <Section id="goals">
              <GoalsSection />
            </Section>
            <Section id="exams">
              <ExamsSection />
            </Section>
            <Section id="schedule">
              <StudyAvailabilitySection />
            </Section>
            <Section id="coach">
              <CoachCadenceSection />
            </Section>
            <Section id="tutor">
              <LearningPreferencesSection />
            </Section>
          </div>
        </div>
      </div>
    </LearningProfileDataProvider>
  );
}
