import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from "recharts";

export interface SubjectRadarPoint {
  subject_name: string;
  avg_score: number | null;
}

const MIN_AXES_FOR_RADAR = 3;

/** Spider chart comparing average score across subjects — used for both a
 * parent's child dashboard and a friend's progress dashboard (see
 * apps.parents.services.build_subject_performance, reused for both). Falls
 * back to a flat completion-bar list when there aren't enough scored
 * subjects for a radar to read (needs >=3 axes). */
export function SubjectRadarChart({ subjects }: { subjects: SubjectRadarPoint[] }) {
  const scored = subjects.filter((s) => s.avg_score !== null);

  if (scored.length === 0) {
    return <p className="text-sm text-text-muted">Դեռ գնահատված առարկաներ չկան։</p>;
  }

  if (scored.length < MIN_AXES_FOR_RADAR) {
    return (
      <div className="flex flex-col gap-2">
        {scored.map((s) => (
          <div key={s.subject_name} className="flex items-center justify-between gap-3 text-sm">
            <span className="text-text">{s.subject_name}</span>
            <div className="flex flex-1 items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${s.avg_score}%` }} />
              </div>
              <span className="w-10 shrink-0 text-right text-text-muted">{s.avg_score}%</span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const chartData = scored.map((s) => ({ dimension: s.subject_name, value: s.avg_score }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={chartData} outerRadius="75%">
          <PolarGrid stroke="var(--color-border)" />
          <PolarAngleAxis dataKey="dimension" tick={{ fill: "var(--color-text-muted)", fontSize: 11 }} />
          <Radar dataKey="value" stroke="var(--color-primary)" fill="var(--color-primary)" fillOpacity={0.35} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
