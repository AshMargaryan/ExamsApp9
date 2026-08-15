import type { RankingEntry } from "../../api/rankings";
import { rankTier } from "../../lib/rankTier";
import { Avatar } from "./Avatar";

function displayName(e: RankingEntry) {
  return [e.first_name, e.last_name].filter(Boolean).join(" ") || e.username;
}

function Stand({
  entry,
  isMe,
  plinthHeight,
  standOrder,
}: {
  entry: RankingEntry | undefined;
  isMe: boolean;
  plinthHeight: string;
  standOrder: number;
}) {
  if (!entry) return <div className="w-24 sm:w-32" />;
  const tier = rankTier(entry.rank)!;

  return (
    <div className="flex w-24 flex-col items-center sm:w-32">
      <div
        className="mb-2 flex flex-col items-center gap-1"
        style={{ animation: `pop-in 0.4s ease-out ${standOrder * 0.1}s both` }}
      >
        <span
          className="rounded-full px-2.5 py-0.5 font-mono text-xs font-bold tabular-nums"
          style={{ color: tier.text, backgroundColor: tier.bg, border: `1px solid ${tier.line}` }}
        >
          {entry.rank}
        </span>
        <Avatar avatar={entry.avatar} username={entry.username} size={entry.rank === 1 ? "lg" : "md"} ringColor={tier.line} />
        <p className="mt-1 max-w-[6rem] truncate text-center text-sm font-semibold text-text sm:max-w-[7rem]">
          {displayName(entry)}
          {isMe && <span className="ml-1 text-xs font-normal text-primary">(Դուք)</span>}
        </p>
        <p className="truncate text-xs text-text-muted">{entry.school?.name ?? "—"}</p>
        <p className="font-mono text-sm font-bold tabular-nums text-text">{entry.xp} XP</p>
      </div>
      <div
        className={`flex w-full items-start justify-center rounded-t-lg border border-b-0 pt-2 ${plinthHeight}`}
        style={{
          backgroundColor: tier.bg,
          borderColor: tier.line,
          animation: "podium-rise 0.5s ease-out",
          transformOrigin: "bottom",
        }}
      >
        <p className="font-mono text-lg font-bold tabular-nums" style={{ color: tier.text }}>
          {entry.rank}
        </p>
      </div>
    </div>
  );
}

export function Podium({ top3, meId }: { top3: RankingEntry[]; meId: number | undefined }) {
  if (top3.length === 0) return null;
  const first = top3.find((e) => e.rank === 1);
  const second = top3.find((e) => e.rank === 2);
  const third = top3.find((e) => e.rank === 3);

  return (
    <div className="flex items-end justify-center gap-2 px-5 pt-7 sm:gap-4">
      <Stand entry={second} isMe={second?.user_id === meId} plinthHeight="h-13" standOrder={1} />
      <Stand entry={first} isMe={first?.user_id === meId} plinthHeight="h-19" standOrder={0} />
      <Stand entry={third} isMe={third?.user_id === meId} plinthHeight="h-9" standOrder={2} />
    </div>
  );
}
