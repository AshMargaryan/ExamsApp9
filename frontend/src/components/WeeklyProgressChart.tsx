import type { WeeklyProgressPoint } from "../api/practice";
import { BarChart, type BarChartPoint } from "./ui/BarChart";
import { EmptyState } from "./ui/EmptyState";

/*
  Eight weeks of "questions solved", split into correct and incorrect.

  This used to be a hand-rolled bar strip, deliberately, because `ui/Chart` is
  a recharts **line** chart and neither the mark nor the ~354KB chunk belongs
  on the dashboard. Both of those reasons still hold — see `ui/BarChart`,
  which is that strip promoted into the kit with no library behind it, so the
  next surface that wants bars has one instead of hand-rolling a third.
*/

function weekLabel(weekStart: string): string {
  return new Date(weekStart).toLocaleDateString("hy-AM", { day: "numeric", month: "short" });
}

export function WeeklyProgressChart({ points }: { points: WeeklyProgressPoint[] }) {
  const totalSolved = points.reduce((sum, p) => sum + p.solved, 0);
  const totalCorrect = points.reduce((sum, p) => sum + p.correct, 0);
  const activeWeeks = points.filter((p) => p.solved > 0).length;

  const bars: BarChartPoint[] = points.map((p) => ({
    id: p.week_start,
    label: weekLabel(p.week_start),
    value: p.solved,
    highlight: p.correct,
    readout: `${weekLabel(p.week_start)}՝ ${p.solved} հարց, ${p.correct} ճիշտ`,
  }));

  return (
    <BarChart
      points={bars}
      height={120}
      summary={`Վերջին 8 շաբաթում լուծված է ${totalSolved} հարց, որից ${totalCorrect} ճիշտ։ Պարապել ես ${activeWeeks} շաբաթ։`}
      empty={
        <EmptyState
          size="sm"
          title="Այս 8 շաբաթում դեռ պարապմունք չկա"
          hint="Առաջին իսկ լուծված հարցից հետո այստեղ կհայտնվի շաբաթական սյունակը։"
        />
      }
    />
  );
}
