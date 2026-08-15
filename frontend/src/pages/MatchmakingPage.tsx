import { useCallback, useEffect, useRef, useState } from "react";
import { AxiosError } from "axios";
import { useNavigate } from "react-router-dom";
import * as gamesApi from "../api/games";
import type { MatchmakingQueue, MatchmakingTicket } from "../api/games";
import { getHierarchy } from "../api/practice";
import type { SubjectNode } from "../api/practice";
import { MessageModal } from "../components/MessageModal";
import { LinkButton } from "../components/ui/LinkButton";

function extractError(err: unknown, fallback: string): string {
  if (err instanceof AxiosError && err.response?.data) {
    const data = err.response.data as Record<string, string[] | string>;
    const first = Object.values(data).flat()[0];
    return (first as string) ?? fallback;
  }
  return fallback;
}

function QueueRules({ queue }: { queue: MatchmakingQueue }) {
  if (queue.start_mode === "player_count") {
    return (
      <p className="text-sm text-text-muted">
        Կսկսվի, երբ միանա նվազագույնը {queue.min_players} խաղացող (առավելագույնը՝ {queue.max_players})
      </p>
    );
  }
  return (
    <p className="text-sm text-text-muted">
      Կսկսվի {queue.timer_seconds} վայրկյան հետո՝ ում հասցրել է միանալ (առավելագույնը՝ {queue.max_players} խաղացող)
    </p>
  );
}

export function MatchmakingPage() {
  const navigate = useNavigate();

  const [queues, setQueues] = useState<MatchmakingQueue[] | null>(null);
  const [ticket, setTicket] = useState<MatchmakingTicket | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const cancellingRef = useRef(false);

  const [subjects, setSubjects] = useState<SubjectNode[] | null>(null);
  const [subjectId, setSubjectId] = useState<string>("");

  const refreshStatus = useCallback(async () => {
    const tickets = await gamesApi.fetchMatchmakingStatus();
    const active = tickets[0] ?? null;

    if (active?.status === "matched" && active.room_code) {
      navigate(`/games/${active.room_code}`);
      return;
    }
    setTicket(active);
  }, [navigate]);

  useEffect(() => {
    gamesApi.fetchMatchmakingQueues().then(setQueues);
    getHierarchy().then((data) => {
      setSubjects(data);
      if (data.length > 0) setSubjectId(String(data[0].id));
    });
    refreshStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ticket) return;
    const interval = setInterval(refreshStatus, 2000);
    return () => clearInterval(interval);
  }, [ticket, refreshStatus]);

  useEffect(() => {
    if (!ticket?.scheduled_start_at) {
      setSecondsLeft(null);
      return;
    }
    const target = new Date(ticket.scheduled_start_at).getTime();
    function tick() {
      setSecondsLeft(Math.max(0, Math.round((target - Date.now()) / 1000)));
    }
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [ticket?.scheduled_start_at]);

  async function handleFindGame(queueId: number) {
    if (!subjectId) {
      setError("Ընտրեք առարկան։");
      return;
    }
    setError(null);
    setStarting(true);
    try {
      const newTicket = await gamesApi.findGame(queueId, Number(subjectId));
      if (newTicket.status === "matched" && newTicket.room_code) {
        navigate(`/games/${newTicket.room_code}`);
        return;
      }
      setTicket(newTicket);
    } catch (err) {
      setError(extractError(err, "Խաղ գտնելը ձախողվեց։"));
    } finally {
      setStarting(false);
    }
  }

  async function handleCancel() {
    if (!ticket || cancellingRef.current) return;
    cancellingRef.current = true;
    try {
      await gamesApi.cancelMatchmaking(ticket.queue.id);
      setTicket(null);
    } catch (err) {
      setError(extractError(err, "Որոնումը չեղարկելը ձախողվեց։"));
    } finally {
      cancellingRef.current = false;
    }
  }

  return (
    <div className="min-h-screen bg-bg px-4 py-8">
      <div className="mx-auto max-w-xl">
        <LinkButton to="/games" className="mb-6">← Խաղասենյակներ</LinkButton>

        <h1 className="mb-6 text-3xl font-semibold text-text">Գտնել խաղ</h1>

        {!ticket && (
          <div className="flex flex-col gap-4">
            <div className="rounded-[var(--radius)] border border-border bg-surface p-4">
              <label className="mb-1 block text-sm text-text-muted">Առարկա</label>
              <select
                className="w-full rounded-md border border-border bg-bg px-3 py-2 text-text outline-none focus:border-primary"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
              >
                {subjects === null && <option value="">Բեռնվում է...</option>}
                {subjects?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {queues === null && <p className="text-text-muted">Բեռնվում է...</p>}
            {queues?.map((queue) => (
              <div
                key={queue.id}
                className="rounded-[var(--radius)] border border-border bg-surface p-6 shadow-sm"
              >
                <h2 className="text-lg font-semibold text-text">{queue.name}</h2>
                <QueueRules queue={queue} />
                <button
                  type="button"
                  disabled={starting}
                  onClick={() => handleFindGame(queue.id)}
                  className="mt-4 w-full rounded-md bg-primary py-2.5 text-lg font-medium text-primary-contrast transition-colors hover:bg-primary-hover disabled:opacity-60"
                >
                  {starting ? "..." : "Գտնել խաղ"}
                </button>
              </div>
            ))}
            {queues?.length === 0 && (
              <p className="text-text-muted">Այս պահին հասանելի հանրային ընտրանքներ չկան։</p>
            )}
          </div>
        )}

        {ticket && (
          <div className="rounded-[var(--radius)] border border-border bg-surface p-8 text-center shadow-sm">
            <p className="text-lg font-medium text-text">{ticket.queue.name}</p>
            {ticket.subject_name && (
              <p className="text-sm text-text-muted">{ticket.subject_name}</p>
            )}
            <div className="my-6 flex items-center justify-center gap-3">
              <span className="h-3 w-3 animate-pulse rounded-full bg-primary" />
              <p className="text-text-muted">Որոնում է հակառակորդներ...</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-md border border-border bg-bg p-4">
                <p className="text-2xl font-semibold text-text">
                  {ticket.players_waiting}
                  {ticket.queue.start_mode === "player_count" ? ` / ${ticket.queue.min_players}` : ""}
                </p>
                <p className="mt-1 text-sm text-text-muted">Սպասող խաղացողներ</p>
              </div>
              <div className="rounded-md border border-border bg-bg p-4">
                <p className="text-2xl font-semibold text-text">
                  {secondsLeft !== null ? `${secondsLeft}վ` : "—"}
                </p>
                <p className="mt-1 text-sm text-text-muted">Մինչև մեկնարկը</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCancel}
              className="mt-6 w-full rounded-md border border-border py-2.5 font-medium text-text-muted transition-colors hover:bg-surface-muted"
            >
              Չեղարկել որոնումը
            </button>
          </div>
        )}
      </div>

      {error && <MessageModal message={error} onClose={() => setError(null)} />}
    </div>
  );
}
