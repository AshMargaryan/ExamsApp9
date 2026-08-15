import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ActivityDay } from "../../api/profile";
import { bucketActivity, TREND_RANGE_LABELS, type TrendRange } from "../../lib/performanceTrends";
import { EmptyState } from "../ui/EmptyState";

type Metric = "accuracy" | "minutes" | "questions" | "tests";

const METRIC_LABELS: Record<Metric, string> = {
  accuracy: "Ճշգրտություն",
  minutes: "Ուսումնական րոպեներ",
  questions: "Լուծված հարցեր",
  tests: "Ավարտված թեստեր",
};

const RANGES: TrendRange[] = ["7d", "30d", "3m", "all"];

export function PerformanceTrends({ activityDays }: { activityDays: ActivityDay[] | null }) {
  const [range, setRange] = useState<TrendRange>("30d");
  const [metric, setMetric] = useState<Metric>("accuracy");

  const points = useMemo(() => (activityDays ? bucketActivity(activityDays, range) : []), [activityDays, range]);
  const hasActivity = points.some((p) => p.questions > 0 || p.minutes > 0 || p.tests > 0);

  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-text">📈 Առաջընթացի դինամիկա</p>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                range === r ? "bg-primary text-primary-contrast" : "text-text-muted hover:bg-surface-muted"
              }`}
            >
              {TREND_RANGE_LABELS[r]}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-1">
        {(Object.keys(METRIC_LABELS) as Metric[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMetric(m)}
            className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${
              metric === m ? "border-primary text-primary" : "border-border text-text-muted"
            }`}
          >
            {METRIC_LABELS[m]}
          </button>
        ))}
      </div>

      {activityDays === null ? (
        <p className="text-sm text-text-muted">Բեռնվում է...</p>
      ) : !hasActivity ? (
        <EmptyState icon="📈" title="Դեռ բավարար տվյալներ չկան այս ժամանակահատվածի համար" />
      ) : (
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points}>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fill: "var(--color-text-muted)", fontSize: 11 }} />
              <YAxis tick={{ fill: "var(--color-text-muted)", fontSize: 11 }} width={32} />
              <Tooltip
                contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8 }}
                labelStyle={{ color: "var(--color-text)" }}
              />
              <Line
                type="monotone"
                dataKey={metric}
                stroke="var(--color-primary)"
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
