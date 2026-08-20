import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy, Play, Trophy, UserMinus } from "lucide-react";
import { AxiosError } from "axios";
import { useNavigate, useParams } from "react-router-dom";
import * as gamesApi from "../api/games";
import type { GameRoom } from "../api/games";
import { useAuth } from "../auth/AuthContext";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { ErrorState } from "../components/ui/ErrorState";
import { FormAlert } from "../components/ui/Field";
import { IconButton } from "../components/ui/IconButton";
import { LinkButton } from "../components/ui/LinkButton";
import { PageHeader } from "../components/ui/PageHeader";
import { Skeleton } from "../components/ui/Skeleton";
import { cn } from "../lib/cn";

const STATUS_LABELS: Record<GameRoom["status"], string> = {
  waiting: "Սպասման մեջ",
  starting: "Սկսվում է...",
  running: "Ընթացքի մեջ",
  finished: "Ավարտված",
};

const STATUS_TONES: Record<GameRoom["status"], "neutral" | "primary" | "correct"> = {
  waiting: "neutral",
  starting: "primary",
  running: "correct",
  finished: "neutral",
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
  const [loadFailure, setLoadFailure] = useState<"missing" | "network" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [kickTarget, setKickTarget] = useState<{ id: number; name: string } | null>(null);
  const prevStatusRef = useRef<GameRoom["status"] | null>(null);

  const load = useCallback(() => {
    if (!roomCode) return;
    gamesApi
      .fetchRoom(roomCode)
      .then((r) => {
        setRoom(r);
        setLoadFailure(null);
      })
      // Any failure used to read as "this room does not exist or was
      // deleted" — including a dropped connection, which is the most likely
      // cause and the one where that sentence is simply false. A 404 is the
      // only thing that actually means gone.
      .catch((err: unknown) => {
        const missing = err instanceof AxiosError && err.response?.status === 404;
        setLoadFailure(missing ? "missing" : "network");
      });
  }, [roomCode]);

  useEffect(() => {
    load();
  }, [load]);

  // Poll at 1s while waiting/starting so every client — not just the
  // creator's, who sees "starting" instantly from their own Start response
  // — notices the countdown begin (and later, the room going RUNNING)
  // within ~1s instead of up to 3s late. A 3s-late discovery is what made
  // the countdown look like it "started at 2 seconds" for everyone else.
  useEffect(() => {
    if (!room || room.status === "finished") return;
    const intervalMs = room.status === "running" ? 3000 : 1000;
    const interval = setInterval(load, intervalMs);
    return () => clearInterval(interval);
  }, [room, load]);

  // The game starts automatically for everyone once the countdown ends —
  // jump straight into it rather than making players click again.
  useEffect(() => {
    if (room && room.status === "running" && prevStatusRef.current !== "running" && roomCode) {
      navigate(`/games/${roomCode}/play`);
    }
    if (room) prevStatusRef.current = room.status;
  }, [room, roomCode, navigate]);

  useEffect(() => {
    if (!room || room.status !== "starting" || !room.scheduled_start_at) {
      setCountdownSeconds(null);
      return;
    }
    const target = new Date(room.scheduled_start_at).getTime();
    function tick() {
      setCountdownSeconds(Math.max(0, Math.ceil((target - Date.now()) / 1000)));
    }
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [room]);

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

  async function handleKick() {
    if (!roomCode || !kickTarget) return;
    setError(null);
    try {
      await gamesApi.kickParticipant(roomCode, kickTarget.id);
      setKickTarget(null);
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

  if (loadFailure && !room) {
    return (
      <div className="mx-auto max-w-2xl px-[var(--space-4)] py-[var(--space-8)]">
        <PageHeader title="Խաղասենյակ" back={{ to: "/games", label: "Խաղասենյակներ" }} />
        {loadFailure === "missing" ? (
          <ErrorState
            title="Այս սենյակը գոյություն չունի կամ ջնջվել է։"
            hint="Ստուգիր կոդը, կամ խնդրիր ընկերոջդ նորը ուղարկել։"
          />
        ) : (
          <ErrorState
            title="Սենյակը չհաջողվեց բեռնել։"
            hint="Կապը կարող է ընդհատված լինել։ Սենյակը տեղում է։"
            onRetry={load}
          />
        )}
      </div>
    );
  }

  if (!room) {
    return (
      <div className="mx-auto max-w-2xl px-[var(--space-4)] py-[var(--space-8)]">
        <Skeleton className="mb-[var(--space-3)] h-4 w-32" />
        <Skeleton className="mb-[var(--space-6)] h-9 w-2/3" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const isCreator = user?.id === room.creator.id;
  const canStart = room.status === "waiting" && room.participant_count >= 2;

  const waitingForPlayers = room.status === "waiting" && room.participant_count < 2;

  return (
    <div className="mx-auto max-w-2xl px-[var(--space-4)] py-[var(--space-8)]">
      <PageHeader
        back={{ to: "/games", label: "Խաղասենյակներ" }}
        title={room.name}
        description={`Ստեղծող՝ ${displayName(room.creator)}`}
        actions={<Badge tone={STATUS_TONES[room.status]}>{STATUS_LABELS[room.status]}</Badge>}
      />

      <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-[var(--space-5)] shadow-[var(--shadow-sm)]">
        {error && <FormAlert message={error} />}

        {/* The code is the whole reason this screen exists before the game
            starts — it is what you send to a friend. */}
        <div className="flex items-center gap-[var(--space-3)] rounded-[var(--radius-md)] border border-border bg-bg px-[var(--space-4)] py-[var(--space-3)]">
          <span className="text-[length:var(--text-sm)] text-text-muted">Կոդ</span>
          <span className="text-[length:var(--text-xl)] font-semibold tracking-widest text-text">{room.room_code}</span>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCopyCode}
            className="ml-auto"
            iconLeft={copied
              ? <Check size={15} strokeWidth={2.25} aria-hidden />
              : <Copy size={15} strokeWidth={1.75} aria-hidden />}
          >
            {copied ? "Պատճենված է" : "Պատճենել"}
          </Button>
        </div>

        <p className="mt-[var(--space-3)] text-[length:var(--text-sm)] text-text-muted">
          {CONDITION_LABELS[room.start_condition]}
        </p>

        <div className="mt-[var(--space-6)]">
          <h2 className="mb-[var(--space-2)] text-[length:var(--text-sm)] font-semibold text-text">
            Մասնակիցներ ({room.participant_count}/{room.max_players})
          </h2>
          <ul className="flex flex-col gap-[var(--space-2)]">
            {room.participants.map((p) => (
              <li
                key={p.id}
                className={cn(
                  "flex items-center justify-between gap-[var(--space-2)] rounded-[var(--radius-md)]",
                  "border border-border px-[var(--space-3)] py-[var(--space-2)]",
                  p.user.id === user?.id && "border-primary bg-primary-bg",
                )}
              >
                <span className="min-w-0 truncate text-text">
                  {displayName(p.user)}
                  {p.user.id === user?.id && <span className="ml-2 text-[length:var(--text-xs)] text-primary">դու</span>}
                  {p.user.id === room.creator.id && (
                    <span className="ml-2 text-[length:var(--text-xs)] text-text-muted">ստեղծող</span>
                  )}
                </span>
                {isCreator && p.user.id !== room.creator.id && room.status === "waiting" && (
                  /* Was a filled red button in every row — the loudest thing
                     on the participant list, and one click from throwing
                     someone out with no confirmation. */
                  <IconButton
                    variant="ghost"
                    size="sm"
                    aria-label={`Հեռացնել ${displayName(p.user)}-ին սենյակից`}
                    onClick={() => setKickTarget({ id: p.user.id, name: displayName(p.user) })}
                    className="shrink-0 text-text-muted hover:text-incorrect"
                    icon={<UserMinus size={16} strokeWidth={1.75} aria-hidden />}
                  />
                )}
              </li>
            ))}
          </ul>
        </div>

        {room.status === "starting" && (
          <div
            role="status"
            className="mt-[var(--space-6)] rounded-[var(--radius-md)] border border-primary bg-surface-muted py-[var(--space-6)] text-center"
          >
            <p className="text-[length:var(--text-sm)] text-text-muted">Խաղը սկսվում է</p>
            <p className="text-[length:var(--text-5xl)] font-bold tabular-nums text-primary">
              {countdownSeconds ?? ""}
            </p>
          </div>
        )}

        {/* A finished room had no action at all — the results it produced,
            the only reason to open it again, were not linked from anywhere. */}
        {room.status === "finished" && (
          <LinkButton
            to={`/games/${room.room_code}/results`}
            variant="primary"
            size="lg"
            className="mt-[var(--space-6)] w-full justify-center"
            iconLeft={<Trophy size={18} strokeWidth={1.75} aria-hidden />}
          >
            Տեսնել արդյունքները
          </LinkButton>
        )}

        {room.status === "running" && (
          <LinkButton
            to={`/games/${room.room_code}/play`}
            variant="primary"
            size="lg"
            className="mt-[var(--space-6)] w-full justify-center"
            iconLeft={<Play size={18} strokeWidth={2} aria-hidden />}
          >
            Մուտք խաղին
          </LinkButton>
        )}

        <div className="mt-[var(--space-6)] flex flex-col gap-[var(--space-3)] sm:flex-row">
          {isCreator && room.status === "waiting" && (
            <>
              <Button onClick={handleStart} disabled={!canStart} loading={busy} className="sm:flex-1">
                Սկսել խաղը
              </Button>
              <Button variant="ghost" disabled={busy} onClick={() => setConfirmCancel(true)} className="sm:flex-1">
                Չեղարկել սենյակը
              </Button>
            </>
          )}
          {!isCreator && room.status === "waiting" && (
            <Button variant="ghost" disabled={busy} onClick={handleLeave} className="sm:flex-1">
              Լքել սենյակը
            </Button>
          )}
        </div>

        {/* A disabled button that will not say why is a dead end. This one
            sits disabled for as long as the creator is alone in the room. */}
        {isCreator && waitingForPlayers && (
          <p className="mt-[var(--space-2)] text-center text-[length:var(--text-sm)] text-text-muted">
            Խաղը սկսելու համար պետք է առնվազն ևս մեկ խաղացող։ Ուղարկիր վերևի կոդը։
          </p>
        )}
      </div>

      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title="Չեղարկե՞լ սենյակը"
        description={`Սենյակը կփակվի բոլորի համար, և ${room.participant_count} մասնակից դուրս կգա։`}
        confirmLabel="Չեղարկել սենյակը"
        cancelLabel="Թողնել բաց"
        busy={busy}
        onConfirm={handleCancel}
      />

      <ConfirmDialog
        open={kickTarget !== null}
        onOpenChange={(open) => !open && setKickTarget(null)}
        title="Հեռացնե՞լ մասնակցին"
        description={kickTarget ? `${kickTarget.name}-ը դուրս կգա սենյակից և կկարողանա նորից միանալ կոդով։` : undefined}
        confirmLabel="Հեռացնել"
        onConfirm={handleKick}
      />
    </div>
  );
}
