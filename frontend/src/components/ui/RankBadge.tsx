import { cn } from "../../lib/cn";

/*
  A leaderboard position.

  Replaces the `{ 1: "🥇", 2: "🥈", 3: "🥉" }` map that was copy-pasted into
  the profile page, the monthly-ranking card and the rankings page. Three
  problems with the emoji version, beyond the mixed icon language:

  1. The medal emoji *replaced* the number, so the top three showed a glyph
     and everyone else showed "#7" — two different notations in one column,
     and no way to tell 🥈 from 🥉 at a glance on a low-DPI screen.
  2. Emoji render at wildly different widths per platform, so the column
     they sit in did not line up.
  3. It was the only signal of a podium place, and it is colour *and*
     pictogram in one glyph that a screen reader reads as "2nd place medal"
     in English, inside an otherwise Armenian row.

  Here the number is always shown, the podium ring adds the metal, and the
  accessible name is Armenian.
*/

const PODIUM: Record<number, { ring: string; text: string; bg: string }> = {
  1: { ring: "border-gold-line", text: "text-gold", bg: "bg-gold-bg" },
  2: { ring: "border-silver-line", text: "text-silver", bg: "bg-silver-bg" },
  3: { ring: "border-bronze-line", text: "text-bronze", bg: "bg-bronze-bg" },
};

export function RankBadge({ rank, className }: { rank: number; className?: string }) {
  const podium = PODIUM[rank];
  return (
    <span
      aria-label={`${rank}-րդ տեղ`}
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-full)] border",
        "text-[length:var(--text-xs)] font-semibold tabular-nums",
        podium
          ? cn(podium.ring, podium.text, podium.bg)
          : "border-transparent text-text-muted",
        className,
      )}
    >
      <span aria-hidden="true">{rank}</span>
    </span>
  );
}
