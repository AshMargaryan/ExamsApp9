import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from "recharts";
import type { DnaMetric, LearningDna } from "../../api/profile";
import { EmptyState } from "../ui/EmptyState";

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
      <div className="rounded-[var(--radius)] border border-border bg-surface p-5">
        <p className="mb-3 text-sm font-semibold text-text">🧠 Ուսումնական ԴՆԹ</p>
        <EmptyState icon="🧠" title="Շարունակեք սովորել՝ բացելու համար ձեր Ուսումնական ԴՆԹ-ն" />
      </div>
    );
  }

  const chartData = entries.map(([key, m]) => ({
    dimension: DIMENSION_LABELS[key],
    value: isLocked(m) ? 0 : m.value,
  }));

  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-5">
      <p className="mb-1 text-sm font-semibold text-text">🧠 Ուսումնական ԴՆԹ</p>
      <p className="mb-3 text-xs text-text-muted">Հաշվարկված է ձեր իրական ուսումնական վարքագծից</p>

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
          <div key={key} className="rounded-md border border-border bg-bg px-3 py-2">
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
                <span key={key} title={m.reason} className="rounded-full border border-border px-2 py-0.5 text-xs text-text-muted">
                  🔒 {DIMENSION_LABELS[key]}
                </span>
              ) : null
            )}
          </div>
        </div>
      )}
    </div>
  );
}
