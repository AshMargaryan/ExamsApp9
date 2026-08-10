import { Section, SectionHeading } from "./Section";
import { Reveal } from "./Reveal";

export function ParentsSection() {
  return (
    <Section className="bg-surface-muted/40">
      <SectionHeading
        kicker="Ծնողների համար"
        title="Իմացիր, որ քո երեխան իրականում առաջադիմում է։"
        subtitle="Ծնողի հաշիվով կարող ես տեսնել կայունությունը, առաջընթացը և թեստերի արդյունքները՝ առանց մուտք ունենալու անձնական AI Tutor զրույցներին։"
      />

      <Reveal className="mt-12">
        <div className="mx-auto grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-[var(--radius)] border border-border bg-surface p-5 text-center">
            <p className="text-xl font-semibold text-text">6/7</p>
            <p className="mt-1 text-xs text-text-muted">Ակտիվ օր այս շաբաթ</p>
          </div>
          <div className="rounded-[var(--radius)] border border-border bg-surface p-5 text-center">
            <p className="text-xl font-semibold text-text">+9%</p>
            <p className="mt-1 text-xs text-text-muted">Բարելավում այս ամիս</p>
          </div>
          <div className="rounded-[var(--radius)] border border-border bg-surface p-5 text-center">
            <p className="text-xl font-semibold text-text">Երկրաչափություն</p>
            <p className="mt-1 text-xs text-text-muted">Ամենաթույլ թեման</p>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}
