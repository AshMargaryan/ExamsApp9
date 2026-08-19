import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ActivityDay } from "../../api/profile";
import { TrendingUp } from "lucide-react";
import { bucketActivity, TREND_RANGE_LABELS, type TrendRange } from "../../lib/performanceTrends";
import { EmptyState } from "../ui/EmptyState";
import { FilterChips } from "../ui/FilterChips";
import { SkeletonRows } from "../ui/Skeleton";
import { ProfileCard } from "./ProfileCard";

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
    <ProfileCard
      icon={TrendingUp}
      title="Առաջընթացի դինամիկա"
      description={`${METRIC_LABELS[metric]}՝ ${TREND_RANGE_LABELS[range].toLowerCase()}`}
      action={
        <FilterChips
          label="Ժամանակահատված"
          size="sm"
          options={RANGES.map((r) => ({ value: r, label: TREND_RANGE_LABELS[r] }))}
          value={range}
          onChange={setRange}
        />
      }
    >
      <FilterChips
        label="Ցուցանիշ"
        size="sm"
        className="mb-[var(--space-4)]"
        options={(Object.keys(METRIC_LABELS) as Metric[]).map((m) => ({ value: m, label: METRIC_LABELS[m] }))}
        value={metric}
        onChange={setMetric}
      />

      {activityDays === null ? (
        <SkeletonRows count={4} trailing={false} />
      ) : !hasActivity ? (
        <EmptyState
          icon={<TrendingUp size={22} strokeWidth={1.75} />}
          title="Դեռ բավարար տվյալներ չկան այս ժամանակահատվածի համար"
          hint="Ընտրեք ավելի երկար ժամանակահատված կամ շարունակեք պարապել։"
        />
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
    </ProfileCard>
  );
}
