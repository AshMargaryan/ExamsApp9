import { useCallback, useState } from "react";
import { School, Trophy } from "lucide-react";
import * as rankingsApi from "../../api/rankings";
import type { RankingBoard, RankingEntry, RankingScope } from "../../api/rankings";
import { useAuth } from "../../auth/AuthContext";
import { useAsyncResource } from "../../hooks/useAsyncResource";
import { EmptyState } from "../ui/EmptyState";
import { ErrorState } from "../ui/ErrorState";
import { FilterChips } from "../ui/FilterChips";
import { LinkButton } from "../ui/LinkButton";
import { SkeletonRows } from "../ui/Skeleton";
import { RankBadge } from "../ui/RankBadge";
import { DataCard } from "../ui/DataCard";

const TAB_LABELS: Record<RankingScope, string> = { global: "Համաշխարհային", school: "Դպրոց", class: "Դասարան", friends: "Ընկերներ" };

const FETCHERS: Record<RankingScope, () => Promise<RankingBoard>> = {
  global: rankingsApi.fetchGlobalRanking,
  school: rankingsApi.fetchSchoolRanking,
  class: rankingsApi.fetchClassRanking,
  friends: rankingsApi.fetchFriendsRanking,
};

function Row({ entry, isMe }: { entry: RankingEntry; isMe: boolean }) {
  return (
    <div className={`flex items-center gap-3 rounded-md px-2 py-1.5 ${isMe ? "bg-primary/10" : ""}`}>
      <RankBadge rank={entry.rank} />
      {entry.avatar ? (
        <img src={entry.avatar} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" />
      ) : (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-muted text-xs text-text-muted">
          {entry.username.slice(0, 1).toUpperCase()}
        </div>
      )}
      <span className={`min-w-0 flex-1 truncate text-sm ${isMe ? "font-semibold text-text" : "text-text"}`}>
        {isMe ? "Դուք" : entry.username}
      </span>
      <span className="text-xs text-text-muted">{entry.xp} XP</span>
    </div>
  );
}

export function MonthlyRankingCard() {
  const { user } = useAuth();
  const [scope, setScope] = useState<RankingScope>("global");
  const boardResource = useAsyncResource<RankingBoard>(
    useCallback(() => FETCHERS[scope](), [scope]),
    [scope],
  );
  const board = boardResource.data;

  return (
    <DataCard
      icon={Trophy}
      title="Ամսվա մրցույթ"
      action={<LinkButton to="/rankings">Ամբողջը →</LinkButton>}
    >
      <FilterChips
        label="Դասակարգման շրջանակ"
        size="sm"
        className="mb-[var(--space-4)]"
        options={(Object.keys(TAB_LABELS) as RankingScope[]).map((s) => ({ value: s, label: TAB_LABELS[s] }))}
        value={scope}
        onChange={setScope}
      />

      {boardResource.isLoading && <SkeletonRows count={4} />}

      {boardResource.error !== null && !boardResource.isLoading && (
        <ErrorState size="sm" title="Չհաջողվեց բեռնել դասակարգումը։" onRetry={boardResource.retry} />
      )}

      {board?.no_school && (
        <EmptyState
          size="sm"
          icon={<School size={22} strokeWidth={1.75} />}
          title="Նշեք ձեր դպրոցը՝ այս դասակարգումը տեսնելու համար"
        />
      )}
      {board?.no_grade && (
        <EmptyState
          size="sm"
          icon={<School size={22} strokeWidth={1.75} />}
          title="Նշեք ձեր դասարանը՝ այս դասակարգումը տեսնելու համար"
        />
      )}

      {board && !board.no_school && !board.no_grade && (
        <>
          {board.my_rank === null ? (
            <EmptyState
              size="sm"
              icon={<Trophy size={22} strokeWidth={1.75} />}
              title="Դեռ մրցույթի մեջ չեք"
              hint={scope === "friends" ? "Ավելացրեք ընկերներ՝ մրցելու համար։" : "Լուծեք հարցեր՝ XP վաստակելու համար։"}
            />
          ) : (
            <div className="flex flex-col gap-0.5">
              {(board.nearby.length > 0 ? board.nearby : board.results).map((entry) => (
                <Row key={entry.user_id} entry={entry} isMe={entry.user_id === user?.id} />
              ))}
            </div>
          )}
        </>
      )}
    </DataCard>
  );
}
