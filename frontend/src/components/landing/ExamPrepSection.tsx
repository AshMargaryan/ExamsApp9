import { Section, SectionHeading } from "./Section";
import { Reveal } from "./Reveal";

export function ExamPrepSection() {
  return (
    <Section className="bg-surface-muted/40">
      <SectionHeading
        kicker="Քննության պատրաստություն"
        title="Պատրաստվիր քննությանը՝ ոչ թե վերջին շաբաթը։"
        subtitle="Ուսումնական պլան, պարապմունքներ, թույլ թեմաներ և AI բացատրություններ՝ բոլորը միասին՝ քո քննության օրվան հասնելու համար։"
      />

      <Reveal className="mt-12">
        <div className="mx-auto max-w-2xl rounded-[var(--radius)] border border-border bg-surface p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
            <div>
              <p className="text-sm text-text-muted">Մինչև քննությունը մնացել է</p>
              <p className="text-3xl font-semibold text-text">142 օր</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-text-muted">Քո պատրաստվածությունը</p>
              <p className="text-3xl font-semibold text-primary">68%</p>
            </div>
          </div>

          <div className="mt-5 mb-2 h-2 overflow-hidden rounded-full bg-surface-muted">
            <div className="h-full w-[68%] rounded-full bg-primary" />
          </div>

          <p className="mt-5 mb-2 text-xs font-medium text-text-muted">Առաջարկվում է այսօր</p>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-2.5 text-sm">
              <span className="flex items-center gap-2 text-text">
                <span>∑</span> Մաթեմատիկա
              </span>
              <span className="text-text-muted">25 ր</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-2.5 text-sm">
              <span className="flex items-center gap-2 text-text">
                <span>⚛</span> Ֆիզիկա
              </span>
              <span className="text-text-muted">20 ր</span>
            </div>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}
