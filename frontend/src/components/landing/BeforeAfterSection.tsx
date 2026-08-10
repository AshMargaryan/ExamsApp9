import { Section, SectionHeading } from "./Section";
import { Reveal } from "./Reveal";

const ROWS = [
  { before: "Չգիտեմ՝ ինչ սովորել հաջորդը։", after: "Գիտեմ ինչ սովորել հաջորդը։" },
  { before: "Չեմ հասկանում այս հարցը։", after: "AI-ն բացատրում է քայլ առ քայլ։" },
  { before: "Կրկնում եմ նույն սխալները։", after: "Հասկանում եմ, թե ինչու եմ սխալվում։" },
  { before: "Չգիտեմ՝ առաջ եմ գնում, թե ոչ։", after: "Տեսնում եմ իմ առաջընթացը։" },
];

export function BeforeAfterSection() {
  return (
    <Section>
      <SectionHeading title="Ինչպես է փոխվում սովորելը Gitus-ով։" />

      <Reveal className="mt-12">
        <div className="mx-auto max-w-2xl overflow-hidden rounded-[var(--radius)] border border-border bg-surface">
          <div className="grid grid-cols-2 border-b border-border text-center text-sm font-semibold">
            <div className="border-r border-border bg-bg py-3 text-text-muted">Առանց Gitus-ի</div>
            <div className="bg-bg py-3 text-primary">Gitus-ով</div>
          </div>
          {ROWS.map((row) => (
            <div key={row.before} className="grid grid-cols-2 border-b border-border text-sm last:border-b-0">
              <div className="border-r border-border px-4 py-3.5 text-text-muted">{row.before}</div>
              <div className="px-4 py-3.5 text-text">{row.after}</div>
            </div>
          ))}
        </div>
      </Reveal>
    </Section>
  );
}
