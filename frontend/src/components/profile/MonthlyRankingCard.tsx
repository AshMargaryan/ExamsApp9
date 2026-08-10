import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import * as rankingsApi from "../../api/rankings";
import type { RankingBoard, RankingEntry, RankingScope } from "../../api/rankings";
import { useAuth } from "../../auth/AuthContext";
import { EmptyState } from "../ui/EmptyState";

const MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
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
      <span className="flex h-7 w-7 shrink-0 items-center justify-center text-sm font-semibold text-text-muted">
        {MEDALS[entry.rank] ?? `#${entry.rank}`}
      </span>
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
  const [board, setBoard] = useState<RankingBoard | null>(null);

  useEffect(() => {
    setBoard(null);
    FETCHERS[scope]().then(setBoard);
  }, [scope]);

  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-text">🏆 Ամսվա մրցույթ</p>
        <Link to="/rankings" className="text-xs text-primary hover:underline">
          Ամբողջը →
        </Link>
      </div>

      <div className="mb-3 flex gap-1">
        {(Object.keys(TAB_LABELS) as RankingScope[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setScope(s)}
            className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
              scope === s ? "bg-primary text-primary-contrast" : "text-text-muted hover:bg-surface-muted"
            }`}
          >
            {TAB_LABELS[s]}
          </button>
        ))}
      </div>

      {board === null && <p className="text-sm text-text-muted">Բեռնվում է...</p>}

      {board?.no_school && <EmptyState icon="🏫" title="Նշեք ձեր դպրոցը՝ այս դասակարգումը տեսնելու համար" />}
      {board?.no_grade && <EmptyState icon="🏫" title="Նշեք ձեր դասարանը՝ այս դասակարգումը տեսնելու համար" />}

      {board && !board.no_school && !board.no_grade && (
        <>
          {board.my_rank === null ? (
            <EmptyState
              icon="🏆"
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
    </div>
  );
}
