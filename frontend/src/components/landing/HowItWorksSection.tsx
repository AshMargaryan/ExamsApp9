import { Section, SectionHeading } from "./Section";
import { Reveal } from "./Reveal";

const STEPS = [
  { number: "01", title: "Ստեղծիր քո պրոֆիլը", description: "Դասարան, դպրոց և առարկաներ՝ մի քանի րոպեում։" },
  { number: "02", title: "Ասա՝ ինչին ես պատրաստվում", description: "Քննություն, առարկա կամ ուղղակի ուզում ես ամրապնդել գիտելիքները։" },
  { number: "03", title: "Սովորիր, պարապիր, բարելավվիր", description: "Gitus-ը հարմարվում է քո առաջընթացին ամեն քայլում։" },
];

export function HowItWorksSection() {
  return (
    <Section>
      <SectionHeading kicker="Ինչպես է աշխատում" title="Երեք քայլ մինչև սկիզբը։" />

      <div className="mt-12 grid gap-8 sm:grid-cols-3">
        {STEPS.map((step, i) => (
          <Reveal key={step.number} delay={i * 80} className="text-center sm:text-left">
            <p className="text-4xl font-bold text-border">{step.number}</p>
            <h3 className="mt-3 text-lg font-semibold text-text">{step.title}</h3>
            <p className="mt-1.5 text-sm text-text-muted">{step.description}</p>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
