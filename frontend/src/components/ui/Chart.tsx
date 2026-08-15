import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts";

export interface ChartSeries {
  key: string;
  label: string;
  /** Defaults to var(--color-primary) — pass var(--color-accent) etc. for a second series. */
  color?: string;
}

interface ChartTooltipContentProps {
  active?: boolean;
  label?: string | number;
  payload?: { dataKey?: string | number; name?: string; value?: string | number; color?: string }[];
}

function ChartTooltipContent({ active, payload, label }: ChartTooltipContentProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="animate-[fade-in_var(--motion-micro)_var(--ease-out)] rounded-[var(--radius)] border border-border bg-surface px-3 py-2 shadow-lg">
      <p className="mb-1 text-xs font-semibold text-text">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="text-xs text-text-muted">
          <span className="font-medium" style={{ color: entry.color }}>
            {entry.name}
          </span>
          : {entry.value}
        </p>
      ))}
    </div>
  );
}

interface ChartProps {
  data: Record<string, unknown>[];
  xKey: string;
  series: ChartSeries[];
  height?: number;
  yWidth?: number;
}

/** Generalizes the recharts LineChart pattern already used in profile/PerformanceTrends.tsx
 * (theme-variable grid/tick colors, premium animated tooltip) so new chart usages — Phase 3's
 * progress chart — don't hand-roll flexbox bars the way the older WeeklyProgressChart does. */
export function Chart({ data, xKey, series, height = 224, yWidth = 32 }: ChartProps) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
          <XAxis dataKey={xKey} tick={{ fill: "var(--color-text-muted)", fontSize: 11 }} />
          <YAxis tick={{ fill: "var(--color-text-muted)", fontSize: 11 }} width={yWidth} />
          <RechartsTooltip content={<ChartTooltipContent />} />
          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color ?? "var(--color-primary)"}
              strokeWidth={2}
              dot={false}
              connectNulls
              animationDuration={600}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
