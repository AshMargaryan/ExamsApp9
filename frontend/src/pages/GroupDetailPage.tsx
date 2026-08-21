import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  deleteGroup, fetchGroup, joinGroup, leaveGroup, transferLeadership, type GroupDetail,
} from "../api/groups";
import {
  cancelCall, createCall, joinCall, leaveCall, listCalls, type CallRoom, type CallRoomStatus,
} from "../api/calls";
import { useAuth } from "../auth/AuthContext";
import { ConfirmModal } from "../components/ConfirmModal";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { ErrorState } from "../components/ui/ErrorState";
import { PageHeader } from "../components/ui/PageHeader";
import { LoadingRegion, Skeleton } from "../components/ui/Skeleton";
import { Section } from "../components/ui/Section";
import { extractErrorMessage, useToast } from "../context/ToastContext";
import { subjectMeta } from "../lib/subjects";
import { LinkButton } from "../components/ui/LinkButton";

const CALL_STATUS_LABELS: Record<CallRoomStatus, string> = {
  waiting: "Սպասում է",
  ready: "Պատրաստ է",
  active: "Ընթացքի մեջ է",
  ended: "Ավարտված է",
};

const CALL_MIN_CAPACITY = 2;
const CALL_MAX_CAPACITY = 8;
const CALL_DEFAULT_CAPACITY = 4;

const WEEKDAY_LABELS = ["Երկուշաբթի", "Երեքշաբթի", "Չորեքշաբթի", "Հինգշաբթի", "Ուրբաթ", "Շաբաթ", "Կիրակի"];

function formatTime(t: string) {
  return t.slice(0, 5);
}

function displayName(u: { first_name: string; last_name: string; username: string }) {
  return [u.first_name, u.last_name].filter(Boolean).join(" ") || u.username;
}

