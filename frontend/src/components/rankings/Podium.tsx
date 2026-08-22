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
  if (!entry) return <div className="w-[5.5rem] sm:w-32" />;
  const tier = rankTier(entry.rank)!;

  return (
    <div className="flex w-[5.5rem] min-w-0 flex-col items-center sm:w-32">
      <div
        className="mb-2 flex w-full min-w-0 flex-col items-center gap-1"
        style={{ animation: `pop-in 0.4s ease-out ${standOrder * 0.1}s both` }}
      >
        <span
          className="rounded-full px-2.5 py-0.5 font-mono text-xs font-bold tabular-nums"
          style={{ color: tier.text, backgroundColor: tier.bg, border: `1px solid ${tier.line}` }}
        >
          {entry.rank}
        </span>
        <Avatar avatar={entry.avatar} username={entry.username} size={entry.rank === 1 ? "lg" : "md"} ringColor={tier.line} />
        {/*
          `truncate` needs a definite width, and inside a centred flex column
          these paragraphs sized to their content instead — so a long Armenian
          school name ("Երևանի թիվ 195 ավագ դպրոց") spilled out of its stand
          and printed straight over the names either side of it at 375px.
          `w-full` against the stand's fixed width is what makes the ellipsis
          actually happen.
        */}
        <p className="mt-1 w-full truncate text-center text-[length:var(--text-sm)] font-semibold text-text">
          {displayName(entry)}
          {isMe && <span className="ml-1 text-[length:var(--text-xs)] font-normal text-primary">(Դու)</span>}
        </p>
        <p
          className="w-full truncate text-center text-[length:var(--text-xs)] text-text-muted"
          title={entry.school?.name ?? undefined}
        >
          {entry.school?.name ?? "—"}
        </p>
        <p className="font-mono text-sm font-bold tabular-nums text-text">{entry.xp} XP</p>
      </div>
      <div
        className={`flex w-full items-start justify-center rounded-t-[var(--radius-md)] border border-b-0 pt-2 ${plinthHeight}`}
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
    <div className="flex items-end justify-center gap-[var(--space-2)] px-[var(--space-3)] pt-7 sm:gap-4 sm:px-5">
      <Stand entry={second} isMe={second?.user_id === meId} plinthHeight="h-13" standOrder={1} />
      <Stand entry={first} isMe={first?.user_id === meId} plinthHeight="h-19" standOrder={0} />
      <Stand entry={third} isMe={third?.user_id === meId} plinthHeight="h-9" standOrder={2} />
    </div>
  );
}
