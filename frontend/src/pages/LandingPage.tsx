import type { CSSProperties } from "react";
import { LandingNav } from "../components/landing/LandingNav";
import { Hero } from "../components/landing/Hero";
import { SocialProof } from "../components/landing/SocialProof";
import { ProductOverview } from "../components/landing/ProductOverview";
import { AiTutorSection } from "../components/landing/AiTutorSection";
import { StudyPlanSection } from "../components/landing/StudyPlanSection";
import { TestsSection } from "../components/landing/TestsSection";
import { MistakeAnalysisSection } from "../components/landing/MistakeAnalysisSection";
import { ProgressSection } from "../components/landing/ProgressSection";
import { GamificationSection } from "../components/landing/GamificationSection";
import { LeaderboardSection } from "../components/landing/LeaderboardSection";
import { ExamPrepSection } from "../components/landing/ExamPrepSection";
import { HowItWorksSection } from "../components/landing/HowItWorksSection";
import { PersonalizationSection } from "../components/landing/PersonalizationSection";
import { BeforeAfterSection } from "../components/landing/BeforeAfterSection";
import { TrustSection } from "../components/landing/TrustSection";
import { ParentsSection } from "../components/landing/ParentsSection";
import { FaqSection } from "../components/landing/FaqSection";
import { FinalCtaSection } from "../components/landing/FinalCtaSection";
import { LandingFooter } from "../components/landing/LandingFooter";

const BRAND_GRADIENT = {
  "--gradient-primary": "linear-gradient(226deg, #7C3AED, #7F24B0, #FF5C8D)",
} as CSSProperties;

export function LandingPage() {
  return (
    <div className="min-h-screen bg-bg" style={BRAND_GRADIENT}>
      <LandingNav />
      <main>
        <Hero />
        <SocialProof />
        <ProductOverview />
        <AiTutorSection />
        <StudyPlanSection />
        <TestsSection />
        <MistakeAnalysisSection />
        <ProgressSection />
        <GamificationSection />
        <LeaderboardSection />
        <ExamPrepSection />
        <HowItWorksSection />
        <PersonalizationSection />
        <BeforeAfterSection />
        <TrustSection />
        <ParentsSection />
        <FaqSection />
      </main>
      <FinalCtaSection />
      <LandingFooter />
    </div>
  );
}
