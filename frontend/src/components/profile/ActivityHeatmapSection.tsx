import { useMemo } from "react";
import { CalendarDays } from "lucide-react";
import type { ActivityDay } from "../../api/profile";
import { ActivityHeatmap } from "../ActivityHeatmap";
import { EmptyState } from "../ui/EmptyState";
import { SkeletonRows } from "../ui/Skeleton";
import { DataCard } from "../ui/DataCard";

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
    <DataCard
      icon={CalendarDays}
      title="Ակտիվության քարտեզ"
      description="Վերջին 365 օրը"
    >
      {activityDays === null ? (
        <SkeletonRows count={3} />
      ) : stats && stats.totalActiveDays === 0 ? (
        <EmptyState
          icon={<CalendarDays size={22} strokeWidth={1.75} />}
          title="Դեռ ակտիվություն չկա"
          hint="Առաջին իսկ պարապմունքից հետո այստեղ կհայտնվի քո օրերի քարտեզը։"
        />
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
    </DataCard>
  );
}
