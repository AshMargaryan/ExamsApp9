import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import * as friendsApi from "../../api/friends";
import type { FriendRequest } from "../../api/friends";
import * as notificationsApi from "../../api/notifications";
import type { StudentNotification, StudentNotificationType } from "../../api/notifications";
import * as parentsApi from "../../api/parents";
import type { ParentChildRequest } from "../../api/parents";
import { useNotificationSocket } from "../../hooks/useNotificationSocket";
import * as teachingApi from "../../api/teaching";
import type { Assignment, TeacherStudentConnection } from "../../api/teaching";
import { useAuth } from "../../auth/AuthContext";
import { useAssignmentNotifications } from "../../hooks/useAssignmentNotifications";
import { assignmentDisplayTitle, assignmentTargetLabel } from "../../lib/assignmentLabels";
import { PublicProfileModal } from "../profile/PublicProfileModal";

function displayName(u: { username: string; first_name: string; last_name: string }) {
  const full = [u.first_name, u.last_name].filter(Boolean).join(" ");
  return full || u.username;
}

const STUDENT_NOTIFICATION_ICONS: Record<StudentNotificationType, string> = {
  rank_up: "🔥",
  overtaken: "⚠️",
  season_ending: "⏳",
  season_result: "🏆",
  challenge_received: "⚔️",
  challenge_result: "🎮",
};

function assignmentNotificationText(a: Assignment, isStudent: boolean): string {
  if (isStudent) {
    if (a.status === "in_progress" && a.teacher_feedback) return "Ուսուցիչը հետ է ուղարկել առաջադրանքը";
    if (a.status === "completed") return "Ուսուցիչը հաստատել է առաջադրանքը";
    return "Նոր առաջադրանք";
  }
  return "Աշակերտն ուղարկել է առաջադրանք ստուգման";
}

