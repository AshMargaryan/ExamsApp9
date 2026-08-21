import { BarChart3 } from "lucide-react";
import type { Growth, LearningStats } from "../../api/profile";
import { StatTile } from "../ui/StatTile";
import { DataCard } from "../ui/DataCard";

/*
  The profile's answer to "how am I doing".

  This card used to sit above a separate `GrowthCard` that listed
  `accuracy_delta`, `questions_delta`, `tests_delta` and
  `study_seconds_delta` as four rows — three of which this card *already*
  prints as the `delta` under the very numbers they describe. The same three
  figures appeared twice on one screen, ~1900px apart, in two different
  notations.

  Attaching a change to the value it changed is the better of the two, so
  that is what survived. The one thing `GrowthCard` said that this did not —
  the plain-language verdict on the month — is folded in below, and the
  fourth delta (study hours) now has a tile of its own.
*/

function formatDelta(value: number, suffix = ""): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value}${suffix} այս ամիս`;
}

function verdict(growth: Growth): string {
  if (growth.accuracy_delta === null) return "Քո տեմպը կայուն է մնում։";
  if (growth.accuracy_delta > 0) return "Դու բարելավվում ես ավելի արագ, քան նախորդ ամիս։";
  if (growth.accuracy_delta < 0) return "Այս ամիս մի փոքր ավելի դանդաղ ես առաջադիմում, քան նախորդում։";
  return "Քո տեմպը կայուն է մնում։";
}

export function PerformanceOverview({ stats, growth }: { stats: LearningStats; growth: Growth | null }) {
  const hasDeltas = growth?.has_enough_data ?? false;
  const studyHours = stats.weekly_study_seconds / 3600;

  return (
    <DataCard
      icon={BarChart3}
      title="Կատարողականություն"
      description={hasDeltas ? "Փոփոխությունը՝ նախորդ ամսվա համեմատ" : "Ընդհանուր՝ սկզբից ի վեր"}
    >
      <div className="grid grid-cols-2 gap-[var(--space-4)] sm:grid-cols-4">
        <StatTile
          label="Լուծված հարցեր"
          value={String(stats.questions_solved)}
          delta={hasDeltas ? formatDelta(growth!.questions_delta) : undefined}
        />
        <StatTile
          label="Ճշգրտություն"
          value={`${stats.accuracy_percentage}%`}
          delta={hasDeltas && growth!.accuracy_delta !== null ? formatDelta(growth!.accuracy_delta, "%") : undefined}
        />
        <StatTile
          label="Ավարտված թեստեր"
          value={String(stats.tests_completed)}
          delta={hasDeltas ? formatDelta(growth!.tests_delta) : undefined}
        />
        <StatTile
          label="Պարապանք վերջին շաբաթում"
          value={`${studyHours.toFixed(1)} ժ`}
          delta={
            hasDeltas
              ? formatDelta(Math.round(growth!.study_seconds_delta / 3600), " ժ")
              : undefined
          }
        />
      </div>

      {growth && (
        <p className="mt-[var(--space-4)] text-[length:var(--text-sm)] leading-[var(--leading-body)] text-text-muted">
          {growth.has_enough_data
            ? verdict(growth)
            : "Համեմատության համար բավարար տվյալներ դեռ չկան — շարունակիր սովորել առաջիկա շաբաթներին։"}
        </p>
      )}
    </DataCard>
  );
}
