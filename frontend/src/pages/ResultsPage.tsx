import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Award, Trophy, Zap } from "lucide-react";
import * as gamesApi from "../api/games";
import type { GameResults, LeaderboardEntry } from "../api/games";
import { useAuth } from "../auth/AuthContext";
import { RARITY_COLORS, RARITY_LABELS } from "../lib/achievementRarity";
import { cn } from "../lib/cn";
import { playFanfare, playMedalReveal } from "../lib/sound";
import { Confetti } from "../components/games/Confetti";
import { Fireworks } from "../components/games/Fireworks";
import { ErrorState } from "../components/ui/ErrorState";
import { LinkButton } from "../components/ui/LinkButton";
import { RankBadge } from "../components/ui/RankBadge";
import { Skeleton } from "../components/ui/Skeleton";

type Phase = 0 | 1 | 2 | 3 | 4;

const REVEAL_DELAYS_MS = [500, 1300, 1300, 900]; // 3rd, 2nd, 1st, then leaderboard

// The staged reveal (podium pop-ins, confetti, fanfare) is a one-time
// "ta-da" moment for THIS browser tab. Without this, navigating back to
// /games/<code>/results (e.g. via the browser's back button after leaving
// the page) remounts the component and replays the whole animation from
// scratch every time. sessionStorage (not localStorage) is deliberate: it
// clears itself when the tab closes, so this is a "don't replay within
// this visit" flag, not permanent history state.
function alreadySeenResults(roomCode: string): boolean {
  try {
    return sessionStorage.getItem(`gameResultsSeen:${roomCode}`) === "1";
  } catch {
    return false;
  }
}

function markResultsSeen(roomCode: string): void {
  try {
    sessionStorage.setItem(`gameResultsSeen:${roomCode}`, "1");
  } catch {
    // Private browsing / storage disabled — worst case the animation
    // replays on a later visit, not worth failing the page over.
  }
}

function displayName(u: { username: string; first_name: string; last_name: string }) {
  const full = [u.first_name, u.last_name].filter(Boolean).join(" ");
  return full || u.username;
}

function PodiumStand({
  entry,
  revealed,
  animate,
  heightClass,
  isMe,
}: {
  entry: LeaderboardEntry | undefined;
  revealed: boolean;
  animate: boolean;
  heightClass: string;
  isMe: boolean;
}) {
  if (!entry) return <div className="w-24 sm:w-32" />;

  return (
    <div className="flex w-24 flex-col items-center sm:w-32">
      {revealed && (
        <div
          className="mb-[var(--space-2)] flex flex-col items-center"
          style={animate ? { animation: "pop-in 0.4s ease-out" } : undefined}
        >
          {/* Was a 🥇/🥈/🥉 emoji map — the fourth copy of one this project
              already replaced everywhere else with `RankBadge`, which keeps
              the number, lines up across rows, and does not announce "2nd
              place medal" in English inside an Armenian interface. */}
          <span style={animate ? { animation: "medal-pop 0.5s ease-out" } : undefined}>
            <RankBadge rank={entry.rank} size="lg" />
          </span>
          <p className={cn(
            "mt-1 max-w-[6rem] truncate text-center font-medium sm:max-w-[7rem]",
            isMe ? "text-primary" : "text-text",
          )}>
            {isMe ? "Դու" : displayName(entry.user)}
          </p>
          <p className="text-[length:var(--text-sm)] tabular-nums text-text-muted">{entry.score} միավոր</p>
        </div>
      )}
      <div
        /* Filled, not an outlined box: the stand is a plinth, and with the
           rank moved up into the badge an empty bordered rectangle read as a
           card with nothing in it. */
        className={cn(
          "w-full rounded-t-[var(--radius-lg)] border-x border-t",
          heightClass,
          isMe ? "border-primary bg-primary-bg" : "border-border bg-surface-muted",
          revealed ? "opacity-100" : "opacity-0",
        )}
        style={
          revealed && animate
            ? { animation: "podium-rise 0.5s ease-out", transformOrigin: "bottom" }
            : undefined
        }
      />
    </div>
  );
}