function CallRoomCard({
  call, myId, busy, onJoin, onLeave, onCancel,
}: {
  call: CallRoom;
  myId: number | undefined;
  busy: boolean;
  onJoin: () => void;
  onLeave: () => void;
  onCancel: () => void;
}) {
  const isParticipant = call.participants.some((p) => p.user.id === myId);
  const isCreator = call.creator.id === myId;

  return (
    <div className="flex flex-col gap-2 border-b border-border py-3 last:border-b-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              call.status === "waiting"
                ? "bg-primary/10 text-primary"
                : call.status === "ready"
                  ? "bg-correct-bg text-correct"
                  : "bg-surface-muted text-text-muted"
            }`}
          >
            {CALL_STATUS_LABELS[call.status]}
          </span>
          <span className="text-sm text-text-muted">
            {displayName(call.creator)} սկսեց · {call.participant_count}/{call.capacity}
          </span>
        </div>
        <div className="flex gap-2">
          {!isParticipant && call.status === "waiting" && (
            <Button size="sm" onClick={onJoin} loading={busy}>
              Գրանցվել
            </Button>
          )}
          {isParticipant && !isCreator && (
            <Button size="sm" variant="secondary" onClick={onLeave} loading={busy}>
              Դուրս գալ
            </Button>
          )}
          {isCreator && (call.status === "waiting" || call.status === "ready") && (
            <Button size="sm" variant="danger" onClick={onCancel} loading={busy}>
              Չեղարկել
            </Button>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {call.participants.map((p) => (
          <span
            key={p.user.id}
            className="rounded-full border border-border px-2 py-0.5 text-xs text-text-muted"
          >
            {displayName(p.user)}
          </span>
        ))}
      </div>
      {call.status === "ready" && (
        <p className="text-xs text-text-muted">
          Բոլորը գրանցվել են, բայց տեսազանգի գործառույթը դեռ մշակման փուլում է — շուտով հասանելի կլինի։
        </p>
      )}
    </div>
  );
}

export function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [transferTarget, setTransferTarget] = useState<number | "">("");

  const [calls, setCalls] = useState<CallRoom[] | null>(null);
  const [callBusy, setCallBusy] = useState(false);
  const [showStartCall, setShowStartCall] = useState(false);
  const [newCallCapacity, setNewCallCapacity] = useState(CALL_DEFAULT_CAPACITY);

  /*
    This was `fetchGroup(id).then(setGroup)` with no catch, and the entire
    page was gated on `!group` — so a deleted group, a 403, or one offline
    moment left a grey block pulsing for ever, with nothing said and nothing
    to press. The group either loads, explains why it did not, or offers the
    way back to the list.
  */
  function load() {
    setGroup(null);
    setLoadFailed(false);
    fetchGroup(Number(id)).then(setGroup).catch(() => setLoadFailed(true));
  }

  // The call list is genuinely secondary: if it fails the group page is
  // still useful, so it degrades to "no calls" rather than taking the page
  // down with it.
  function loadCalls() {
    if (!id) return;
    listCalls(Number(id)).then(setCalls).catch(() => setCalls([]));
  }

  useEffect(load, [id]);
  useEffect(loadCalls, [id]);

  if (loadFailed) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <PageHeader title="Ուսումնական խումբ" back={{ to: "/groups", label: "Ուսումնական խմբեր" }} />
        <ErrorState
          title="Խումբը չհաջողվեց բեռնել։"
          hint="Հնարավոր է՝ այն ջնջվել է, կամ կապի խնդիր կա։"
          onRetry={load}
        />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <LoadingRegion>
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-[var(--space-3)] h-8 w-2/3" />
          <Skeleton className="mt-[var(--space-6)] h-48 w-full" />
        </LoadingRegion>
      </div>
    );
  }

  const subject = subjectMeta(group.subject);
  const myMembership = group.members.find((m) => m.user.id === user?.id);
  const isMember = !!myMembership;
  const isLeader = group.leader.id === user?.id;
  const full = group.members.length >= group.max_members;
  const otherMembers = group.members.filter((m) => m.user.id !== group.leader.id);

  async function handleJoin() {
    if (!group) return;
    setBusy(true);
    try {
      const updated = await joinGroup(group.id);
      setGroup(updated);
      showSuccess("Միացար խմբին։");
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleLeave() {
    if (!group) return;
    setBusy(true);
    try {
      await leaveGroup(group.id);
      showSuccess("Լքեցիր խումբը։");
      load();
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!group) return;
    setBusy(true);
    try {
      await deleteGroup(group.id);
      showSuccess("Խումբը ջնջվեց։");
      navigate("/groups");
    } catch (err) {
      showError(extractErrorMessage(err));
      setBusy(false);
    }
  }

  async function handleTransfer() {
    if (!group || transferTarget === "") return;
    setBusy(true);
    try {
      const updated = await transferLeadership(group.id, transferTarget);
      setGroup(updated);
      setTransferring(false);
      setTransferTarget("");
      showSuccess("Ղեկավարությունը փոխանցվեց։");
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleStartCall() {
    if (!group) return;
    setCallBusy(true);
    try {
      await createCall(group.id, newCallCapacity);
      showSuccess("Զանգը ստեղծվեց։");
      setShowStartCall(false);
      loadCalls();
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setCallBusy(false);
    }
  }

  async function handleJoinCall(callId: number) {
    setCallBusy(true);
    try {
      await joinCall(callId);
      loadCalls();
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setCallBusy(false);
    }
  }

  async function handleLeaveCall(callId: number) {
    setCallBusy(true);
    try {
      await leaveCall(callId);
      loadCalls();
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setCallBusy(false);
    }
  }

  async function handleCancelCall(callId: number) {
    setCallBusy(true);
    try {
      await cancelCall(callId);
      showSuccess("Զանգը չեղարկվեց։");
      loadCalls();
    } catch (err) {
      showError(extractErrorMessage(err));
    } finally {
      setCallBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <LinkButton to="/groups" className="mb-4">← Խմբեր</LinkButton>

      <div className="mb-6">
        {subject && (
          <span className="mb-2 inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-0.5 text-xs font-medium tracking-wide text-text-muted">
            <subject.Icon size={13} strokeWidth={1.75} aria-hidden />
            {subject.label}
          </span>
        )}
        <h1 className="mb-1 text-3xl font-semibold text-text">{group.title}</h1>
        <p className="text-sm text-text-muted">
          Ղեկավար՝ {displayName(group.leader)} · {group.members.length}/{group.max_members} անդամ
        </p>
      </div>

      {group.description && (
        <Card className="mb-4">
          <p className="whitespace-pre-wrap text-text">{group.description}</p>
        </Card>
      )}

      <Card className="mb-6">
        <Section spacing="none" level={3} title="Ժամանակացույց">
        <p className="text-text">
          {WEEKDAY_LABELS[group.schedule_day]}, {formatTime(group.schedule_start_time)}–
          {formatTime(group.schedule_end_time)}
        </p>
        </Section>
      </Card>

      <Card className="mb-6">
        <Section
          spacing="none"
          level={3}
          title={`Անդամներ (${group.members.length}/${group.max_members})`}
        >
        <div className="flex flex-col divide-y divide-border">
          {group.members.map((m) => (
            <div key={m.user.id} className="flex items-center justify-between py-2.5">
              <span className="text-text">{displayName(m.user)}</span>
              {m.role === "leader" && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  Ղեկավար
                </span>
              )}
            </div>
          ))}
        </div>
        </Section>
      </Card>

      {isMember && (
        <Card className="mb-6">
          <Section
            spacing="none"
            level={3}
            title="Զանգեր"
            action={
              !showStartCall ? (
                <Button size="sm" onClick={() => setShowStartCall(true)}>
                  + Սկսել զանգ
                </Button>
              ) : null
            }
          >

          {showStartCall && (
            <div className="mb-4 flex flex-wrap items-end gap-3 rounded-[var(--radius)] border border-border bg-bg p-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-text">Մասնակիցների քանակ</label>
                <input
                  type="number"
                  min={CALL_MIN_CAPACITY}
                  max={CALL_MAX_CAPACITY}
                  value={newCallCapacity}
                  onChange={(e) => setNewCallCapacity(Number(e.target.value))}
                  className="w-24 rounded-md border border-border bg-surface px-3 py-2 text-text focus:border-primary focus:outline-none"
                />
              </div>
              <Button onClick={handleStartCall} loading={callBusy}>
                Ստեղծել
              </Button>
              <Button variant="ghost" onClick={() => setShowStartCall(false)}>
                Չեղարկել
              </Button>
            </div>
          )}

          {!calls ? (
            <div className="h-16 animate-pulse rounded-[var(--radius)] bg-surface-muted" />
          ) : calls.length === 0 ? (
            <p className="text-sm text-text-muted">Ընթացիկ զանգեր չկան։</p>
          ) : (
            <div className="flex flex-col">
              {calls.map((c) => (
                <CallRoomCard
                  key={c.id}
                  call={c}
                  myId={user?.id}
                  busy={callBusy}
                  onJoin={() => handleJoinCall(c.id)}
                  onLeave={() => handleLeaveCall(c.id)}
                  onCancel={() => handleCancelCall(c.id)}
                />
              ))}
            </div>
          )}
          </Section>
        </Card>
      )}

      <div className="flex flex-wrap gap-3">
        {!isMember && !full && (
          <Button onClick={handleJoin} loading={busy}>
            Միանալ
          </Button>
        )}
        {!isMember && full && (
          <Button disabled variant="secondary">
            Խումբը լրացված է
          </Button>
        )}
        {isMember && !isLeader && (
          <Button onClick={handleLeave} loading={busy} variant="secondary">
            Լքել խումբը
          </Button>
        )}
        {isLeader && otherMembers.length > 0 && (
          <Button onClick={() => setTransferring((v) => !v)} variant="secondary">
            Փոխանցել ղեկավարությունը
          </Button>
        )}
        {isLeader && (
          <Button onClick={() => setConfirmDelete(true)} variant="danger">
            Ջնջել խումբը
          </Button>
        )}
      </div>

      {transferring && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-[var(--radius)] border border-border bg-surface p-4">
          <select
            value={transferTarget}
            onChange={(e) => setTransferTarget(e.target.value ? Number(e.target.value) : "")}
            className="rounded-md border border-border bg-bg px-3 py-2 text-text focus:border-primary focus:outline-none"
          >
            <option value="">Ընտրիր անդամ…</option>
            {otherMembers.map((m) => (
              <option key={m.user.id} value={m.user.id}>
                {displayName(m.user)}
              </option>
            ))}
          </select>
          <Button onClick={handleTransfer} loading={busy} disabled={transferTarget === ""}>
            Հաստատել
          </Button>
        </div>
      )}

      {confirmDelete && (
        <ConfirmModal
          message={`Ջնջե՞լ «${group.title}» խումբը։ Այս գործողությունը հնարավոր չէ հետարկել։`}
          confirmLabel="Ջնջել"
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}
