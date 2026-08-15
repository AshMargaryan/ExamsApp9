import type { RankingBoard } from "../../api/rankings";
import { RankingRow } from "./RankingRow";

export function StickyOwnRow({ board, meId }: { board: RankingBoard; meId: number | undefined }) {
  if (board.my_rank == null || board.my_rank <= 50) return null;
  const mine = board.nearby.find((e) => e.user_id === meId);
  if (!mine) return null;

  return (
    <div className="sticky bottom-4 z-10 mt-4">
      <p className="mb-1 text-center text-xs tracking-wide text-text-muted">— ԻՄ ԴԻՐՔԸ —</p>
      <div className="overflow-hidden rounded-[var(--radius)] border-2 border-primary bg-surface shadow-lg">
        <RankingRow entry={mine} isMe />
      </div>
    </div>
  );
}
