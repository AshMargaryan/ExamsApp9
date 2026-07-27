import { useEffect, useState, type FormEvent } from "react";
import { AxiosError } from "axios";
import { Link, useNavigate } from "react-router-dom";
import * as gamesApi from "../api/games";
import type { GameRoom, StartCondition } from "../api/games";
import { MessageModal } from "../components/MessageModal";

const STATUS_LABELS: Record<GameRoom["status"], string> = {
  waiting: "Սպասման մեջ",
  running: "Ընթացքի մեջ",
  finished: "Ավարտված",
};

function extractError(err: unknown, fallback: string): string {
  if (err instanceof AxiosError && err.response?.data) {
    const data = err.response.data as Record<string, string[] | string>;
    const first = Object.values(data).flat()[0];
    return (first as string) ?? fallback;
  }
  return fallback;
}

export function GamesPage() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState("4");
  const [startCondition, setStartCondition] = useState<StartCondition>("manual");
  const [timerSeconds, setTimerSeconds] = useState("30");
  const [minPlayers, setMinPlayers] = useState("2");
  const [creating, setCreating] = useState(false);

  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);

  const [myRooms, setMyRooms] = useState<GameRoom[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    gamesApi.fetchMyRooms().then(setMyRooms);
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      const room = await gamesApi.createRoom({
        name,
        max_players: Number(maxPlayers),
        start_condition: startCondition,
        timer_seconds: startCondition === "timer" ? Number(timerSeconds) : undefined,
        min_players_to_start: startCondition === "player_count" ? Number(minPlayers) : undefined,
      });
      navigate(`/games/${room.room_code}`);
    } catch (err) {
      setError(extractError(err, "Սենյակի ստեղծումը ձախողվեց։"));
    } finally {
      setCreating(false);
    }
  }

  async function handleJoin(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setJoining(true);
    try {
      const room = await gamesApi.joinRoom(joinCode.trim().toUpperCase());
      navigate(`/games/${room.room_code}`);
    } catch (err) {
      setError(extractError(err, "Սենյակին միանալը ձախողվեց։"));
    } finally {
      setJoining(false);
    }
  }

  const inputClass =
    "w-full rounded-md border border-border bg-bg px-3 py-2 text-text outline-none focus:border-primary";
  const labelClass = "mb-1 block text-sm text-text-muted";

  return (
    <div className="min-h-screen bg-bg px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <Link to="/" className="mb-6 inline-block text-sm text-primary hover:underline">
          ← Գլխավոր
        </Link>

        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-semibold text-text">Խաղասենյակներ</h1>
          <Link
            to="/games/find"
            className="rounded-md bg-primary px-6 py-2.5 font-medium text-primary-contrast transition-colors hover:bg-primary-hover"
          >
            🔍 Գտնել խաղ
          </Link>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <form
            onSubmit={handleCreate}
            className="rounded-[var(--radius)] border border-border bg-surface p-6 shadow-sm"
          >
            <h2 className="mb-4 text-lg font-semibold text-text">Ստեղծել սենյակ</h2>

            <label className={labelClass}>Սենյակի անվանում</label>
            <input
              className={`${inputClass} mb-3`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
            />

            <label className={labelClass}>Խաղացողների առավելագույն քանակ</label>
            <input
              type="number"
              min={2}
              max={20}
              className={`${inputClass} mb-3`}
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(e.target.value)}
              required
            />

            <label className={labelClass}>Սկսելու պայման</label>
            <select
              className={`${inputClass} mb-3`}
              value={startCondition}
              onChange={(e) => setStartCondition(e.target.value as StartCondition)}
            >
              <option value="manual">Ձեռքով սկսել</option>
              <option value="timer">Ժամանակաչափով</option>
              <option value="player_count">Երբ բավարար խաղացողներ միանան</option>
            </select>

            {startCondition === "timer" && (
              <>
                <label className={labelClass}>Ժամանակաչափ (վայրկյան)</label>
                <input
                  type="number"
                  min={10}
                  max={3600}
                  className={`${inputClass} mb-3`}
                  value={timerSeconds}
                  onChange={(e) => setTimerSeconds(e.target.value)}
                  required
                />
              </>
            )}

            {startCondition === "player_count" && (
              <>
                <label className={labelClass}>Նվազագույն խաղացողների քանակ</label>
                <input
                  type="number"
                  min={2}
                  max={Number(maxPlayers) || 20}
                  className={`${inputClass} mb-3`}
                  value={minPlayers}
                  onChange={(e) => setMinPlayers(e.target.value)}
                  required
                />
              </>
            )}

            <button
              type="submit"
              disabled={creating}
              className="mt-2 w-full rounded-md bg-primary py-2 font-medium text-primary-contrast transition-colors hover:bg-primary-hover disabled:opacity-60"
            >
              {creating ? "..." : "Ստեղծել"}
            </button>
          </form>

          <div className="flex flex-col gap-6">
            <form
              onSubmit={handleJoin}
              className="rounded-[var(--radius)] border border-border bg-surface p-6 shadow-sm"
            >
              <h2 className="mb-4 text-lg font-semibold text-text">Միանալ կոդով</h2>
              <label className={labelClass}>Սենյակի կոդ</label>
              <input
                className={`${inputClass} mb-3 uppercase tracking-widest`}
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="ABC123"
                maxLength={8}
                required
              />
              <button
                type="submit"
                disabled={joining}
                className="w-full rounded-md border border-primary py-2 font-medium text-primary transition-colors hover:bg-surface-muted disabled:opacity-60"
              >
                {joining ? "..." : "Միանալ"}
              </button>
            </form>

            <div className="rounded-[var(--radius)] border border-border bg-surface p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-text">Իմ սենյակները</h2>
              {myRooms === null && <p className="text-text-muted">Բեռնվում է...</p>}
              {myRooms?.length === 0 && <p className="text-text-muted">Ակտիվ սենյակներ չկան։</p>}
              <div className="flex flex-col gap-2">
                {myRooms?.map((room) => (
                  <Link
                    key={room.id}
                    to={`/games/${room.room_code}`}
                    className="flex items-center justify-between rounded-md border border-border px-3 py-2 transition-colors hover:border-primary"
                  >
                    <span className="text-text">{room.name}</span>
                    <span className="text-sm text-text-muted">
                      {STATUS_LABELS[room.status]} · {room.participant_count}/{room.max_players}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && <MessageModal message={error} onClose={() => setError(null)} />}
    </div>
  );
}
