import { useEffect, useState } from "react";
import * as teachingApi from "../../api/teaching";
import type { ClassTrends, TrendRange } from "../../api/teaching";
import { SegmentedControl } from "../SegmentedControl";
import { Chart } from "../ui/Chart";
import { EmptyState } from "../ui/EmptyState";
import { Skeleton } from "../ui/Skeleton";
import { TrendingUp } from "lucide-react";

/*
  Class activity over time.

  Two charts, each answering one question a teacher actually asks — "is the
  class working?" and "are they getting it right?" — rather than a wall of
  decorative graphs.

  Buckets with no activity carry null (not zero) accuracy, and Chart's
  `connectNulls` draws straight through them, so a quiet weekend reads as a
  gap in the data instead of a crash to 0%.
*/

const RANGE_OPTIONS: { value: TrendRange; label: string }[] = [
  { value: "week", label: "Շաբաթ" },
  { value: "month", label: "Ամիս" },
  { value: "semester", label: "Կիսամյակ" },
];

function formatBucket(date: string, granularity: "day" | "week") {
  const d = new Date(date);
  const label = d.toLocaleDateString("hy-AM", { day: "numeric", month: "short" });
  return granularity === "week" ? `${label}—` : label;
}

export function ClassTrendsPanel() {
  const [range, setRange] = useState<TrendRange>("month");
  const [trends, setTrends] = useState<ClassTrends | null>(null);

  useEffect(() => {
    let active = true;
    setTrends(null);
    teachingApi.fetchClassTrends(range).then((t) => {
      if (active) setTrends(t);
    });
    return () => {
      active = false;
    };
  }, [range]);

  const rows =
    trends?.buckets.map((b) => ({
      bucket: formatBucket(b.date, trends.granularity),
      questions: b.questions,
      minutes: b.study_minutes,
      accuracy: b.accuracy,
      mistakes: b.mistakes,
    })) ?? [];

  const hasAnyActivity = trends?.buckets.some((b) => b.questions > 0 || b.study_minutes > 0 || b.mistakes > 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <SegmentedControl options={RANGE_OPTIONS} value={range} onChange={setRange} />
      </div>

      {!trends ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-[200px] w-full" />
          <Skeleton className="h-[200px] w-full" />
        </div>
      ) : !hasAnyActivity ? (
        <EmptyState
          icon={<TrendingUp size={26} strokeWidth={1.5} aria-hidden />}
          title="Այս ժամանակահատվածում ակտիվություն չկա"
          hint="Երբ աշակերտները սկսեն լուծել խնդիրներ, առաջընթացը կհայտնվի այստեղ։"
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-[var(--radius)] border border-border bg-surface p-4">
            <p className="mb-1 text-sm font-medium text-text">Ծանրաբեռնվածություն</p>
            <p className="mb-3 text-xs text-text-muted">Լուծված հարցեր և սովորելու րոպեներ</p>
            <Chart
              data={rows}
              xKey="bucket"
              height={200}
              series={[
                { key: "questions", label: "Հարցեր", color: "var(--color-primary)" },
                { key: "minutes", label: "Րոպեներ", color: "var(--color-accent)" },
              ]}
            />
          </div>

          <div className="rounded-[var(--radius)] border border-border bg-surface p-4">
            <p className="mb-1 text-sm font-medium text-text">Ճշգրտություն և սխալներ</p>
            <p className="mb-3 text-xs text-text-muted">
              Ճշգրտությունը ցույց չի տրվում այն օրերին, երբ խնդիրներ չեն լուծվել
            </p>
            <Chart
              data={rows}
              xKey="bucket"
              height={200}
              series={[
                { key: "accuracy", label: "Ճշգրտություն %", color: "var(--color-correct)" },
                { key: "mistakes", label: "Սխալներ", color: "var(--color-incorrect)" },
              ]}
            />
          </div>
        </div>
      )}
    </div>
  );
}