export function NotificationBell() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [incomingFriends, setIncomingFriends] = useState<FriendRequest[] | null>(null);
  const [incomingParents, setIncomingParents] = useState<ParentChildRequest[] | null>(null);
  const [teachingInvitations, setTeachingInvitations] = useState<TeacherStudentConnection[] | null>(null);
  const [studentNotifications, setStudentNotifications] = useState<StudentNotification[] | null>(null);
  const [viewingUserId, setViewingUserId] = useState<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const isStudent = user?.role === "student";
  const assignmentNotifications = useAssignmentNotifications();

  function loadIncoming() {
    friendsApi.fetchIncomingRequests().then(setIncomingFriends);
    parentsApi.fetchIncomingChildRequests().then(setIncomingParents);
    notificationsApi.listNotifications().then(setStudentNotifications);
    // Only a student has invitations waiting on *their* response — a
    // teacher's own pending invitations are outgoing, not actionable here.
    if (isStudent) teachingApi.fetchInvitations().then(setTeachingInvitations);
  }

  useEffect(() => {
    loadIncoming();
    const interval = setInterval(loadIncoming, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStudent]);

  // Real-time push via WebSocket — the 30s poll above stays as a fallback
  // for whenever the socket is momentarily disconnected/reconnecting.
  useNotificationSocket(loadIncoming);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleRespondFriend(requestId: number, action: "accept" | "reject") {
    await friendsApi.respondToRequest(requestId, action);
    loadIncoming();
  }

  async function handleRespondParent(requestId: number, action: "accept" | "reject") {
    await parentsApi.respondToChildRequest(requestId, action);
    loadIncoming();
  }

  async function handleRespondInvitation(id: number, action: "accept" | "decline") {
    await teachingApi.respondToInvitation(id, action);
    loadIncoming();
  }

  async function handleAssignmentClick(id: number) {
    await teachingApi.markAssignmentSeen(id);
    setOpen(false);
  }

  async function handleStudentNotificationClick(n: StudentNotification) {
    if (!n.is_read) {
      setStudentNotifications((prev) => prev?.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)) ?? prev);
      notificationsApi.markNotificationRead(n.id);
    }
    setOpen(false);
  }

  const unreadStudentNotifications = studentNotifications?.filter((n) => !n.is_read) ?? [];

  const count =
    (incomingFriends?.length ?? 0) +
    (incomingParents?.length ?? 0) +
    (teachingInvitations?.length ?? 0) +
    (assignmentNotifications?.length ?? 0) +
    unreadStudentNotifications.length;
  const loading = incomingFriends === null || incomingParents === null;
  const isEmpty = !loading && count === 0;

  return (
    <div ref={wrapRef} className="fixed right-4 top-4 z-40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Ծանուցումներ"
        title="Ծանուցումներ"
        className="relative flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-xl shadow-lg transition-colors hover:border-primary"
      >
        🔔
        {count > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-incorrect px-1 text-xs font-semibold text-white">
            {count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 max-h-96 w-[min(92vw,22rem)] overflow-y-auto rounded-[var(--radius)] border border-border bg-surface shadow-xl">
          <div className="border-b border-border px-4 py-3">
            <span className="text-sm font-medium text-text">Ծանուցումներ</span>
          </div>

          {loading && <p className="p-4 text-sm text-text-muted">Բեռնվում է...</p>}
          {isEmpty && <p className="p-4 text-sm text-text-muted">Նոր ծանուցումներ չկան։</p>}

          {unreadStudentNotifications.map((n) => (
            <Link
              key={`student-notification-${n.id}`}
              to={n.link || "/rankings"}
              onClick={() => handleStudentNotificationClick(n)}
              className="flex items-start gap-3 border-b border-border p-3 transition-colors last:border-0 hover:bg-surface-muted"
            >
              <span className="text-lg leading-none">{STUDENT_NOTIFICATION_ICONS[n.notification_type]}</span>
              <p className="min-w-0 flex-1 text-sm text-text">{n.message}</p>
            </Link>
          ))}

          {incomingParents?.map((r) => (
            <div key={`parent-${r.id}`} className="flex items-center gap-3 border-b border-border p-3 last:border-0">
              <button
                type="button"
                onClick={() => setViewingUserId(r.parent.id)}
                title="Տեսնել պրոֆիլը"
                className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-muted text-sm font-semibold text-text-muted transition-colors hover:border-primary"
              >
                {r.parent.avatar ? (
                  <img src={r.parent.avatar} alt={r.parent.username} className="h-full w-full object-cover" />
                ) : (
                  (r.parent.first_name || r.parent.username).slice(0, 1).toUpperCase()
                )}
              </button>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-text">
                  👨‍👩‍👧 <span className="font-medium">{displayName(r.parent)}</span> ցանկանում է լինել ձեր ծնողը
                </p>
                <p className="text-xs text-text-muted">@{r.parent.username}</p>
                <div className="mt-1.5 flex gap-3">
                  <button
                    type="button"
                    onClick={() => handleRespondParent(r.id, "accept")}
                    className="text-sm text-primary hover:underline"
                  >
                    Ընդունել
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRespondParent(r.id, "reject")}
                    className="text-sm text-text-muted hover:underline"
                  >
                    Մերժել
                  </button>
                </div>
              </div>
            </div>
          ))}

          {incomingFriends?.map((r) => (
            <div key={`friend-${r.id}`} className="flex items-center gap-3 border-b border-border p-3 last:border-0">
              <button
                type="button"
                onClick={() => setViewingUserId(r.sender.id)}
                title="Տեսնել պրոֆիլը"
                className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-muted text-sm font-semibold text-text-muted transition-colors hover:border-primary"
              >
                {r.sender.avatar ? (
                  <img src={r.sender.avatar} alt={r.sender.username} className="h-full w-full object-cover" />
                ) : (
                  (r.sender.first_name || r.sender.username).slice(0, 1).toUpperCase()
                )}
              </button>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-text">
                  <span className="font-medium">{displayName(r.sender)}</span>-ից ընկերության հարցում
                </p>
                <p className="text-xs text-text-muted">@{r.sender.username}</p>
                <div className="mt-1.5 flex gap-3">
                  <button
                    type="button"
                    onClick={() => handleRespondFriend(r.id, "accept")}
                    className="text-sm text-primary hover:underline"
                  >
                    Ընդունել
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRespondFriend(r.id, "reject")}
                    className="text-sm text-text-muted hover:underline"
                  >
                    Մերժել
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewingUserId(r.sender.id)}
                    className="text-sm text-text-muted hover:underline"
                  >
                    Պրոֆիլ
                  </button>
                </div>
              </div>
            </div>
          ))}

          {isStudent && (
            <>
              <div className="border-b border-t border-border px-4 py-3">
                <span className="text-sm font-medium text-text">Ուսուցիչների հրավերներ</span>
              </div>
              {teachingInvitations === null && <p className="p-4 text-sm text-text-muted">Բեռնվում է...</p>}
              {teachingInvitations?.length === 0 && (
                <p className="p-4 text-sm text-text-muted">Նոր հրավերներ չկան։</p>
              )}
              {teachingInvitations?.map((inv) => (
                <div key={inv.id} className="flex items-center gap-3 border-b border-border p-3 last:border-0">
                  <button
                    type="button"
                    onClick={() => setViewingUserId(inv.teacher.id)}
                    title="Տեսնել պրոֆիլը"
                    className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-muted text-sm font-semibold text-text-muted transition-colors hover:border-primary"
                  >
                    {inv.teacher.avatar ? (
                      <img
                        src={inv.teacher.avatar}
                        alt={inv.teacher.username}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      (inv.teacher.first_name || inv.teacher.username).slice(0, 1).toUpperCase()
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-text">
                      <span className="font-medium">{displayName(inv.teacher)}</span>-ից ուսուցչի հրավեր
                    </p>
                    <p className="text-xs text-text-muted">@{inv.teacher.username}</p>
                    <div className="mt-1.5 flex gap-3">
                      <button
                        type="button"
                        onClick={() => handleRespondInvitation(inv.id, "accept")}
                        className="text-sm text-primary hover:underline"
                      >
                        Ընդունել
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRespondInvitation(inv.id, "decline")}
                        className="text-sm text-text-muted hover:underline"
                      >
                        Մերժել
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewingUserId(inv.teacher.id)}
                        className="text-sm text-text-muted hover:underline"
                      >
                        Պրոֆիլ
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}

          <div className="border-b border-t border-border px-4 py-3">
            <span className="text-sm font-medium text-text">Առաջադրանքներ</span>
          </div>
          {assignmentNotifications === null && <p className="p-4 text-sm text-text-muted">Բեռնվում է...</p>}
          {assignmentNotifications?.length === 0 && (
            <p className="p-4 text-sm text-text-muted">Նոր առաջադրանքային ծանուցումներ չկան։</p>
          )}
          {assignmentNotifications?.map((a) => (
            <Link
              key={a.id}
              to={isStudent ? "/student-dashboard" : `/assignments/${a.id}`}
              onClick={() => handleAssignmentClick(a.id)}
              className="block border-b border-border p-3 transition-colors last:border-0 hover:bg-surface-muted"
            >
              <p className="truncate text-sm text-text">{assignmentNotificationText(a, isStudent)}</p>
              <p className="truncate text-xs text-text-muted">
                {assignmentDisplayTitle(a)} · {assignmentTargetLabel(a)}
              </p>
            </Link>
          ))}
        </div>
      )}

      {viewingUserId !== null && (
        <div onClick={(e) => e.stopPropagation()}>
          <PublicProfileModal userId={viewingUserId} onClose={() => setViewingUserId(null)} />
        </div>
      )}
    </div>
  );
}
