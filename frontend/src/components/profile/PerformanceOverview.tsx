import type { Growth, LearningStats } from "../../api/profile";
import { StatTile } from "../ui/StatTile";

function formatDelta(value: number, suffix = ""): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value}${suffix} այս ամիս`;
}

export function PerformanceOverview({ stats, growth }: { stats: LearningStats; growth: Growth | null }) {
  const hasDeltas = growth?.has_enough_data ?? false;

  return (
    <div>
      <p className="mb-3 text-sm font-semibold text-text">📊 Կատարողականություն</p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile
          label="Լուծված հարցեր"
          value={String(stats.questions_solved)}
          delta={hasDeltas ? formatDelta(growth!.questions_delta) : undefined}
        />
        <StatTile
          label="Ճշգրտություն"
          value={`${stats.accuracy_percentage}%`}
          delta={hasDeltas && growth!.accuracy_delta !== null ? formatDelta(growth!.accuracy_delta, "%") : undefined}
        />
        <StatTile
          label="Ավարտված թեստեր"
          value={String(stats.tests_completed)}
          delta={hasDeltas ? formatDelta(growth!.tests_delta) : undefined}
        />
        <StatTile label="Պարապանք վերջին շաբաթում" value={`${(stats.weekly_study_seconds / 3600).toFixed(1)} ժ`} />
      </div>
    </div>
  );
}
