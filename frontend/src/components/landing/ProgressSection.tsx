import { Section, SectionHeading } from "./Section";
import { Reveal } from "./Reveal";

const WEEKS = [
  { label: "12 հուլ", solved: 18, correct: 10 },
  { label: "19 հուլ", solved: 24, correct: 15 },
  { label: "26 հուլ", solved: 20, correct: 14 },
  { label: "2 օգ", solved: 32, correct: 26 },
  { label: "9 օգ", solved: 28, correct: 24 },
];

const STATS = [
  { value: "84%", label: "Ճշգրտություն" },
  { value: "12ժ 40ր", label: "Ուսումնական ժամանակ" },
  { value: "24", label: "Ավարտված թեստեր" },
  { value: "1,240", label: "XP" },
];

function DemoChart() {
  const max = Math.max(1, ...WEEKS.map((w) => w.solved));
  return (
    <div className="flex items-end gap-3" style={{ height: 120 }}>
      {WEEKS.map((w) => {
        const barHeight = Math.round((w.solved / max) * 90);
        const correctHeight = Math.round((w.correct / w.solved) * barHeight);
        return (
          <div key={w.label} className="flex flex-1 flex-col items-center justify-end gap-1.5">
            <div
              className="flex w-full max-w-9 flex-col justify-end overflow-hidden rounded-t-md bg-surface-muted"
              style={{ height: barHeight }}
            >
              <div className="w-full bg-accent" style={{ height: correctHeight }} />
              <div className="w-full bg-border" style={{ height: Math.max(barHeight - correctHeight, 0) }} />
            </div>
            <span className="text-[10px] text-text-muted">{w.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export function ProgressSection() {
  return (
    <Section>
      <SectionHeading
        kicker="Առաջընթաց"
        title="Տես, թե ինչպես ես բարելավվում։"
        subtitle="Ամեն լուծած խնդիր, ամեն ավարտված թեստ ավելանում է քո առաջընթացի պատկերին։"
      />

      <div className="mt-12 grid gap-6 lg:grid-cols-[1.3fr_0.7fr] lg:gap-8">
        <Reveal>
          <div className="rounded-[var(--radius)] border border-border bg-surface p-6">
            <p className="mb-5 text-sm font-semibold text-text">Շաբաթական առաջընթաց</p>
            <DemoChart />
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div className="grid h-full grid-cols-2 gap-4">
            {STATS.map((stat) => (
              <div key={stat.label} className="flex flex-col justify-center rounded-[var(--radius)] border border-border bg-surface p-4 text-center">
                <p className="text-xl font-semibold text-text">{stat.value}</p>
                <p className="mt-1 text-xs text-text-muted">{stat.label}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>

      <p className="mt-6 text-center text-xs text-text-muted">
        Ցուցադրական տվյալներ։ Իրական պրոֆիլում ցուցադրվում է քո սեփական առաջընթացը։
      </p>
    </Section>
  );
}
