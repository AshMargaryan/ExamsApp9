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

/*
  A line chart, on recharts.

  Use it for a continuous trend on an analytics surface — a score over time, a
  class average across weeks — where the line between two points means
  something.

  **Not for bars, and not for the dashboard.** Importing this module pulls the
  ~354KB recharts chunk into whatever imports it, so it belongs on routes that
  already earn that cost (profile, analytics, the parent and teacher
  dashboards). For a small categorical summary — "how much in each of the last
  eight weeks" — use `ui/BarChart`, which has no library behind it and draws
  the mark that question actually calls for. See its header for why the two
  cannot be one component with a `variant` prop.
*/
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
