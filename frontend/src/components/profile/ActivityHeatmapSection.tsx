import { useMemo } from "react";
import type { ActivityDay } from "../../api/profile";
import { ActivityHeatmap } from "../ActivityHeatmap";
import { EmptyState } from "../ui/EmptyState";

export function ActivityHeatmapSection({ activityDays }: { activityDays: ActivityDay[] | null }) {
  const stats = useMemo(() => {
    if (!activityDays) return null;
    const activeDays = activityDays.filter((d) => d.minutes > 0 || d.questions_solved > 0 || d.tests_completed > 0);
    const mostActive = [...activityDays].sort((a, b) => b.minutes - a.minutes)[0];
    return {
      totalActiveDays: activeDays.length,
      mostActiveDate: mostActive && mostActive.minutes > 0 ? mostActive.date : null,
    };
  }, [activityDays]);

  const points =
    activityDays?.map((d) => ({
      date: d.date,
      count: d.questions_solved + d.tests_completed * 5,
      tooltip: `${d.date}՝ ${d.minutes} ր, ${d.questions_solved} հարց, ${d.tests_completed} թեստ`,
    })) ?? [];

  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-5">
      <p className="mb-3 text-sm font-semibold text-text">📅 Ակտիվության քարտեզ</p>

      {activityDays === null ? (
        <p className="text-sm text-text-muted">Բեռնվում է...</p>
      ) : stats && stats.totalActiveDays === 0 ? (
        <EmptyState icon="📅" title="Դեռ ակտիվություն չկա" />
      ) : (
        <>
          <ActivityHeatmap points={points} rangeDays={365} />
          {stats && (
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-text-muted">
              <span>Ակտիվ օրեր՝ {stats.totalActiveDays}</span>
              {stats.mostActiveDate && <span>Ամենաակտիվ օր՝ {stats.mostActiveDate}</span>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
