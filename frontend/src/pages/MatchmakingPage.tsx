import { useCallback, useEffect, useRef, useState } from "react";
import { AxiosError } from "axios";
import { useNavigate } from "react-router-dom";
import { Search, Users } from "lucide-react";
import * as gamesApi from "../api/games";
import type { MatchmakingQueue, MatchmakingTicket } from "../api/games";
import { getHierarchy } from "../api/practice";
import type { SubjectNode } from "../api/practice";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { Field, FormAlert } from "../components/ui/Field";
import { PageHeader } from "../components/ui/PageHeader";
import { Select } from "../components/ui/Select";
import { Skeleton } from "../components/ui/Skeleton";

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
  const [loadFailed, setLoadFailed] = useState(false);

  const refreshStatus = useCallback(async () => {
    const tickets = await gamesApi.fetchMatchmakingStatus();
    const active = tickets[0] ?? null;

    if (active?.status === "matched" && active.room_code) {
      navigate(`/games/${active.room_code}`);
      return;
    }
    setTicket(active);
  }, [navigate]);

  const load = useCallback(() => {
    setLoadFailed(false);
    // Both were unguarded `.then()`s, so any failure left the page on
    // "Բեռնվում է..." with no error and no way to try again.
    Promise.all([
      gamesApi.fetchMatchmakingQueues().then(setQueues),
      getHierarchy().then((data) => {
        setSubjects(data);
        if (data.length > 0) setSubjectId((prev) => prev || String(data[0].id));
      }),
      refreshStatus(),
    ]).catch(() => setLoadFailed(true));
  }, [refreshStatus]);

  useEffect(() => {
    load();
  }, [load]);

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
      setError("Ընտրիր առարկան։");
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
    <div className="mx-auto max-w-xl px-[var(--space-4)] py-[var(--space-8)]">
      <PageHeader
        title="Գտնել խաղ"
        description="Ընտրիր առարկան, մենք կգտնենք մրցակիցներ։"
        back={{ to: "/games", label: "Խաղասենյակներ" }}
      />

      {error && <FormAlert message={error} />}

      {loadFailed && !ticket && (
        <ErrorState
          title="Ընտրանքների ցանկը չհաջողվեց բեռնել։"
          hint="Ստուգիր կապը և փորձիր կրկին։"
          onRetry={load}
        />
      )}

      {!ticket && !loadFailed && (
        <div className="flex flex-col gap-[var(--space-4)]">
          <Field label="Առարկա">
            {({ id }) => (
              <Select
                id={id}
                value={subjectId}
                onChange={setSubjectId}
                disabled={subjects === null}
                placeholder={subjects === null ? "Բեռնվում է..." : "Ընտրիր առարկան"}
                options={(subjects ?? []).map((s) => ({ value: String(s.id), label: s.name }))}
              />
            )}
          </Field>

          {queues === null && (
            <>
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </>
          )}
          {queues?.map((queue) => (
            <div
              key={queue.id}
              className="rounded-[var(--radius-lg)] border border-border bg-surface p-[var(--space-5)] shadow-[var(--shadow-sm)]"
            >
              <h2 className="font-display text-[length:var(--text-lg)] font-semibold text-text">{queue.name}</h2>
              <QueueRules queue={queue} />
              {/* Every queue card carried a button reading "Գտնել խաղ" —
                  identical to the page title and to each other, so a screen
                  reader's button list gave no way to tell them apart. The
                  visible label stays short because the card heading directly
                  above already names the queue; the accessible name carries
                  it, which is where the ambiguity actually was. */}
              <Button
                type="button"
                loading={starting}
                onClick={() => handleFindGame(queue.id)}
                aria-label={`Միանալ «${queue.name}» ընտրանքին`}
                className="mt-[var(--space-4)] w-full"
                iconLeft={<Search size={16} strokeWidth={2} aria-hidden />}
              >
                Միանալ
              </Button>
            </div>
          ))}
          {queues?.length === 0 && (
            <EmptyState
              icon={<Users size={24} strokeWidth={1.75} aria-hidden />}
              title="Այս պահին հասանելի հանրային ընտրանքներ չկան։"
              hint="Կարող ես սեփական սենյակ ստեղծել և ընկերոջդ կոդն ուղարկել։"
              cta={{ label: "Խաղասենյակներ", onClick: () => navigate("/games") }}
            />
          )}
        </div>
      )}

      {ticket && (
        <div className="rounded-[var(--radius-lg)] border border-border bg-surface p-[var(--space-7)] text-center shadow-[var(--shadow-sm)]">
          <p className="font-display text-[length:var(--text-lg)] font-semibold text-text">{ticket.queue.name}</p>
          {ticket.subject_name && (
            <p className="text-[length:var(--text-sm)] text-text-muted">{ticket.subject_name}</p>
          )}
          <p
            role="status"
            className="my-[var(--space-6)] flex items-center justify-center gap-[var(--space-3)] text-text-muted"
          >
            <span className="h-3 w-3 animate-pulse rounded-full bg-primary motion-reduce:animate-none" />
            Որոնում ենք մրցակիցներ...
          </p>

          <div className="grid grid-cols-2 gap-[var(--space-4)]">
            <div className="rounded-[var(--radius-md)] border border-border bg-bg p-[var(--space-4)]">
              <p className="text-[length:var(--text-2xl)] font-semibold tabular-nums text-text">
                {ticket.players_waiting}
                {ticket.queue.start_mode === "player_count" ? ` / ${ticket.queue.min_players}` : ""}
              </p>
              <p className="mt-1 text-[length:var(--text-sm)] text-text-muted">Սպասող խաղացողներ</p>
            </div>
            <div className="rounded-[var(--radius-md)] border border-border bg-bg p-[var(--space-4)]">
              <p className="text-[length:var(--text-2xl)] font-semibold tabular-nums text-text">
                {secondsLeft !== null ? `${secondsLeft}վ` : "—"}
              </p>
              <p className="mt-1 text-[length:var(--text-sm)] text-text-muted">Մինչև մեկնարկը</p>
            </div>
          </div>

          <p className="mt-[var(--space-4)] text-[length:var(--text-xs)] text-text-muted">
            Կարող ես թողնել այս էջը բաց — խաղը կբացվի ինքնաշխատ, հենց մրցակիցները հավաքվեն։
          </p>

          <Button variant="ghost" onClick={handleCancel} className="mt-[var(--space-4)] w-full">
            Չեղարկել որոնումը
          </Button>
        </div>
      )}
    </div>
  );
}
