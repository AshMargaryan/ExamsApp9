import { Clock, Trophy } from "lucide-react";

function daysRemaining(year: number, month: number): number {
  const lastDay = new Date(year, month, 0).getDate(); // `month` is 1-indexed; day 0 of the next month = last day of this one
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;
  return isCurrentMonth ? Math.max(0, lastDay - today.getDate()) : 0;
}

export function SeasonHeader({ monthLabel, year, month }: { monthLabel: string; year: number; month: number }) {
  const daysLeft = daysRemaining(year, month);
  const isFinalDay = daysLeft === 0;
  const isFinalWeek = daysLeft > 0 && daysLeft <= 7;

  return (
    <div className="mb-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Դասակարգում · {monthLabel}</p>
      <h1 className="mt-0.5 flex items-center gap-2 text-3xl font-bold tracking-tight text-text">
        <Trophy size={28} strokeWidth={1.75} /> Դասակարգում
      </h1>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-text-muted">
        <span>Թոփ 50 սովորողներ</span>
        <span>·</span>
        <span
          className={`flex items-center gap-1 font-mono tabular-nums ${
            isFinalDay ? "font-bold text-incorrect" : isFinalWeek ? "font-bold text-primary" : ""
          }`}
        >
          <Clock size={13} strokeWidth={1.75} /> {isFinalDay ? "Վերջին օրը" : `${daysLeft} օր մնացել է`}
        </span>
      </div>
    </div>
  );
}
