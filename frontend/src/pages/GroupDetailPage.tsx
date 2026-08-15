import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  deleteGroup, fetchGroup, joinGroup, leaveGroup, transferLeadership, type GroupDetail,
} from "../api/groups";
import { useAuth } from "../auth/AuthContext";
import { ConfirmModal } from "../components/ConfirmModal";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { SectionHeader } from "../components/ui/SectionHeader";
import { extractErrorMessage, useToast } from "../context/ToastContext";
import { subjectMeta } from "../lib/subjects";
import { LinkButton } from "../components/ui/LinkButton";

const WEEKDAY_LABELS = ["Երկուշաբթի", "Երեքշաբթի", "Չորեքշաբթի", "Հինգշաբթի", "Ուրբաթ", "Շաբաթ", "Կիրակի"];

function formatTime(t: string) {
  return t.slice(0, 5);
}

function displayName(u: { first_name: string; last_name: string; username: string }) {
  return [u.first_name, u.last_name].filter(Boolean).join(" ") || u.username;
}

export function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [transferTarget, setTransferTarget] = useState<number | "">("");

  function load() {
    setGroup(null);
    fetchGroup(Number(id)).then(setGroup);
  }

  useEffect(load, [id]);

  if (!group) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="h-64 animate-pulse rounded-[var(--radius)] border border-border bg-surface" />
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
      showSuccess("Դուք միացաք խմբին։");
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
      showSuccess("Դուք լքեցիք խումբը։");
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

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <LinkButton to="/groups" className="mb-4">← Խմբեր</LinkButton>

      <div className="mb-6">
        {subject && (
          <span className="mb-2 inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-0.5 text-xs font-medium tracking-wide text-text-muted uppercase">
            <span aria-hidden>{subject.icon}</span>
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
        <SectionHeader title="Ժամանակացույց" />
        <p className="text-text">
          {WEEKDAY_LABELS[group.schedule_day]}, {formatTime(group.schedule_start_time)}–
          {formatTime(group.schedule_end_time)}
        </p>
      </Card>

      <Card className="mb-6">
        <SectionHeader title={`Անդամներ (${group.members.length}/${group.max_members})`} />
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
      </Card>

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
            <option value="">Ընտրեք անդամ…</option>
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
