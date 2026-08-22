import { LandingNav } from "../components/landing/LandingNav";
import { Hero } from "../components/landing/Hero";
import { SubjectJourney } from "../components/landing/SubjectJourney";
import { MistakeSection } from "../components/landing/MistakeSection";
import { AdaptivePlanSection } from "../components/landing/AdaptivePlanSection";
import { KnowledgeMapSection } from "../components/landing/KnowledgeMapSection";
import { TutorSection } from "../components/landing/TutorSection";
import { ProgressComparisonSection } from "../components/landing/ProgressComparisonSection";
import { SupportSection } from "../components/landing/SupportSection";
import { SubscriptionSection } from "../components/landing/SubscriptionSection";
import { TrustSection } from "../components/landing/TrustSection";
import { FoundersSection } from "../components/landing/FoundersSection";
import { FaqSection } from "../components/landing/FaqSection";
import { ClosingSection } from "../components/landing/ClosingSection";
import { LandingFooter } from "../components/landing/LandingFooter";

/*
  THE MARKETING PAGE — seven movements.

  This was twenty-one sections and 20,082px at 1280px wide, of which five
  sections made the same argument, four solved the same linear equation, one
  was 114px of a single sentence with no information in it, and every one of
  the nine calls to action pointed at /register — four of them promising a
  product experience ("try the AI Tutor", "practise a similar question") and
  delivering a signup form.

  What replaces it is one story told in seven beats, alternating between two
  grounds. The alternation is the visual system; there is deliberately no
  third surface treatment.

    1  night   the question a student actually asks, answered on screen
    2  night   the subject universe — scale, and the promise of one system
    3  paper   the reader's own wrong answer, explained
    4  paper   the plan rewriting itself overnight
    5  night   the system's model of the student, including what it admits
               it does not know
    6  paper   the tutor, and the choice between a hint and an explanation
    7  paper   trust -> founders -> FAQ, then one night close and one CTA

  Movements 1 and 7 are the same room. The page opens on an unanswered
  question and closes on five answered ones; everything between is the
  evidence for the change.

  Two rules this page holds itself to, and the reason it can:

  * Nothing is claimed that the backend cannot do. The mistake taxonomy, the
    conversation modes, the mastery scale and its thresholds, the plan's
    ordering rules and the exam/question counts are all real and each section
    names the module it came from. The one thing the brief asked for that is
    NOT here is a prerequisite-gap demonstration — there is no prerequisite
    graph in this product, so movement 4 shows what the engine actually does
    (mistake density, recency, spaced-repetition due dates) instead.
  * Every invented number carries a `DemoNote`. A visitor has no account, so
    the product surface on this page cannot be real; saying so is cheaper
    than being caught.

  There is deliberately no campaign gradient.

  The root used to set `--gradient-primary` to a violet→magenta ramp, which
  theme.css's `.bg-primary` rule picked up — so every CTA on the marketing
  page was violet while the identical button inside the app was lapis. That
  was two problems, not one: the landing page looked like a different product
  from the one behind /login, and violet-to-magenta is the house style of
  every other AI startup, which is the single thing this page cannot afford
  to resemble.

  The identity theme.css documents at length — lapis #2d3f8f with a burnt
  apricot accent on warm paper — is stronger, and its contrast is already
  measured. CTAs use it. Where a section wants a rich ground rather than a
  flat one, `--color-night` is the theme-invariant ground built for exactly
  that; SubjectJourney is the reference.
*/
export function LandingPage() {
  return (
    <div className="min-h-screen bg-bg">
      <LandingNav />
      <main>
        <Hero />
        <SubjectJourney />
        <MistakeSection />
        <AdaptivePlanSection />
        <KnowledgeMapSection />
        <TutorSection />
        <ProgressComparisonSection />
        <SupportSection />
        <SubscriptionSection />
        <TrustSection />
        {/* Reserved and currently rendering nothing — real photographs and
            real biography are being supplied. See FoundersSection.tsx for why
            it is empty rather than filled with a placeholder. */}
        <FoundersSection />
        <FaqSection />
      </main>
      <ClosingSection />
      <LandingFooter />
    </div>
  );
}
