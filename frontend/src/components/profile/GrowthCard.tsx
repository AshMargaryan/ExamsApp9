import type { Growth } from "../../api/profile";
import { EmptyState } from "../ui/EmptyState";

function DeltaLine({ label, value, suffix = "" }: { label: string; value: number; suffix?: string }) {
  const positive = value > 0;
  const flat = value === 0;
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-text-muted">{label}</span>
      <span className={`font-semibold ${flat ? "text-text-muted" : positive ? "text-correct" : "text-incorrect"}`}>
        {positive ? "+" : ""}
        {value}
        {suffix}
      </span>
    </div>
  );
}

export function GrowthCard({ growth }: { growth: Growth }) {
  if (!growth.has_enough_data) {
    return (
      <div className="rounded-[var(--radius)] border border-border bg-surface p-5">
        <p className="mb-3 text-sm font-semibold text-text">📈 Ձեր աճը</p>
        <EmptyState icon="📈" title="Համեմատության համար բավարար տվյալներ դեռ չկան" hint="Շարունակեք սովորել առաջիկա ամիսներին։" />
      </div>
    );
  }

  const summary =
    growth.accuracy_delta !== null && growth.accuracy_delta > 0
      ? "Դուք բարելավվում եք ավելի արագ, քան նախորդ ամիս։"
      : growth.accuracy_delta !== null && growth.accuracy_delta < 0
        ? "Այս ամիս մի փոքր ավելի դանդաղ եք առաջադիմում, քան նախորդում։"
        : "Ձեր տեմպը կայուն է մնում։";

  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-5">
      <p className="mb-1 text-sm font-semibold text-text">📈 Ձեր աճը</p>
      <p className="mb-3 text-xs text-text-muted">Այս ամիս, նախորդ ամսվա համեմատ</p>

      <div className="flex flex-col divide-y divide-border">
        {growth.accuracy_delta !== null && <DeltaLine label="Ճշգրտություն" value={growth.accuracy_delta} suffix="%" />}
        <DeltaLine label="Լուծված հարցեր" value={growth.questions_delta} />
        <DeltaLine label="Ավարտված թեստեր" value={growth.tests_delta} />
        <DeltaLine label="Ուսումնական ժամեր" value={Math.round(growth.study_seconds_delta / 3600)} suffix=" ժ" />
      </div>

      <p className="mt-3 text-sm text-text">{summary}</p>
    </div>
  );
}
