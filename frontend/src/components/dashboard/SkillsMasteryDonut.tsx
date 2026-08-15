import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

export interface SkillsMasteryCounts {
  mastered: number;
  practicing: number;
  needs_improvement: number;
}

const SLICES: { key: keyof SkillsMasteryCounts; label: string; color: string }[] = [
  { key: "mastered", label: "Յուրացված", color: "var(--color-correct)" },
  { key: "practicing", label: "Պարապում է", color: "var(--color-primary)" },
  { key: "needs_improvement", label: "Կարիք ունի ուշադրության", color: "var(--color-incorrect)" },
];

/** Small donut summarizing skills_mastery counts at a glance, next to the
 * existing three-column skill list. */
export function SkillsMasteryDonut({ counts }: { counts: SkillsMasteryCounts }) {
  const total = counts.mastered + counts.practicing + counts.needs_improvement;
  const data = SLICES.map((s) => ({ ...s, value: counts[s.key] }));

  if (total === 0) {
    return (
      <div className="flex h-32 w-32 items-center justify-center rounded-full border border-dashed border-border text-xs text-text-muted">
        Դեռ ոչինչ
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <div className="h-32 w-32 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="label" innerRadius="60%" outerRadius="90%" paddingAngle={2} stroke="none">
              {data.map((s) => (
                <Cell key={s.key} fill={s.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-col gap-1.5 text-xs">
        {data.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.color }} />
            <span className="text-text-muted">{s.label}</span>
            <span className="font-medium text-text">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
