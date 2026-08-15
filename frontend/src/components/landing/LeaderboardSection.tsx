import { Section, SectionHeading } from "./Section";
import { Reveal } from "./Reveal";

const MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

const ROWS = [
  { rank: 1, name: "Դանիել", xp: 349 },
  { rank: 2, name: "Արման", xp: 322 },
  { rank: 3, name: "Անի", xp: 301 },
];

export function LeaderboardSection() {
  return (
    <Section id="rankings">
      <SectionHeading
        kicker="Դասակարգում"
        title="Մրցակցիր, բայց ողջամտորեն։"
        subtitle="Համեմատվիր դասընկերների, դպրոցի և ամբողջ Հայաստանի աշակերտների հետ։"
      />

      <div className="mt-12 grid items-center gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
        <Reveal>
          <div className="overflow-hidden rounded-[var(--radius)] border border-border bg-surface">
            {ROWS.map((row) => (
              <div
                key={row.rank}
                className={`flex items-center gap-3 border-b border-border p-4 last:border-b-0 ${
                  row.rank === 1 ? "bg-primary/10" : ""
                }`}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center text-xl">{MEDALS[row.rank]}</span>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-muted text-text-muted">
                  {row.name.slice(0, 1)}
                </div>
                <p className="flex-1 truncate text-sm font-medium text-text">{row.name}</p>
                <p className="text-sm font-semibold text-text">{row.xp} XP</p>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={100}>
          <p className="text-balance text-2xl font-semibold text-text sm:text-3xl">
            Դու մրցում ես ոչ թե բոլորի հետ։
            <br />
            Դու մրցում ես երեկվա քո հետ։
          </p>
          <p className="mt-4 max-w-md text-text-muted">
            Դասակարգումը ամսական է և արդար՝ ըստ դասարանի, դպրոցի կամ ողջ երկրի։ Նպատակը մրցակցություն
            ստեղծելն է, ոչ թե ճնշում։
          </p>
        </Reveal>
      </div>
    </Section>
  );
}
