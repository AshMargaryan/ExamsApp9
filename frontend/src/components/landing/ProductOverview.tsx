import type { ReactNode } from "react";
import { Section, SectionHeading } from "./Section";
import { Reveal } from "./Reveal";

interface Card {
  icon: string;
  title: string;
  description: string;
  preview: ReactNode;
}

const CARDS: Card[] = [
  {
    icon: "🤖",
    title: "AI Tutor",
    description: "Հասկացիր բարդ թեմաները քայլ առ քայլ բացատրություններով։",
    preview: (
      <div className="flex flex-col gap-1.5">
        <p className="ml-auto max-w-[85%] rounded-lg rounded-tr-sm bg-primary px-2.5 py-1.5 text-[11px] text-primary-contrast">
          Ինչպե՞ս լուծեմ սա
        </p>
        <p className="max-w-[85%] rounded-lg rounded-tl-sm bg-surface-muted px-2.5 py-1.5 text-[11px] text-text">
          Եկ քայլ առ քայլ...
        </p>
      </div>
    ),
  },
  {
    icon: "📝",
    title: "Խելացի թեստեր",
    description: "Պարապիր իրական քննության ձևաչափին մոտ հարցերով։",
    preview: (
      <div className="flex flex-col gap-1.5">
        <div className="rounded-md border border-correct bg-correct-bg px-2.5 py-1.5 text-[11px] text-correct">
          ✓ x = 6
        </div>
        <div className="rounded-md border border-border px-2.5 py-1.5 text-[11px] text-text-muted">
          x = 8
        </div>
      </div>
    ),
  },
  {
    icon: "🎯",
    title: "Անհատական ուսումնական պլան",
    description: "Ամեն օր ճշգրիտ գիտես՝ ինչ սովորել հաջորդը։",
    preview: (
      <div className="flex items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-[11px]">
        <span>🧮</span>
        <span className="flex-1 truncate text-text">Քառակուսի հավասարումներ</span>
        <span className="text-text-muted">20 ր</span>
      </div>
    ),
  },
  {
    icon: "📈",
    title: "Առաջընթացի հետևում",
    description: "Տես, թե որտեղ ես բարելավվում, ամեն շաբաթ։",
    preview: (
      <div className="flex h-8 items-end gap-1">
        {[40, 65, 50, 85, 70].map((h, i) => (
          <div key={i} className="w-full rounded-t-sm bg-accent" style={{ height: `${h}%` }} />
        ))}
      </div>
    ),
  },
  {
    icon: "🏆",
    title: "Դասակարգում",
    description: "Մրցակցիր դասընկերների հետ, բարձրացիր վարկանիշում։",
    preview: (
      <div className="flex items-center gap-2 text-[11px]">
        <span className="text-base">🥇</span>
        <span className="flex-1 truncate text-text">Դանիել</span>
        <span className="text-text-muted">349 XP</span>
      </div>
    ),
  },
  {
    icon: "🔥",
    title: "Շարք և նվաճումներ",
    description: "Կառուցիր կայուն սովորելու սովորություն։",
    preview: (
      <div className="flex items-center gap-2 text-[11px]">
        <span className="rounded-full bg-surface-muted px-2 py-1 font-semibold text-text">🔥 7 օր</span>
        <span className="rounded-full bg-surface-muted px-2 py-1 font-semibold text-text">Մակարդակ 3</span>
      </div>
    ),
  },
];

export function ProductOverview() {
  return (
    <Section id="product">
      <SectionHeading
        kicker="Ապրանք"
        title="Մեկ հարթակ՝ ողջ ուսումնական ճանապարհի համար։"
        subtitle="Ամեն ինչ, ինչ պետք է քեզ՝ հասկանալու, պարապելու և բարելավվելու համար՝ մեկ տեղում։"
      />

      <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((card, i) => (
          <Reveal key={card.title} delay={i * 60}>
            <div className="flex h-full flex-col rounded-[var(--radius)] border border-border bg-surface p-6">
              <span className="text-2xl" aria-hidden>
                {card.icon}
              </span>
              <h3 className="mt-3 text-base font-semibold text-text">{card.title}</h3>
              <p className="mt-1.5 text-sm text-text-muted">{card.description}</p>
              <div className="mt-4 rounded-lg border border-border bg-bg p-3">{card.preview}</div>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
