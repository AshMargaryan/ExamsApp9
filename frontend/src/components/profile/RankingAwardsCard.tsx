import { Medal } from "lucide-react";
import type { RankingAward } from "../../api/rankings";
import { EmptyState } from "../ui/EmptyState";
import { ErrorState } from "../ui/ErrorState";
import { RankBadge } from "../ui/RankBadge";
import { SkeletonRows } from "../ui/Skeleton";
import { DataCard } from "../ui/DataCard";

/*
  Season medals. Extracted out of ProfilePage, where it was the one module
  written inline in the page body — with its own emoji medal map, its own
  bare `Բեռնվում է...` and its own card chrome, so it drifted from the
  fifteen cards around it.
*/

export function RankingAwardsCard({
  awards,
  isLoading,
  error,
  onRetry,
}: {
  awards: RankingAward[] | null;
  isLoading: boolean;
  error: unknown | null;
  onRetry: () => void;
}) {
  return (
    <DataCard
      icon={Medal}
      title="Դասակարգման մեդալներ"
      description={awards && awards.length > 0 ? `Ընդամենը՝ ${awards.length}` : undefined}
    >
      {isLoading && <SkeletonRows count={2} />}

      {error !== null && !isLoading && (
        <ErrorState size="sm" title="Չհաջողվեց բեռնել մեդալները։" onRetry={onRetry} />
      )}

      {awards?.length === 0 && (
        <EmptyState
          size="sm"
          icon={<Medal size={22} strokeWidth={1.75} />}
          title="Դեռ մեդալներ չկան"
          hint="Ամսվա վերջում թոփ 3-ի մեջ մտնողները ստանում են մեդալ։"
        />
      )}

      {awards && awards.length > 0 && (
        <ul className="flex flex-col gap-[var(--space-2)]">
          {awards.map((award) => (
            <li
              key={award.id}
              className="flex items-center gap-[var(--space-3)] rounded-[var(--radius-md)] border border-border bg-bg px-[var(--space-3)] py-[var(--space-2)]"
            >
              <RankBadge rank={award.rank} />
              <span className="min-w-0 flex-1 truncate text-[length:var(--text-sm)] font-medium text-text">
                {award.title}
              </span>
            </li>
          ))}
        </ul>
      )}
    </DataCard>
  );
}