export function ResultsPage() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const { user } = useAuth();
  // Captured once, at mount, via a ref — NOT recomputed on every render.
  // markResultsSeen() below flips this same sessionStorage key almost
  // immediately after the first successful fetch; if this were a plain
  // const (recomputed every render) or state derived fresh from
  // sessionStorage, the re-render triggered by setResults() would read it
  // back as "already seen" on the very first visit too, before the reveal
  // effect ever got a chance to run — which is exactly why the animation
  // stopped playing at all.
  const alreadySeenRef = useRef(roomCode ? alreadySeenResults(roomCode) : false);
  const alreadySeen = alreadySeenRef.current;
  const [results, setResults] = useState<GameResults | null>(null);
  const [phase, setPhase] = useState<Phase>(alreadySeen ? 4 : 0);
  const [error, setError] = useState<string | null>(null);

  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!roomCode) return;
    setError(null);
    gamesApi
      .fetchGameResults(roomCode)
      .then((data) => {
        setResults(data);
        markResultsSeen(roomCode);
      })
      .catch(() => setError("Արդյունքները բեռնելիս սխալ տեղի ունեցավ։"));
  }, [roomCode, attempt]);

  useEffect(() => {
    if (!results || alreadySeen) return;
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    let elapsed = 0;
    ([1, 2, 3, 4] as Phase[]).forEach((nextPhase, i) => {
      elapsed += REVEAL_DELAYS_MS[i];
      timeouts.push(
        setTimeout(() => {
          setPhase(nextPhase);
          if (nextPhase === 1) playMedalReveal(3);
          else if (nextPhase === 2) playMedalReveal(2);
          else if (nextPhase === 3) {
            playMedalReveal(1);
            playFanfare();
          }
        }, elapsed),
      );
    });
    return () => timeouts.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results]);

  if (error) {
    return (
      <div className="mx-auto max-w-md px-[var(--space-4)] py-[var(--space-8)]">
        <ErrorState
          title="Արդյունքները չհաջողվեց բեռնել։"
          hint="Խաղն ավարտված է և արդյունքները պահպանված են — խնդիրը կապի մեջ է։"
          onRetry={() => setAttempt((a) => a + 1)}
        />
        <div className="mt-[var(--space-4)] text-center">
          <LinkButton to="/games">Խաղասենյակներ</LinkButton>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="mx-auto max-w-3xl px-[var(--space-4)] py-[var(--space-8)]">
        <Skeleton className="mx-auto mb-[var(--space-6)] h-9 w-56" />
        <div className="mb-[var(--space-8)] flex items-end justify-center gap-[var(--space-4)]">
          <Skeleton className="h-28 w-24 sm:w-32" />
          <Skeleton className="h-40 w-24 sm:w-32" />
          <Skeleton className="h-20 w-24 sm:w-32" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const first = results.leaderboard.find((e) => e.rank === 1);
  const second = results.leaderboard.find((e) => e.rank === 2);
  const third = results.leaderboard.find((e) => e.rank === 3);
  const isMe = (e: LeaderboardEntry | undefined) => !!e && !!user && e.user.id === user.id;

  return (
    <div className="relative overflow-hidden px-[var(--space-4)] py-[var(--space-8)]">
      {!alreadySeen && phase >= 3 && <Confetti />}
      {!alreadySeen && phase >= 3 && <Fireworks />}

      <div className="mx-auto max-w-3xl">
        <h1 className="mb-[var(--space-2)] text-center font-display text-[length:var(--text-3xl)] leading-[var(--leading-display)] font-semibold text-text">
          Խաղն ավարտված է
        </h1>
        <p className="mb-[var(--space-8)] flex items-center justify-center gap-[var(--space-2)] text-center text-text-muted">
          Քո տեղը
          <RankBadge rank={results.my_rank} size="sm" />
          {results.leaderboard.length}-ից
        </p>

        <div className="mb-[var(--space-8)] flex items-end justify-center gap-[var(--space-3)] sm:gap-[var(--space-6)]">
          <PodiumStand entry={second} isMe={isMe(second)} revealed={phase >= 2} animate={!alreadySeen} heightClass="h-28" />
          <div className="flex flex-col items-center">
            {phase >= 3 && (
              <span
                className="mb-[var(--space-1)] text-accent"
                style={alreadySeen ? undefined : { animation: "trophy-bounce 0.6s ease-out" }}
              >
                <Trophy size={30} strokeWidth={1.75} aria-hidden />
              </span>
            )}
            <PodiumStand entry={first} isMe={isMe(first)} revealed={phase >= 3} animate={!alreadySeen} heightClass="h-40" />
          </div>
          <PodiumStand entry={third} isMe={isMe(third)} revealed={phase >= 1} animate={!alreadySeen} heightClass="h-20" />
        </div>

        {phase >= 4 && (
          <div style={alreadySeen ? undefined : { animation: "pop-in 0.5s ease-out" }}>
            {(results.xp_earned > 0 ||
              results.trophies_earned > 0 ||
              results.newly_unlocked_achievements.length > 0) && (
              <div className="mb-[var(--space-6)] rounded-[var(--radius-lg)] border border-primary-line bg-primary-bg p-[var(--space-5)] text-center">
                <div className="flex flex-wrap items-center justify-center gap-x-[var(--space-6)] gap-y-[var(--space-2)]">
                  {results.xp_earned > 0 && (
                    <p className="inline-flex items-center gap-[var(--space-2)] text-[length:var(--text-lg)] font-medium text-text">
                      <Zap size={18} strokeWidth={1.75} aria-hidden className="text-accent" />
                      +{results.xp_earned} XP
                    </p>
                  )}
                  {results.is_competitive && results.trophies_earned > 0 && (
                    <p className="inline-flex items-center gap-[var(--space-2)] text-[length:var(--text-lg)] font-medium text-text">
                      <Trophy size={18} strokeWidth={1.75} aria-hidden className="text-accent" />
                      +{results.trophies_earned} գավաթ
                    </p>
                  )}
                </div>
                {results.speed_bonus_xp > 0 && (
                  <p className="mt-[var(--space-2)] text-[length:var(--text-sm)] text-text-muted">
                    Դրանից +{results.speed_bonus_xp} XP՝ արագության համար
                  </p>
                )}
                {results.newly_unlocked_achievements.length > 0 && (
                  <div className="mt-[var(--space-4)]">
                    <p className="mb-[var(--space-2)] text-[length:var(--text-sm)] text-text-muted">Նոր նվաճումներ</p>
                    <div className="flex flex-wrap justify-center gap-[var(--space-3)]">
                      {results.newly_unlocked_achievements.map((a) => (
                        <div
                          key={a.id}
                          className="max-w-[12rem] rounded-[var(--radius-md)] border border-border bg-surface px-[var(--space-4)] py-[var(--space-3)] text-center"
                        >
                          <Award size={22} strokeWidth={1.75} aria-hidden className="mx-auto text-accent" />
                          <p className="mt-1 text-[length:var(--text-sm)] font-medium text-text">{a.name}</p>
                          <p className="text-[length:var(--text-xs)] font-medium" style={{ color: RARITY_COLORS[a.rarity] }}>
                            {RARITY_LABELS[a.rarity]}
                          </p>
                          {/* The description was a `title` tooltip, which a
                              touch device never shows — and this is the one
                              string that says what the student did to earn it. */}
                          {a.description && (
                            <p className="mt-1 text-[length:var(--text-xs)] text-text-muted">{a.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/*
              Six columns of numbers did not survive a phone: `overflow-x-auto`
              meant the accuracy and time columns simply lived off the right
              edge of a 375px screen, behind a sideways scroll inside a page
              that also scrolls sideways-adjacent. Below `sm` each player is a
              card with the same facts stacked; the table returns above it.

              And the row that matters most — the reader's own — was not marked
              at all, so finding yourself in a twenty-player game meant reading
              every name.
            */}
            <ul className="flex flex-col gap-[var(--space-2)] sm:hidden">
              {results.leaderboard.map((entry) => (
                <li
                  key={entry.user.id}
                  className={cn(
                    "rounded-[var(--radius-lg)] border bg-surface p-[var(--space-3)]",
                    isMe(entry) ? "border-primary bg-primary-bg" : "border-border",
                  )}
                >
                  <div className="flex items-center gap-[var(--space-3)]">
                    <RankBadge rank={entry.rank} size="sm" />
                    <span className={cn("min-w-0 flex-1 truncate font-medium", isMe(entry) ? "text-primary" : "text-text")}>
                      {displayName(entry.user)}{isMe(entry) && " · դու"}
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums text-text">{entry.score}</span>
                  </div>
                  <p className="mt-[var(--space-2)] flex flex-wrap gap-x-[var(--space-4)] text-[length:var(--text-xs)] tabular-nums text-text-muted">
                    <span>Ճիշտ՝ {entry.correct_answers}/{entry.total_questions}</span>
                    <span>Ճշգրտություն՝ {entry.accuracy_percentage}%</span>
                    <span>
                      Ժամանակ՝ {entry.time_taken_to_finish_seconds !== null
                        ? `${Math.round(entry.time_taken_to_finish_seconds)}վ`
                        : "—"}
                    </span>
                  </p>
                </li>
              ))}
            </ul>

            <div className="hidden overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface sm:block">
              <table className="w-full text-left text-[length:var(--text-sm)]">
                <caption className="sr-only">Խաղի արդյունքների աղյուսակ</caption>
                <thead>
                  <tr className="border-b border-border text-text-muted">
                    <th scope="col" className="px-[var(--space-4)] py-[var(--space-3)] font-medium">#</th>
                    <th scope="col" className="px-[var(--space-4)] py-[var(--space-3)] font-medium">Խաղացող</th>
                    <th scope="col" className="px-[var(--space-4)] py-[var(--space-3)] text-right font-medium">Միավոր</th>
                    <th scope="col" className="px-[var(--space-4)] py-[var(--space-3)] text-right font-medium">Ճիշտ</th>
                    <th scope="col" className="px-[var(--space-4)] py-[var(--space-3)] text-right font-medium">Ճշգրտություն</th>
                    <th scope="col" className="px-[var(--space-4)] py-[var(--space-3)] text-right font-medium">Ժամանակ</th>
                  </tr>
                </thead>
                <tbody>
                  {results.leaderboard.map((entry) => (
                    <tr
                      key={entry.user.id}
                      className={cn(
                        "border-b border-border last:border-0",
                        isMe(entry) && "bg-primary-bg",
                      )}
                    >
                      <td className="px-[var(--space-4)] py-[var(--space-3)]">
                        <RankBadge rank={entry.rank} size="sm" />
                      </td>
                      <td className={cn(
                        "px-[var(--space-4)] py-[var(--space-3)]",
                        isMe(entry) ? "font-medium text-primary" : "text-text",
                      )}>
                        {displayName(entry.user)}{isMe(entry) && " · դու"}
                      </td>
                      <td className="px-[var(--space-4)] py-[var(--space-3)] text-right font-semibold tabular-nums text-text">{entry.score}</td>
                      <td className="px-[var(--space-4)] py-[var(--space-3)] text-right tabular-nums text-text-muted">
                        {entry.correct_answers}/{entry.total_questions}
                      </td>
                      <td className="px-[var(--space-4)] py-[var(--space-3)] text-right tabular-nums text-text-muted">
                        {entry.accuracy_percentage}%
                      </td>
                      <td className="px-[var(--space-4)] py-[var(--space-3)] text-right tabular-nums text-text-muted">
                        {entry.time_taken_to_finish_seconds !== null
                          ? `${Math.round(entry.time_taken_to_finish_seconds)}վ`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* "Play again" is what a student wants after a game and there was
                no way to do it without going back and rebuilding a room. */}
            <div className="mt-[var(--space-6)] flex flex-col justify-center gap-[var(--space-3)] sm:flex-row">
              <LinkButton to="/games/find" variant="primary" size="md" className="justify-center">
                Խաղալ նորից
              </LinkButton>
              <LinkButton to="/games" variant="secondary" size="md" className="justify-center">
                Խաղասենյակներ
              </LinkButton>
              <LinkButton to="/" variant="ghost" size="md" className="justify-center">
                Գլխավոր
              </LinkButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
