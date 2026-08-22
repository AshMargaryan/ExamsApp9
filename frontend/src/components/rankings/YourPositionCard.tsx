import { Link } from "react-router-dom";
import { EyeOff, TrendingUp, Trophy } from "lucide-react";
import type { RankingBoard } from "../../api/rankings";
import { rankTier } from "../../lib/rankTier";

export function YourPositionCard({
  board,
  meId,
  hidden,
}: {
  board: RankingBoard;
  meId: number | undefined;
  hidden: boolean;
}) {
  if (board.my_rank == null || board.my_xp == null) {
    return (
      <div className="border-b border-border bg-surface-muted p-6 text-center">
        <p className="flex items-center justify-center gap-2 text-lg font-semibold text-text">
          <Trophy size={20} strokeWidth={1.75} /> Քո մրցակցությունը սկսվում է այստեղ
        </p>
        <p className="mt-1 text-sm text-text-muted">
          Ավարտիր առաջին ուսումնական առաջադրանքը՝ դասակարգում մտնելու համար։
        </p>
        <Link
          to="/practice"
          className="mt-3 inline-block rounded-[var(--radius)] bg-primary px-4 py-2 text-sm font-medium text-primary-contrast hover:bg-primary-hover"
        >
          Սկսել պարապել →
        </Link>
      </div>
    );
  }

  const isFirst = board.my_rank === 1;
  const tier = rankTier(board.my_rank);
  const myIndex = board.nearby.findIndex((e) => e.user_id === meId);
  const above = myIndex > 0 ? board.nearby[myIndex - 1] : null;
  const below = myIndex >= 0 && myIndex < board.nearby.length - 1 ? board.nearby[myIndex + 1] : null;

  const gapLine =
    isFirst && below
      ? `${board.my_xp - below.xp} XP առաջ #2-ից`
      : above
        ? `${above.xp - board.my_xp} XP մինչև #${board.my_rank - 1}`
        : null;

  return (
    <div
      className="border-b border-border p-6"
      style={tier ? { background: `linear-gradient(180deg, ${tier.bg} 0%, transparent 140%)` } : undefined}
    >
      <div className="flex flex-wrap items-center gap-5">
        <p
          className="font-mono text-6xl font-bold leading-none tabular-nums"
          style={{ color: tier ? tier.text : "var(--color-text)" }}
        >
          <span className="mr-0.5 align-top text-2xl opacity-60">#</span>
          {board.my_rank}
        </p>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-base font-semibold text-text">
              {isFirst ? "Դու առաջատարն ես" : `Դու #${board.my_rank}-ն ես`}
            </p>
            {hidden && (
              <span className="flex items-center gap-1 rounded-full border border-border bg-surface-muted px-3 py-1 text-xs text-text-muted">
                <EyeOff size={12} strokeWidth={1.75} /> Թաքնված ես մյուսներից
              </span>
            )}
          </div>
          <p className="font-mono text-sm tabular-nums text-text-muted">{board.my_xp} XP այս ամիս</p>
          {gapLine && (
            <p className="mt-2 flex items-center gap-1.5 font-mono text-sm font-bold tabular-nums text-text">
              <TrendingUp size={14} strokeWidth={1.75} /> {gapLine}
            </p>
          )}
          {isFirst && (
            <p className="mt-1 text-sm text-text-muted">Հաջորդ նպատակը՝ պահպանել #1-ը մինչև ամսվա վերջ</p>
          )}
          <Link
            to="/practice"
            className="mt-3 inline-block rounded-[var(--radius)] bg-primary px-4 py-2 text-sm font-medium text-primary-contrast hover:bg-primary-hover"
          >
            Շարունակել →
          </Link>
        </div>
      </div>
    </div>
  );
}
