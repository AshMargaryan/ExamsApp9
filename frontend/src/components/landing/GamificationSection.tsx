import { Section, SectionHeading } from "./Section";
import { Reveal } from "./Reveal";
import { RARITY_COLORS, RARITY_LABELS } from "../../lib/achievementRarity";
import type { AchievementRarity } from "../../api/profile";

const ACHIEVEMENTS: { icon: string; name: string; rarity: AchievementRarity }[] = [
  { icon: "🔥", name: "7-օրյա շարք", rarity: "rare" },
  { icon: "🎯", name: "100 ճիշտ պատասխան", rarity: "common" },
  { icon: "🏆", name: "Օգոստոսի չեմպիոն", rarity: "legendary" },
  { icon: "📚", name: "5 առարկա", rarity: "epic" },
];

export function GamificationSection() {
  return (
    <Section className="bg-surface-muted/40">
      <SectionHeading
        kicker="Մոտիվացիա"
        title="Սովորելն ավելի լավ է զգացվում, երբ առաջընթացը տեսանելի է։"
        subtitle="Շարք, մակարդակներ և նվաճումներ, որոնք օգնում են պահպանել կայունությունը՝ առանց մանկամտության։"
      />

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Reveal>
          <div className="flex h-full flex-col items-center justify-center gap-1 rounded-[var(--radius)] border border-border bg-surface p-6 text-center">
            <span className="text-3xl">🔥</span>
            <p className="mt-1 text-xl font-semibold text-text">7 օրյա շարք</p>
            <p className="text-xs text-text-muted">Շարունակիր ամեն օր</p>
          </div>
        </Reveal>

        <Reveal delay={60}>
          <div className="flex h-full flex-col justify-center gap-2 rounded-[var(--radius)] border border-border bg-surface p-6">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-text">Մակարդակ 3</span>
              <span className="text-text-muted">349 XP</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
              <div className="h-full w-[64%] rounded-full bg-accent" />
            </div>
            <p className="text-xs text-text-muted">151 XP մինչև հաջորդ մակարդակ</p>
          </div>
        </Reveal>

        <Reveal delay={120}>
          <div className="flex h-full flex-col items-center justify-center gap-1 rounded-[var(--radius)] border border-border bg-surface p-6 text-center">
            <span className="text-3xl">🥇</span>
            <p className="mt-1 text-xl font-semibold text-text">#1</p>
            <p className="text-xs text-text-muted">Դասարանում այս ամիս</p>
          </div>
        </Reveal>

        <Reveal delay={180}>
          <div className="flex h-full flex-col items-center justify-center gap-1 rounded-[var(--radius)] border border-border bg-surface p-6 text-center">
            <span className="text-3xl">🥇</span>
            <p className="mt-1 text-sm font-semibold text-text">Օգոստոսի չեմպիոն</p>
            <p className="text-xs text-text-muted">Ամսվա նվաճում</p>
          </div>
        </Reveal>
      </div>

      <Reveal delay={220} className="mt-6">
        <div className="rounded-[var(--radius)] border border-border bg-surface p-6">
          <p className="mb-4 text-sm font-semibold text-text">Նվաճումներ</p>
          <div className="flex flex-wrap gap-3">
            {ACHIEVEMENTS.map((a) => (
              <span
                key={a.name}
                className="flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-medium"
                style={{ borderColor: RARITY_COLORS[a.rarity], color: RARITY_COLORS[a.rarity] }}
              >
                <span className="text-sm">{a.icon}</span>
                {a.name}
                <span className="opacity-70">· {RARITY_LABELS[a.rarity]}</span>
              </span>
            ))}
          </div>
        </div>
      </Reveal>
    </Section>
  );
}
