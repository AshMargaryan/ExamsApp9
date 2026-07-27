import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import * as gamesApi from "../api/games";
import type { GameResults, LeaderboardEntry } from "../api/games";
import { RARITY_COLORS, RARITY_LABELS } from "../lib/achievementRarity";
import { playFanfare, playMedalReveal } from "../lib/sound";
import { Confetti } from "../components/games/Confetti";
import { Fireworks } from "../components/games/Fireworks";

type Phase = 0 | 1 | 2 | 3 | 4;

const REVEAL_DELAYS_MS = [500, 1300, 1300, 900]; // 3rd, 2nd, 1st, then leaderboard

const MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

function displayName(u: { username: string; first_name: string; last_name: string }) {
  const full = [u.first_name, u.last_name].filter(Boolean).join(" ");
  return full || u.username;
}

function PodiumStand({
  entry,
  revealed,
  heightClass,
}: {
  entry: LeaderboardEntry | undefined;
  revealed: boolean;
  heightClass: string;
}) {
  if (!entry) return <div className="w-24 sm:w-32" />;

  return (
    <div className="flex w-24 flex-col items-center sm:w-32">
      {revealed && (
        <div className="mb-2 flex flex-col items-center" style={{ animation: "pop-in 0.4s ease-out" }}>
          <span className="text-4xl" style={{ animation: "medal-pop 0.5s ease-out" }}>
            {MEDALS[entry.rank]}
          </span>
          <p className="mt-1 max-w-[6rem] truncate text-center font-medium text-text sm:max-w-[7rem]">
            {displayName(entry.user)}
          </p>
          <p className="text-sm text-text-muted">{entry.score} միավոր</p>
        </div>
      )}
      <div
        className={`w-full rounded-t-[var(--radius)] border border-border bg-surface ${heightClass} ${
          revealed ? "opacity-100" : "opacity-0"
        }`}
        style={revealed ? { animation: "podium-rise 0.5s ease-out", transformOrigin: "bottom" } : undefined}
      >
        <p className="pt-2 text-center text-2xl font-bold text-text-muted">{entry.rank}</p>
      </div>
    </div>
  );
}

export function ResultsPage() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const [results, setResults] = useState<GameResults | null>(null);
  const [phase, setPhase] = useState<Phase>(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomCode) return;
    gamesApi
      .fetchGameResults(roomCode)
      .then(setResults)
      .catch(() => setError("Արդյունքները բեռնելիս սխալ տեղի ունեցավ։"));
  }, [roomCode]);

  useEffect(() => {
    if (!results) return;
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
  }, [results]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg px-4 text-center">
        <p className="text-lg text-text-muted">{error}</p>
        <Link to="/games" className="text-primary hover:underline">
          ← Խաղասենյակներ
        </Link>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-lg text-text-muted">
        Բեռնվում է...
      </div>
    );
  }

  const first = results.leaderboard.find((e) => e.rank === 1);
  const second = results.leaderboard.find((e) => e.rank === 2);
  const third = results.leaderboard.find((e) => e.rank === 3);

  return (
    <div className="relative min-h-screen overflow-hidden bg-bg px-4 py-10">
      {phase >= 3 && <Confetti />}
      {phase >= 3 && <Fireworks />}

      <div className="mx-auto max-w-3xl">
        <h1 className="mb-2 text-center text-3xl font-semibold text-text">Խաղն ավարտված է 🏁</h1>
        <p className="mb-8 text-center text-text-muted">Ձեր տեղը՝ {results.my_rank}</p>

        <div className="mb-10 flex items-end justify-center gap-3 sm:gap-6">
          <PodiumStand entry={second} revealed={phase >= 2} heightClass="h-28" />
          <div className="flex flex-col items-center">
            {phase >= 3 && (
              <p className="mb-1 text-4xl" style={{ animation: "trophy-bounce 0.6s ease-out" }}>
                🏆
              </p>
            )}
            <PodiumStand entry={first} revealed={phase >= 3} heightClass="h-40" />
          </div>
          <PodiumStand entry={third} revealed={phase >= 1} heightClass="h-20" />
        </div>

        {phase >= 4 && (
          <div style={{ animation: "pop-in 0.5s ease-out" }}>
            {(results.xp_earned > 0 || results.newly_unlocked_achievements.length > 0) && (
              <div className="mb-6 rounded-[var(--radius)] border border-primary bg-surface p-5 text-center">
                {results.xp_earned > 0 && (
                  <p className="text-lg font-medium text-text">+{results.xp_earned} XP</p>
                )}
                {results.newly_unlocked_achievements.length > 0 && (
                  <div className="mt-3">
                    <p className="mb-2 text-sm text-text-muted">Նոր նվաճումներ</p>
                    <div className="flex flex-wrap justify-center gap-3">
                      {results.newly_unlocked_achievements.map((a) => (
                        <div
                          key={a.id}
                          title={a.description}
                          className="rounded-[var(--radius)] border border-border bg-bg px-4 py-3 text-center"
                        >
                          <p className="text-2xl">{a.icon || "🏆"}</p>
                          <p className="mt-1 text-sm font-medium text-text">{a.name}</p>
                          <p className="text-xs font-medium" style={{ color: RARITY_COLORS[a.rarity] }}>
                            {RARITY_LABELS[a.rarity]}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="overflow-x-auto rounded-[var(--radius)] border border-border bg-surface">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-text-muted">
                    <th className="px-4 py-3 font-medium">#</th>
                    <th className="px-4 py-3 font-medium">Խաղացող</th>
                    <th className="px-4 py-3 text-right font-medium">Միավոր</th>
                    <th className="px-4 py-3 text-right font-medium">Ճիշտ</th>
                    <th className="px-4 py-3 text-right font-medium">Ճշգրտություն</th>
                    <th className="px-4 py-3 text-right font-medium">Միջին ժամանակ</th>
                  </tr>
                </thead>
                <tbody>
                  {results.leaderboard.map((entry) => (
                    <tr key={entry.user.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 text-text">
                        {MEDALS[entry.rank] ?? entry.rank}
                      </td>
                      <td className="px-4 py-3 text-text">{displayName(entry.user)}</td>
                      <td className="px-4 py-3 text-right text-text">{entry.score}</td>
                      <td className="px-4 py-3 text-right text-text-muted">
                        {entry.correct_answers}/{entry.total_questions}
                      </td>
                      <td className="px-4 py-3 text-right text-text-muted">
                        {entry.accuracy_percentage}%
                      </td>
                      <td className="px-4 py-3 text-right text-text-muted">
                        {entry.average_time_seconds !== null ? `${entry.average_time_seconds}վ` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex justify-center gap-3">
              <Link
                to="/games"
                className="rounded-md bg-primary px-6 py-2.5 font-medium text-primary-contrast transition-colors hover:bg-primary-hover"
              >
                Խաղասենյակներ
              </Link>
              <Link
                to="/"
                className="rounded-md border border-border px-6 py-2.5 font-medium text-text transition-colors hover:border-primary"
              >
                Գլխավոր
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
