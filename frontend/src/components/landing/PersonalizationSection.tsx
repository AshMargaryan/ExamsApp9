import { Section, SectionHeading } from "./Section";
import { Reveal } from "./Reveal";

const STUDENTS = [
  {
    name: "Աշակերտ Ա",
    strong: "Մաթեմատիկա",
    weak: "Ֆիզիկա",
    recommendation: "Այսօր՝ Ֆիզիկա, կինեմատիկա, 25 րոպե",
  },
  {
    name: "Աշակերտ Բ",
    strong: "Ֆիզիկա",
    weak: "Քիմիա",
    recommendation: "Այսօր՝ Քիմիա, քիմիական կապեր, 20 րոպե",
  },
];

export function PersonalizationSection() {
  return (
    <Section className="bg-surface-muted/40">
      <SectionHeading
        kicker="Անհատականացում"
        title="Gitus-ը հարմարվում է քեզ։"
        subtitle="Ոչ բոլորն են սովորում նույն կերպ։ Երկու աշակերտ, երկու տարբեր ուսումնական պլան։"
      />

      <div className="mt-12 grid gap-6 sm:grid-cols-2">
        {STUDENTS.map((s, i) => (
          <Reveal key={s.name} delay={i * 100}>
            <div className="rounded-[var(--radius)] border border-border bg-surface p-6">
              <p className="mb-4 text-sm font-semibold text-text">{s.name}</p>
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex items-center justify-between rounded-lg border border-correct/40 bg-correct-bg px-3.5 py-2">
                  <span className="text-text">{s.strong}</span>
                  <span className="text-correct">Ուժեղ</span>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-incorrect/40 bg-incorrect-bg px-3.5 py-2">
                  <span className="text-text">{s.weak}</span>
                  <span className="text-incorrect">Թույլ</span>
                </div>
              </div>
              <div className="mt-4 border-t border-border pt-4">
                <p className="text-xs font-medium text-text-muted">Առաջարկվող պլան</p>
                <p className="mt-1 text-sm text-text">{s.recommendation}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
