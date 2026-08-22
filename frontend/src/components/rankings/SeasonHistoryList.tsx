import type { RankingAward } from "../../api/rankings";
import { rankTier } from "../../lib/rankTier";

export function SeasonHistoryList({ awards }: { awards: RankingAward[] }) {
  if (awards.length === 0) {
    return (
      <p className="p-4 text-center text-sm text-text-muted">
        Առայժմ սեզոնային մեդալներ չկան։ Հասիր թոփ 3՝ ամսվա վերջում մեդալ ստանալու համար։
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {awards.map((a) => {
        const tier = rankTier(a.rank);
        return (
          <div key={a.id} className="flex items-center gap-3 rounded-[var(--radius-md)] border border-border bg-bg px-3 py-2">
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-bold tabular-nums"
              style={
                tier
                  ? { color: tier.text, backgroundColor: tier.bg, border: `1px solid ${tier.line}` }
                  : { color: "var(--color-text-muted)", backgroundColor: "var(--color-surface-muted)" }
              }
            >
              {a.rank}
            </span>
            <p className="min-w-0 flex-1 truncate text-sm text-text">{a.title}</p>
          </div>
        );
      })}
    </div>
  );
}
