import type { DashboardStats } from "../../api/teaching";

function StatCard({
  label,
  value,
  tone = "default",
  pulse = false,
}: {
  label: string;
  value: number;
  tone?: "default" | "primary" | "danger" | "success";
  pulse?: boolean;
}) {
  const toneClass =
    tone === "danger"
      ? "text-incorrect"
      : tone === "success"
        ? "text-correct"
        : tone === "primary"
          ? "text-primary"
          : "text-text";

  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-4">
      <p className="flex items-center gap-2 text-sm text-text-muted">
        {label}
        {pulse && value > 0 && (
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-correct opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-correct" />
          </span>
        )}
      </p>
      <p className={`mt-1 text-3xl font-bold ${toneClass}`}>{value}</p>
    </div>
  );
}

export function DashboardStatCards({ stats }: { stats: DashboardStats }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard label="Աշակերտներ" value={stats.student_count} />
      <StatCard
        label="Սպասում է հաստատման"
        value={stats.pending_review_count}
        tone={stats.pending_review_count > 0 ? "primary" : "default"}
      />
      <StatCard
        label="Ուշացած առաջադրանք"
        value={stats.overdue_count}
        tone={stats.overdue_count > 0 ? "danger" : "default"}
      />
      <StatCard label="Հիմա սովորում են" value={stats.online_now_count} tone="success" pulse />
    </div>
  );
}
