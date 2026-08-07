import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import * as rankingsApi from "../api/rankings";
import type { RankingBoard, RankingScope, SchoolComparisonBoard } from "../api/rankings";
import { useAuth } from "../auth/AuthContext";

type Tab = RankingScope | "schools";

const MONTH_NAMES = [
  "Հունվար", "Փետրվար", "Մարտ", "Ապրիլ", "Մայիս", "Հունիս",
  "Հուլիս", "Օգոստոս", "Սեպտեմբեր", "Հոկտեմբեր", "Նոյեմբեր", "Դեկտեմբեր",
];

const MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

function RankBadge({ rank }: { rank: number }) {
  const medal = MEDALS[rank];
  return (
    <span
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
        medal ? "text-xl" : "bg-surface-muted text-text-muted"
      }`}
    >
      {medal ?? rank}
    </span>
  );
}

function RankingList({ board, meId }: { board: RankingBoard; meId: number | undefined }) {
  if (board.no_school) {
    return (
      <p className="rounded-[var(--radius)] border border-border bg-surface p-6 text-center text-text-muted">
        Ձեր պրոֆիլում դպրոց նշված չէ, ուստի դպրոցական դասակարգումը հասանելի չէ։ Ավելացրեք դպրոցը{" "}
        <Link to="/profile" className="text-primary hover:underline">
          պրոֆիլում
        </Link>
        ։
      </p>
    );
  }

  if (board.no_grade) {
    return (
      <p className="rounded-[var(--radius)] border border-border bg-surface p-6 text-center text-text-muted">
        Ձեր պրոֆիլում դասարան նշված չէ, ուստի դասարանի դասակարգումը հասանելի չէ։ Ավելացրեք դասարանը{" "}
        <Link to="/profile" className="text-primary hover:underline">
          պրոֆիլում
        </Link>
        ։
      </p>
    );
  }

  if (board.results.length === 0) {
    return (
      <p className="rounded-[var(--radius)] border border-border bg-surface p-6 text-center text-text-muted">
        Այս ամիս դեռ ոչ ոք միավոր չի վաստակել։ Եղեք առաջինը՝ պարապելով և թեստեր հանձնելով։
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-[var(--radius)] border border-border bg-surface">
      {board.results.map((entry) => {
        const isMe = entry.user_id === meId;
        return (
          <div
            key={entry.user_id}
            className={`flex items-center gap-3 border-b border-border p-3 last:border-b-0 ${
              isMe ? "bg-primary/10" : ""
            }`}
          >
            <RankBadge rank={entry.rank} />
            {entry.avatar ? (
              <img src={entry.avatar} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-muted text-text-muted">
                {entry.username.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-text">
                {entry.first_name || entry.username} {entry.last_name}
                {isMe && <span className="ml-1 text-xs text-primary">(Դուք)</span>}
              </p>
              <p className="truncate text-xs text-text-muted">
                {entry.school?.name ?? "—"} · Մակարդակ {entry.level}
              </p>
            </div>
            <p className="shrink-0 text-sm font-semibold text-text">{entry.xp} XP</p>
          </div>
        );
      })}
    </div>
  );
}

function SchoolComparisonList({ board, mySchoolId }: { board: SchoolComparisonBoard; mySchoolId: number | undefined }) {
  if (board.results.length === 0) {
    return (
      <p className="rounded-[var(--radius)] border border-border bg-surface p-6 text-center text-text-muted">
        Այս ամիս դեռ ոչ մի դպրոց միավոր չի վաստակել։
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-[var(--radius)] border border-border bg-surface">
      {board.results.map((entry) => {
        const isMySchool = entry.school.id === mySchoolId;
        return (
          <div
            key={entry.school.id}
            className={`flex items-center gap-3 border-b border-border p-3 last:border-b-0 ${
              isMySchool ? "bg-primary/10" : ""
            }`}
          >
            <RankBadge rank={entry.rank} />
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-muted text-text-muted">
              🏫
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-text">
                {entry.school.name}
                {isMySchool && <span className="ml-1 text-xs text-primary">(Ձեր դպրոցը)</span>}
              </p>
              <p className="truncate text-xs text-text-muted">
                {entry.school.marz || "—"} · {entry.student_count} սովորող
              </p>
            </div>
            <p className="shrink-0 text-sm font-semibold text-text">{entry.total_xp} XP</p>
          </div>
        );
      })}
    </div>
  );
}

export function RankingsPage() {
  const { user } = useAuth();
  const [scope, setScope] = useState<Tab>("global");
  const [global, setGlobal] = useState<RankingBoard | null>(null);
  const [school, setSchool] = useState<RankingBoard | null>(null);
  const [classBoard, setClassBoard] = useState<RankingBoard | null>(null);
  const [schools, setSchools] = useState<SchoolComparisonBoard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    rankingsApi.fetchGlobalRanking().then(setGlobal).catch(() => setError("Չհաջողվեց բեռնել դասակարգումը։"));
    rankingsApi.fetchSchoolRanking().then(setSchool).catch(() => setError("Չհաջողվեց բեռնել դասակարգումը։"));
    rankingsApi.fetchClassRanking().then(setClassBoard).catch(() => setError("Չհաջողվեց բեռնել դասակարգումը։"));
    rankingsApi.fetchSchoolComparison().then(setSchools).catch(() => setError("Չհաջողվեց բեռնել դասակարգումը։"));
  }, []);

  const board =
    scope === "global" ? global : scope === "school" ? school : scope === "class" ? classBoard : null;
  const activeBoard = scope === "schools" ? schools : board;
  const now = new Date();
  const monthLabel = activeBoard
    ? `${MONTH_NAMES[activeBoard.month - 1]} ${activeBoard.year}`
    : `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;

  return (
    <div className="mx-auto min-h-screen max-w-2xl bg-bg px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text">🏆 Դասակարգում</h1>
          <p className="text-sm text-text-muted">Թոփ 50 սովորողներ · {monthLabel} · Վերականգնվում է ամեն ամսվա սկզբին</p>
        </div>
        <Link to="/" className="text-sm text-primary hover:underline">
          ← Գլխավոր
        </Link>
      </div>

      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setScope("global")}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            scope === "global" ? "bg-primary text-primary-contrast" : "border border-border text-text-muted hover:bg-surface-muted"
          }`}
        >
          Համադպրոցական
        </button>
        <button
          type="button"
          onClick={() => setScope("school")}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            scope === "school" ? "bg-primary text-primary-contrast" : "border border-border text-text-muted hover:bg-surface-muted"
          }`}
        >
          Իմ դպրոցը
        </button>
        <button
          type="button"
          onClick={() => setScope("class")}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            scope === "class" ? "bg-primary text-primary-contrast" : "border border-border text-text-muted hover:bg-surface-muted"
          }`}
        >
          Իմ դասարանը
        </button>
        <button
          type="button"
          onClick={() => setScope("schools")}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            scope === "schools" ? "bg-primary text-primary-contrast" : "border border-border text-text-muted hover:bg-surface-muted"
          }`}
        >
          Դպրոցներ
        </button>
      </div>

      {scope !== "schools" && board?.my_rank && (
        <p className="mb-4 text-sm text-text-muted">
          Ձեր տեղը այս ամիս՝ <span className="font-semibold text-text">#{board.my_rank}</span>
          {board.my_rank > 50 && " (թոփ 50-ից դուրս)"}
        </p>
      )}

      {scope === "schools" && schools?.my_school_rank && (
        <p className="mb-4 text-sm text-text-muted">
          Ձեր դպրոցի տեղը այս ամիս՝ <span className="font-semibold text-text">#{schools.my_school_rank}</span>
          {schools.my_school_rank > 50 && " (թոփ 50-ից դուրս)"}
        </p>
      )}

      {scope === "schools" ? (
        schools ? (
          <SchoolComparisonList board={schools} mySchoolId={user?.school?.id} />
        ) : (
          <p className="text-text-muted">Բեռնվում է...</p>
        )
      ) : board ? (
        <RankingList board={board} meId={user?.id} />
      ) : (
        <p className="text-text-muted">Բեռնվում է...</p>
      )}

      {error && <p className="mt-4 text-sm text-red-500">{error}</p>}

      <p className="mt-6 text-center text-xs text-text-muted">
        🥇🥈🥉 Ամսվա վերջում թոփ 3 սովորողները ստանում են մեդալ և կոչում իրենց պրոֆիլում։
      </p>
    </div>
  );
}
