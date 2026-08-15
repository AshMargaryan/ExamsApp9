import { Link } from "react-router-dom";
import { Section, SectionHeading } from "./Section";
import { Reveal } from "./Reveal";

export function MistakeAnalysisSection() {
  return (
    <Section className="bg-surface-muted/40">
      <SectionHeading
        kicker="Սխալների վերլուծություն"
        title="Gitus-ը չի ասում պարզապես՝ «սխալ ես»։"
        subtitle="Ամեն սխալ պատասխանից հետո ես ցույց տալիս, թե կոնկրետ ինչ ես շփոթել և ինչպես շտկել այն։"
      />

      <Reveal className="mt-12">
        <div className="mx-auto max-w-2xl overflow-hidden rounded-[var(--radius)] border border-border bg-surface">
          <div className="border-b border-border bg-incorrect-bg px-6 py-5">
            <p className="text-sm font-semibold text-incorrect">Ինչու՞ սխալվեցիր</p>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
              <span className="rounded-md border border-incorrect/40 bg-surface px-3 py-1.5 font-medium text-text">
                Անկյունային գործակիցը
              </span>
              <span className="text-text-muted">շփոթել ես</span>
              <span className="rounded-md border border-incorrect/40 bg-surface px-3 py-1.5 font-medium text-text">
                y-հատման կետի
              </span>
              <span className="text-text-muted">հետ</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 px-6 py-5">
            <div>
              <p className="text-sm font-semibold text-text">Եկ շտկենք։</p>
              <p className="mt-1 text-sm text-text-muted">Նմանատիպ վարժություն՝ նույն թեմայից։</p>
            </div>
            <Link
              to="/register"
              className="flex-none rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text transition-colors hover:border-primary"
            >
              Փորձել →
            </Link>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}
