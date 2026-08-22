import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from "recharts";
import { Brain, Lock } from "lucide-react";
import type { DnaMetric, LearningDna } from "../../api/profile";
import { EmptyState } from "../ui/EmptyState";
import { DataCard } from "../ui/DataCard";

const DIMENSION_LABELS: Record<keyof LearningDna, string> = {
  accuracy: "Ճշգրտություն",
  consistency: "Կայունություն",
  difficulty_tolerance: "Բարդության հանդուրժողականություն",
  memory_retention: "Հիշողություն",
  exam_readiness: "Քննության պատրաստվածություն",
};

function isLocked(m: DnaMetric): m is Extract<DnaMetric, { locked: true }> {
  return "locked" in m && m.locked === true;
}

export function LearningDnaCard({ dna }: { dna: LearningDna }) {
  const entries = Object.entries(dna) as [keyof LearningDna, DnaMetric][];
  const unlocked = entries.filter(([, m]) => !isLocked(m));
  const locked = entries.filter(([, m]) => isLocked(m));

  if (unlocked.length === 0) {
    return (
      <DataCard icon={Brain} title="Ուսումնական ԴՆԹ">
        <EmptyState
          icon={<Brain size={22} strokeWidth={1.75} />}
          title="Շարունակիր սովորել՝ բացելու համար քո Ուսումնական ԴՆԹ-ն"
        />
      </DataCard>
    );
  }

  const chartData = entries.map(([key, m]) => ({
    dimension: DIMENSION_LABELS[key],
    value: isLocked(m) ? 0 : m.value,
  }));

  return (
    <DataCard
      icon={Brain}
      title="Ուսումնական ԴՆԹ"
      description="Հաշվարկված է քո իրական ուսումնական վարքագծից"
    >
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={chartData} outerRadius="75%">
            <PolarGrid stroke="var(--color-border)" />
            <PolarAngleAxis dataKey="dimension" tick={{ fill: "var(--color-text-muted)", fontSize: 11 }} />
            <Radar dataKey="value" stroke="var(--color-primary)" fill="var(--color-primary)" fillOpacity={0.35} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {unlocked.map(([key, m]) => (
          <div key={key} className="rounded-[var(--radius-md)] border border-border bg-bg px-3 py-2">
            <p className="text-xs text-text-muted">{DIMENSION_LABELS[key]}</p>
            <p className="text-sm font-semibold text-text">
              {!isLocked(m) ? Math.round(m.value) : ""}
              {!isLocked(m) && "%"}
              {!isLocked(m) && m.provisional && <span className="ml-1 text-xs text-text-muted">(նախնական)</span>}
            </p>
          </div>
        ))}
      </div>

      {locked.length > 0 && (
        <div className="mt-3 border-t border-border pt-3">
          <p className="mb-1.5 text-xs text-text-muted">Դեռ բացված չեն.</p>
          <div className="flex flex-wrap gap-1.5">
            {locked.map(([key, m]) =>
              isLocked(m) ? (
                <span
                  key={key}
                  title={m.reason}
                  className="flex items-center gap-1 rounded-[var(--radius-full)] border border-border px-[var(--space-2)] py-[2px] text-[length:var(--text-xs)] text-text-muted"
                >
                  <Lock size={11} strokeWidth={2.25} aria-hidden="true" /> {DIMENSION_LABELS[key]}
                </span>
              ) : null
            )}
          </div>
        </div>
      )}
    </DataCard>
  );
}
