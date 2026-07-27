import { useCallback, useEffect, useState } from "react";
import { AxiosError } from "axios";
import { Link, useNavigate, useParams } from "react-router-dom";
import * as gamesApi from "../api/games";
import type { GameRoom } from "../api/games";
import { useAuth } from "../auth/AuthContext";
import { MessageModal } from "../components/MessageModal";

const STATUS_LABELS: Record<GameRoom["status"], string> = {
  waiting: "Սպասման մեջ",
  running: "Ընթացքի մեջ",
  finished: "Ավարտված",
};

const CONDITION_LABELS: Record<GameRoom["start_condition"], string> = {
  manual: "Ձեռքով սկսվում է ստեղծողի կողմից",
  timer: "Կսկսվի ժամանակաչափով",
  player_count: "Կսկսվի բավարար խաղացողներ միանալուց հետո",
};

function displayName(u: { username: string; first_name: string; last_name: string }) {
  const full = [u.first_name, u.last_name].filter(Boolean).join(" ");
  return full || u.username;
}

function extractError(err: unknown, fallback: string): string {
  if (err instanceof AxiosError && err.response?.data) {
    const data = err.response.data as Record<string, string[] | string>;
    const first = Object.values(data).flat()[0];
    return (first as string) ?? fallback;
  }
  return fallback;
}

export function GameRoomPage() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [room, setRoom] = useState<GameRoom | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(() => {
    if (!roomCode) return;
    gamesApi
      .fetchRoom(roomCode)
      .then(setRoom)
      .catch(() => setNotFound(true));
  }, [roomCode]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!room || room.status === "finished") return;
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, [room, load]);

  async function handleStart() {
    if (!roomCode) return;
    setError(null);
    setBusy(true);
    try {
      setRoom(await gamesApi.startRoom(roomCode));
    } catch (err) {
      setError(extractError(err, "Խաղը սկսելը ձախողվեց։"));
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    if (!roomCode) return;
    setBusy(true);
    try {
      await gamesApi.cancelRoom(roomCode);
      navigate("/games");
    } catch (err) {
      setError(extractError(err, "Սենյակը չեղարկելը ձախողվեց։"));
    } finally {
      setBusy(false);
    }
  }

  async function handleLeave() {
    if (!roomCode) return;
    setBusy(true);
    try {
      await gamesApi.leaveRoom(roomCode);
      navigate("/games");
    } catch (err) {
      setError(extractError(err, "Սենյակը լքելը ձախողվեց։"));
    } finally {
      setBusy(false);
    }
  }

  async function handleKick(userId: number) {
    if (!roomCode) return;
    setError(null);
    try {
      await gamesApi.kickParticipant(roomCode, userId);
      load();
    } catch (err) {
      setError(extractError(err, "Մասնակցին հեռացնելը ձախողվեց։"));
    }
  }

  function handleCopyCode() {
    if (!room) return;
    navigator.clipboard.writeText(room.room_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (notFound) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg px-4">
        <p className="text-lg text-text-muted">Այս սենյակը գոյություն չունի կամ ջնջվել է։</p>
        <Link to="/games" className="text-primary hover:underline">
          ← Վերադառնալ խաղասենյակներին
        </Link>
      </div>
    );
  }

  if (!room) {
    return <div className="p-8 text-lg text-text-muted">Բեռնվում է...</div>;
  }

  const isCreator = user?.id === room.creator.id;
  const canStart = room.status === "waiting" && room.participant_count >= 2;

  return (
    <div className="min-h-screen bg-bg px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <Link to="/games" className="mb-6 inline-block text-sm text-primary hover:underline">
          ← Խաղասենյակներ
        </Link>

        <div className="rounded-[var(--radius)] border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-text">{room.name}</h1>
              <p className="mt-1 text-sm text-text-muted">
                Ստեղծող՝ {displayName(room.creator)}
              </p>
            </div>
            <span className="rounded-full border border-border px-3 py-1 text-sm text-text-muted">
              {STATUS_LABELS[room.status]}
            </span>
          </div>

          <div className="mt-4 flex items-center gap-3 rounded-md border border-border bg-bg px-4 py-3">
            <span className="text-sm text-text-muted">Կոդ՝</span>
            <span className="text-xl font-semibold tracking-widest text-text">{room.room_code}</span>
            <button
              type="button"
              onClick={handleCopyCode}
              className="ml-auto text-sm text-primary hover:underline"
            >
              {copied ? "Պատճենված է ✓" : "Պատճենել"}
            </button>
          </div>

          <p className="mt-3 text-sm text-text-muted">{CONDITION_LABELS[room.start_condition]}</p>

          <div className="mt-6">
            <h2 className="mb-2 text-sm font-semibold text-text-muted">
              Մասնակիցներ ({room.participant_count}/{room.max_players})
            </h2>
            <div className="flex flex-col gap-2">
              {room.participants.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                >
                  <span className="text-text">
                    {displayName(p.user)}
                    {p.user.id === room.creator.id && (
                      <span className="ml-2 text-xs text-text-muted">(ստեղծող)</span>
                    )}
                  </span>
                  {isCreator && p.user.id !== room.creator.id && room.status === "waiting" && (
                    <button
                      type="button"
                      onClick={() => handleKick(p.user.id)}
                      className="text-sm text-incorrect hover:underline"
                    >
                      Հեռացնել
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {room.status === "running" && (
            <Link
              to={`/games/${room.room_code}/play`}
              className="mt-6 block rounded-md bg-primary py-3 text-center text-lg font-medium text-primary-contrast transition-colors hover:bg-primary-hover"
            >
              ▶ Մուտք խաղին
            </Link>
          )}

          <div className="mt-6 flex gap-3">
            {isCreator && room.status === "waiting" && (
              <>
                <button
                  type="button"
                  onClick={handleStart}
                  disabled={!canStart || busy}
                  className="flex-1 rounded-md bg-primary py-2 font-medium text-primary-contrast transition-colors hover:bg-primary-hover disabled:opacity-60"
                >
                  Սկսել խաղը
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={busy}
                  className="flex-1 rounded-md border border-border py-2 font-medium text-text-muted transition-colors hover:bg-surface-muted disabled:opacity-60"
                >
                  Չեղարկել սենյակը
                </button>
              </>
            )}
            {!isCreator && room.status === "waiting" && (
              <button
                type="button"
                onClick={handleLeave}
                disabled={busy}
                className="flex-1 rounded-md border border-border py-2 font-medium text-text-muted transition-colors hover:bg-surface-muted disabled:opacity-60"
              >
                Լքել սենյակը
              </button>
            )}
          </div>
        </div>
      </div>

      {error && <MessageModal message={error} onClose={() => setError(null)} />}
    </div>
  );
}
