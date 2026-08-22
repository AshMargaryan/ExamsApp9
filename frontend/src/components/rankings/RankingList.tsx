import { Link } from "react-router-dom";
import { TrendingUp } from "lucide-react";
import type { RankingBoard } from "../../api/rankings";
import { RankingRow } from "./RankingRow";

export function RankingList({ board, meId }: { board: RankingBoard; meId: number | undefined }) {
  if (board.no_school) {
    return (
      <p className="p-6 text-center text-text-muted">
        Քո պրոֆիլում դպրոց նշված չէ, ուստի դպրոցական դասակարգումը հասանելի չէ։ Ավելացրու դպրոցը{" "}
        <Link to="/profile" className="text-primary hover:underline">
          պրոֆիլում
        </Link>
        ։
      </p>
    );
  }

  if (board.no_grade) {
    return (
      <p className="p-6 text-center text-text-muted">
        Քո պրոֆիլում դասարան նշված չէ, ուստի դասարանի դասակարգումը հասանելի չէ։ Ավելացրու դասարանը{" "}
        <Link to="/profile" className="text-primary hover:underline">
          պրոֆիլում
        </Link>
        ։
      </p>
    );
  }

  if (board.still_growing) {
    return (
      <p className="flex flex-col items-center gap-2 p-6 text-center text-text-muted">
        <TrendingUp size={22} strokeWidth={1.75} />
        Այս առարկայի դասակարգումը դեռ աճում է։ Եղեք առաջիններից մեկը՝ պարապելով այս թեմայով։
      </p>
    );
  }

  if (board.results.length === 0) {
    return (
      <p className="p-6 text-center text-text-muted">
        Այս ամիս դեռ ոչ ոք միավոր չի վաստակել։ Եղեք առաջինը՝ պարապելով և թեստեր հանձնելով։
      </p>
    );
  }

  // Top 3 already shown on the podium above the list — avoid showing them twice.
  const rest = board.results.filter((e) => e.rank > 3);
  if (rest.length === 0) return null;

  return (
    <div className="border-t border-border">
      {rest.map((entry) => (
        <RankingRow key={entry.user_id} entry={entry} isMe={entry.user_id === meId} />
      ))}
    </div>
  );
}
