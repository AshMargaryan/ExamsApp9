import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ChevronDown, DoorOpen, Plus, Search, Shuffle } from "lucide-react";
import { AxiosError } from "axios";
import { Link, useNavigate } from "react-router-dom";
import * as gamesApi from "../api/games";
import type { GameRoom, StartCondition } from "../api/games";
import { getHierarchy } from "../api/practice";
import type { SubjectNode } from "../api/practice";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { ErrorState } from "../components/ui/ErrorState";
import { Field, FormAlert } from "../components/ui/Field";
import { LinkButton } from "../components/ui/LinkButton";
import { PageHeader } from "../components/ui/PageHeader";
import { Section } from "../components/ui/Section";
import { Select } from "../components/ui/Select";
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
  const [showCreate, setShowCreate] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [subjects, setSubjects] = useState<SubjectNode[] | null>(null);
  const [subjectsFailed, setSubjectsFailed] = useState(false);
  const [subjectId, setSubjectId] = useState<string>("");
  const [topicId, setTopicId] = useState<string>("");
  const [questionCount, setQuestionCount] = useState("10");
  const [secondsPerQuestion, setSecondsPerQuestion] = useState("30");

  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);

  const [myRooms, setMyRooms] = useState<GameRoom[] | null>(null);
  const [roomsFailed, setRoomsFailed] = useState(false);

  // Errors used to open a `MessageModal` — so being told "choose a subject"
  // meant dismissing a dialog before you could reach the field it was about.
  // Each form owns its own message, beside the form that produced it.
  const [createError, setCreateError] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  const loadRooms = useCallback(() => {
    setRoomsFailed(false);
    gamesApi.fetchMyRooms().then(setMyRooms).catch(() => setRoomsFailed(true));
  }, []);

  const loadSubjects = useCallback(() => {
    setSubjectsFailed(false);
    getHierarchy()
      .then((data) => {
        setSubjects(data);
        if (data.length > 0) setSubjectId((prev) => prev || String(data[0].id));
      })
      .catch(() => setSubjectsFailed(true));
  }, []);

  useEffect(() => {
    loadRooms();
    loadSubjects();
  }, [loadRooms, loadSubjects]);

  const selectedSubject = subjects?.find((s) => String(s.id) === subjectId) ?? null;
  const topicOptions = selectedSubject
    ? selectedSubject.domains.flatMap((d) => d.topics.map((t) => ({ id: t.id, name: t.name })))
    : [];

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreateError(null);
    if (!subjectId) {
      setCreateError("Ընտրիր առարկան։");
      return;
    }
    setCreating(true);
    try {
      const count = Number(questionCount);
      const seconds = Number(secondsPerQuestion);
      const room = await gamesApi.createRoom({
        name: name.trim() || "Խաղասենյակ",
        max_players: Number(maxPlayers),
        start_condition: startCondition,
        timer_seconds: startCondition === "timer" ? Number(timerSeconds) : undefined,
        min_players_to_start: startCondition === "player_count" ? Number(minPlayers) : undefined,
        settings: {
          subject: Number(subjectId),
          topic: topicId ? Number(topicId) : null,
          question_count: count,
          easy_count: 0,
          medium_count: count,
          hard_count: 0,
          // The form asked for three per-difficulty time limits while the
          // payload has always hardcoded `easy_count: 0, hard_count: 0` — so
          // two of the three fields configured a difficulty that could never
          // appear in the game. One number, for the questions that exist.
          easy_time_limit: seconds,
          medium_time_limit: seconds,
          hard_time_limit: seconds,
        },
      });
      navigate(`/games/${room.room_code}`);
    } catch (err) {
      setCreateError(extractError(err, "Սենյակի ստեղծումը ձախողվեց։"));
    } finally {
      setCreating(false);
    }
  }

  async function handleJoin(e: FormEvent) {
    e.preventDefault();
    setJoinError(null);
    setJoining(true);
    try {
      const room = await gamesApi.joinRoom(joinCode.trim().toUpperCase());
      navigate(`/games/${room.room_code}`);
    } catch (err) {
      setJoinError(extractError(err, "Սենյակին միանալը ձախողվեց։"));
    } finally {
      setJoining(false);
    }
  }

  const activeRooms = myRooms?.filter((r) => r.status !== "finished") ?? [];

  return (
    <div className="mx-auto max-w-3xl px-[var(--space-4)] py-[var(--space-8)]">
      <PageHeader
        title="Խաղասենյակներ"
        description="Խաղա նույն թեմայի հարցերով ընկերների կամ պատահական մրցակիցների հետ։"
        back={{ to: "/", label: "Գլխավոր" }}
      />

      {/*
        Reordered by how often a student does each thing.

        The page used to open with a nine-field configuration form, and put
        joining with a code — the thing you do when a friend sends you one, and
        by far the most common act here — in a small card to its right. Quick
        match, the path that needs no setup at all, was a button in the header.
        Creating a room is the rarest of the three and the only one that needs
        settings, so it is last and folded away until asked for.
      */}
      {activeRooms.length > 0 && (
        <Section title="Շարունակել" level={2} spacing="tight">
          <ul className="flex flex-col gap-[var(--space-2)]">
            {activeRooms.map((room) => (
              <li key={room.id}>
                <Link
                  to={`/games/${room.room_code}`}
                  className={cn(
                    "flex items-center justify-between gap-[var(--space-3)] rounded-[var(--radius-lg)]",
                    "border border-border bg-surface px-[var(--space-4)] py-[var(--space-3)]",
                    "transition-colors hover:border-primary",
                  )}
                >
                  <span className="min-w-0 flex-1 truncate font-medium text-text">{room.name}</span>
                  <span className="shrink-0 text-[length:var(--text-sm)] tabular-nums text-text-muted">
                    {room.participant_count}/{room.max_players}
                  </span>
                  <Badge tone={STATUS_TONES[room.status]}>{STATUS_LABELS[room.status]}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {myRooms === null && !roomsFailed && (
        <div className="mb-[var(--space-6)] flex flex-col gap-[var(--space-2)]">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-12 w-full" />
        </div>
      )}
      {roomsFailed && (
        <div className="mb-[var(--space-6)]">
          <ErrorState
            title="Ակտիվ սենյակների ցանկը չբեռնվեց։"
            hint="Կոդով միանալը և նոր սենյակ ստեղծելը շարունակում են աշխատել։"
            onRetry={loadRooms}
          />
        </div>
      )}

      <div className="grid gap-[var(--space-4)] sm:grid-cols-2">
        <Card className="p-[var(--space-5)]">
          <h2 className="mb-[var(--space-1)] flex items-center gap-[var(--space-2)] font-display text-[length:var(--text-lg)] font-semibold text-text">
            <DoorOpen size={18} strokeWidth={1.75} aria-hidden className="text-primary" />
            Միանալ կոդով
          </h2>
          <p className="mb-[var(--space-4)] text-[length:var(--text-sm)] text-text-muted">
            Ընկերդ ուղարկե՞լ է սենյակի կոդը։
          </p>
          <form onSubmit={handleJoin}>
            {joinError && <FormAlert message={joinError} />}
            <Field
              label="Սենյակի կոդ"
              value={joinCode}
              onChange={(e) => {
                setJoinCode(e.target.value);
                if (joinError) setJoinError(null);
              }}
              placeholder="ABC123"
              maxLength={8}
              required
              autoCapitalize="characters"
              autoComplete="off"
              /* Latin room codes are one of the two places this project keeps
                 `uppercase` — see the typography note in docs/DESIGN.md. */
              className="uppercase tracking-widest"
            />
            <Button type="submit" variant="secondary" loading={joining} className="w-full">
              Միանալ
            </Button>
          </form>
        </Card>

        <Card className="flex flex-col p-[var(--space-5)]">
          <h2 className="mb-[var(--space-1)] flex items-center gap-[var(--space-2)] font-display text-[length:var(--text-lg)] font-semibold text-text">
            <Shuffle size={18} strokeWidth={1.75} aria-hidden className="text-primary" />
            Արագ խաղ
          </h2>
          <p className="mb-[var(--space-4)] flex-1 text-[length:var(--text-sm)] text-text-muted">
            Ընտրիր առարկան, մենք կգտնենք մրցակիցներ։ Կարգավորումներ պետք չեն։
          </p>
          <LinkButton to="/games/find" variant="primary" size="md" className="w-full justify-center">
            <Search size={16} strokeWidth={2} aria-hidden />
            Գտնել խաղ
          </LinkButton>
        </Card>
      </div>

      <div className="mt-[var(--space-6)] rounded-[var(--radius-lg)] border border-border">
        <button
          type="button"
          aria-expanded={showCreate}
          onClick={() => setShowCreate((v) => !v)}
          className={cn(
            "flex w-full items-center justify-between gap-[var(--space-3)] rounded-[var(--radius-lg)]",
            "px-[var(--space-5)] py-[var(--space-4)] text-left transition-colors hover:bg-surface-muted",
          )}
        >
          <span>
            <span className="flex items-center gap-[var(--space-2)] font-display text-[length:var(--text-lg)] font-semibold text-text">
              <Plus size={18} strokeWidth={2} aria-hidden className="text-primary" />
              Ստեղծել սեփական սենյակ
            </span>
            <span className="mt-0.5 block text-[length:var(--text-sm)] text-text-muted">
              Ինքդ ընտրիր առարկան, հարցերի քանակը և ժամանակը։
            </span>
          </span>
          <ChevronDown
            size={18}
            strokeWidth={1.75}
            aria-hidden
            className={cn(
              "shrink-0 text-text-muted transition-transform duration-[var(--motion-fast)]",
              showCreate && "rotate-180",
            )}
          />
        </button>

        {showCreate && (
          <form onSubmit={handleCreate} className="border-t border-border p-[var(--space-5)]">
            {createError && <FormAlert message={createError} />}

            {subjectsFailed ? (
              <ErrorState
                title="Առարկաների ցանկը չբեռնվեց։"
                hint="Առանց առարկայի սենյակ չի ստեղծվում։"
                onRetry={loadSubjects}
              />
            ) : (
              <>
                {/* Wrapped in `Field` rather than relying on Select's own
                    `label`, which is only an accessible name: without this the
                    subject and topic dropdowns showed their current value and
                    nothing else, while the number fields beside them carried
                    visible labels. */}
                <Field label="Առարկա">
                  {({ id }) => (
                    <Select
                      id={id}
                      value={subjectId}
                      onChange={(v) => {
                        setSubjectId(v);
                        setTopicId("");
                      }}
                      disabled={subjects === null}
                      placeholder={subjects === null ? "Բեռնվում է..." : "Ընտրիր առարկան"}
                      options={(subjects ?? []).map((s) => ({ value: String(s.id), label: s.name }))}
                    />
                  )}
                </Field>

                {topicOptions.length > 0 && (
                  <Field label="Թեմա">
                    {({ id }) => (
                      <Select
                        id={id}
                        value={topicId}
                        onChange={setTopicId}
                        placeholder="Բոլոր թեմաները"
                        options={[
                          { value: "", label: "Բոլոր թեմաները" },
                          ...topicOptions.map((t) => ({ value: String(t.id), label: t.name })),
                        ]}
                      />
                    )}
                  </Field>
                )}

                <div className="grid gap-[var(--space-4)] sm:grid-cols-2">
                  <Field
                    label="Հարցերի քանակ"
                    type="number"
                    min={1}
                    max={50}
                    value={questionCount}
                    onChange={(e) => setQuestionCount(e.target.value)}
                    required
                  />
                  <Field
                    label="Վայրկյան մեկ հարցին"
                    type="number"
                    min={5}
                    max={300}
                    value={secondsPerQuestion}
                    onChange={(e) => setSecondsPerQuestion(e.target.value)}
                    required
                  />
                </div>

                {/* Name, player cap and start condition all have workable
                    defaults, and asking for them up front was most of what
                    made this a nine-field form. */}
                <button
                  type="button"
                  aria-expanded={showAdvanced}
                  onClick={() => setShowAdvanced((v) => !v)}
                  className="mb-[var(--space-4)] inline-flex items-center gap-[var(--space-2)] rounded-[var(--radius-md)] text-[length:var(--text-sm)] font-medium text-primary transition-colors hover:text-primary-hover"
                >
                  <ChevronDown
                    size={15}
                    strokeWidth={2}
                    aria-hidden
                    className={cn("transition-transform duration-[var(--motion-fast)]", showAdvanced && "rotate-180")}
                  />
                  Լրացուցիչ կարգավորումներ
                </button>

                {showAdvanced && (
                  <>
                    <Field
                      label="Սենյակի անվանում"
                      hint="Դատարկ թողնելու դեպքում կկոչվի «Խաղասենյակ»"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={100}
                    />
                    <Field
                      label="Խաղացողների առավելագույն քանակ"
                      type="number"
                      min={2}
                      max={20}
                      value={maxPlayers}
                      onChange={(e) => setMaxPlayers(e.target.value)}
                      required
                    />
                    <Field label="Սկսելու պայման">
                      {({ id }) => (
                        <Select
                          id={id}
                          value={startCondition}
                          onChange={(v) => setStartCondition(v as StartCondition)}
                          options={[
                            { value: "manual", label: "Ձեռքով սկսել" },
                            { value: "timer", label: "Ժամանակաչափով" },
                            { value: "player_count", label: "Երբ բավարար խաղացողներ միանան" },
                          ]}
                        />
                      )}
                    </Field>
                    {startCondition === "timer" && (
                      <Field
                        label="Ժամանակաչափ (վայրկյան)"
                        type="number"
                        min={10}
                        max={3600}
                        value={timerSeconds}
                        onChange={(e) => setTimerSeconds(e.target.value)}
                        required
                      />
                    )}
                    {startCondition === "player_count" && (
                      <Field
                        label="Նվազագույն խաղացողների քանակ"
                        type="number"
                        min={2}
                        max={Number(maxPlayers) || 20}
                        value={minPlayers}
                        onChange={(e) => setMinPlayers(e.target.value)}
                        required
                      />
                    )}
                  </>
                )}

                <Button type="submit" loading={creating} className="w-full">
                  Ստեղծել սենյակ
                </Button>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
