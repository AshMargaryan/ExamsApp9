import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, BellOff, CheckCheck, ClipboardList, GraduationCap, Users } from "lucide-react";
import * as friendsApi from "../../api/friends";
import type { FriendRequest } from "../../api/friends";
import * as notificationsApi from "../../api/notifications";
import type { StudentNotification } from "../../api/notifications";
import * as parentsApi from "../../api/parents";
import type { ParentChildRequest } from "../../api/parents";
import { useNotificationSocket } from "../../hooks/useNotificationSocket";
import * as teachingApi from "../../api/teaching";
import type { Assignment, TeacherStudentConnection } from "../../api/teaching";
import { useAuth } from "../../auth/AuthContext";
import { useAssignmentNotifications } from "../../hooks/useAssignmentNotifications";
import { assignmentDisplayTitle, assignmentTargetLabel } from "../../lib/assignmentLabels";
import { Button } from "../ui/Button";
import { ErrorState } from "../ui/ErrorState";
import { SkeletonRows } from "../ui/Skeleton";
import { cn } from "../../lib/cn";
import { NOTIFICATION_META, TONE_CLASS, stripLeadingEmoji } from "./notificationMeta";

/*
  THE NOTIFICATION PANEL

  What was wrong:

  1. **Three ways to say "nothing here", at once.** The panel rendered an
     "Ուսուցիչների հրավերներ" heading and an "Առաջադրանքներ" heading
     *unconditionally*, each followed by its own "…չկան։" line, on top of the
     panel-level "Նոր ծանուցումներ չկան։". An empty bell therefore showed
     three separate empty messages under two headings for sections that did
     not exist. A busy bell showed real notifications and then two headings
     announcing there was nothing else.

  2. **Every emoji rendered twice.** See notificationMeta.tsx — the backend
     embeds one in the message and the frontend prepended its own.

  3. **Read notifications were thrown away.** The list filtered to unread and
     rendered only those, so tapping a notification made it vanish for good.
     A student interrupted mid-glance had no way back to what they saw. The
     read ones now stay, below a divider, dimmed.

  4. **It was not a dialog.** A plain div with a mousedown-outside listener:
     no Escape, no focus move, no focus return, no aria-expanded, no role.
     Keyboard users could open it and then tab straight through it into the
     page behind.

  5. **Any failing request meant a permanent "Բեռնվում է..."** — four
     unguarded `.then(setX)` calls, with `loading` derived from two of them
     still being null.

  The panel is now two groups, each rendered only when it has contents:
  what needs an answer, and what is news.
*/

function displayName(u: { username: string; first_name: string; last_name: string }) {
  const full = [u.first_name, u.last_name].filter(Boolean).join(" ");
  return full || u.username;
}

function assignmentNotificationText(a: Assignment, isStudent: boolean): string {
  if (isStudent) {
    if (a.status === "in_progress" && a.teacher_feedback) return "Ուսուցիչը հետ է ուղարկել առաջադրանքը";
    if (a.status === "completed") return "Ուսուցիչը հաստատել է առաջադրանքը";
    return "Նոր առաջադրանք";
  }
  return "Աշակերտն ուղարկել է առաջադրանք ստուգման";
}

/** A group heading inside the panel. Only ever rendered with contents
 *  beneath it — an empty section used to announce its own emptiness. */
function PanelSection({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Users;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="flex items-center gap-[var(--space-2)] border-b border-border bg-surface-muted px-[var(--space-4)] py-[var(--space-2)] text-[length:var(--text-xs)] font-semibold tracking-[var(--tracking-wide)] text-text-muted">
        <Icon size={13} strokeWidth={2} aria-hidden="true" />
        {title}
      </h3>
      {children}
    </section>
  );
}

/** A request awaiting the student's answer. Friend, parent and teacher
 *  requests were three near-identical 30-line blocks; they are one now. */
function RequestRow({
  person,
  description,
  onAccept,
  onReject,
  onViewProfile,
}: {
  person: { id: number; username: string; first_name: string; last_name: string; avatar?: string | null };
  description: React.ReactNode;
  onAccept: () => void;
  onReject: () => void;
  onViewProfile: () => void;
}) {
  return (
    <div className="flex items-start gap-[var(--space-3)] border-b border-border p-[var(--space-3)] last:border-0">
      <button
        type="button"
        onClick={onViewProfile}
        aria-label={`Տեսնել ${displayName(person)}-ի պրոֆիլը`}
        className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[var(--radius-full)] border border-border bg-surface-muted text-[length:var(--text-sm)] font-semibold text-text-muted transition-colors hover:border-primary"
      >
        {person.avatar ? (
          <img src={person.avatar} alt="" className="h-full w-full object-cover" />
        ) : (
          (person.first_name || person.username).slice(0, 1).toUpperCase()
        )}
      </button>

      <div className="min-w-0 flex-1">
        {/* Not truncated: "X wants to be your parent" is the whole decision,
            and clipping it to one line is how you end up approving something
            you did not read. */}
        <p className="text-[length:var(--text-sm)] leading-[var(--leading-body)] text-text">{description}</p>
        <p className="text-[length:var(--text-xs)] text-text-muted">@{person.username}</p>
        <div className="mt-[var(--space-2)] flex flex-wrap gap-[var(--space-2)]">
          <Button variant="secondary" size="sm" onClick={onAccept}>
            Ընդունել
          </Button>
          <Button variant="ghost" size="sm" onClick={onReject}>
            Մերժել
          </Button>
        </div>
      </div>
    </div>
  );
}

function NotificationRow({
  notification,
  onClick,
}: {
  notification: StudentNotification;
  onClick: () => void;
}) {
  const meta = NOTIFICATION_META[notification.notification_type];
  const Icon = meta?.Icon ?? Bell;
  return (
    <Link
      to={notification.link || "/rankings"}
      onClick={onClick}
      className={cn(
        "flex items-start gap-[var(--space-3)] border-b border-border p-[var(--space-3)] last:border-0",
        "transition-colors hover:bg-surface-muted",
        notification.is_read && "opacity-60",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-full)]",
          TONE_CLASS[meta?.tone ?? "neutral"],
        )}
      >
        <Icon size={15} strokeWidth={2} />
      </span>
      <span className="min-w-0 flex-1 text-[length:var(--text-sm)] leading-[var(--leading-body)] text-text">
        {stripLeadingEmoji(notification.message)}
      </span>
      {!notification.is_read && (
        <>
          <span aria-hidden="true" className="mt-[6px] h-2 w-2 shrink-0 rounded-[var(--radius-full)] bg-primary" />
          <span className="sr-only">Չկարդացված</span>
        </>
      )}
    </Link>
  );
}

export function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [incomingFriends, setIncomingFriends] = useState<FriendRequest[] | null>(null);
  const [incomingParents, setIncomingParents] = useState<ParentChildRequest[] | null>(null);
  const [teachingInvitations, setTeachingInvitations] = useState<TeacherStudentConnection[] | null>(null);
  const [studentNotifications, setStudentNotifications] = useState<StudentNotification[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  /*
    Where the panel goes.

    Anchoring it to the trigger's right edge (`absolute right-0`) is correct
    on desktop and wrong on a phone: in the mobile top bar the bell sits at
    x≈222 of a 375px viewport, so a 345px panel hanging off its right edge
    starts at **-89px** — eighty-nine pixels of every notification rendered
    off the left of the screen, unreachable, with no horizontal scroll.

    Below `sm` it is therefore pinned to the viewport instead, with its top
    measured from the trigger so it works under whichever header it is in
    rather than depending on a hardcoded header height.
  */
  const [narrowTop, setNarrowTop] = useState<number | null>(null);

  useEffect(() => {
    if (!open) {
      setNarrowTop(null);
      return;
    }
    function place() {
      const narrow = window.matchMedia("(max-width: 639px)").matches;
      const rect = triggerRef.current?.getBoundingClientRect();
      setNarrowTop(narrow && rect ? rect.bottom + 8 : null);
    }
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [open]);

  const isStudent = user?.role === "student";
  const assignmentNotifications = useAssignmentNotifications();

  function viewProfile(id: number) {
    setOpen(false);
    navigate(`/profile/${id}`);
  }

  const loadIncoming = useCallback(() => {
    // allSettled, not four bare .then()s: one failing source used to leave
    // the whole panel on "Բեռնվում է..." with no way back.
    Promise.allSettled([
      friendsApi.fetchIncomingRequests(),
      parentsApi.fetchIncomingChildRequests(),
      notificationsApi.listNotifications(),
      isStudent ? teachingApi.fetchInvitations() : Promise.resolve([]),
    ]).then(([friends, parents, notes, invitations]) => {
      if (friends.status === "fulfilled") setIncomingFriends(friends.value);
      if (parents.status === "fulfilled") setIncomingParents(parents.value);
      if (notes.status === "fulfilled") setStudentNotifications(notes.value);
      if (invitations.status === "fulfilled") setTeachingInvitations(invitations.value);
      setLoadFailed([friends, parents, notes, invitations].every((r) => r.status === "rejected"));
    });
  }, [isStudent]);

  useEffect(() => {
    loadIncoming();
    // Polling pauses while the tab is hidden. Four requests every thirty
    // seconds, forever, on every page, is a lot to spend on a background tab
    // — and the WebSocket below delivers anything that lands meanwhile.
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") loadIncoming();
    }, 30000);
    function onVisible() {
      if (document.visibilityState === "visible") loadIncoming();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [loadIncoming]);

  useNotificationSocket(loadIncoming);

  // Dismiss on outside click, on Escape, and return focus to the bell so a
  // keyboard user is not dumped at the top of the document.
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKey);
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

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

  function handleNotificationClick(n: StudentNotification) {
    if (!n.is_read) {
      setStudentNotifications((prev) => prev?.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)) ?? prev);
      notificationsApi.markNotificationRead(n.id);
    }
    setOpen(false);
  }

  async function handleMarkAllRead() {
    setStudentNotifications((prev) => prev?.map((n) => ({ ...n, is_read: true })) ?? prev);
    await notificationsApi.markAllNotificationsRead();
    loadIncoming();
  }

  const unreadNotifications = studentNotifications?.filter((n) => !n.is_read) ?? [];
  const readNotifications = studentNotifications?.filter((n) => n.is_read) ?? [];

  const requests =
    (incomingFriends?.length ?? 0) + (incomingParents?.length ?? 0) + (teachingInvitations?.length ?? 0);
  const count = requests + (assignmentNotifications?.length ?? 0) + unreadNotifications.length;

  const loading = incomingFriends === null && incomingParents === null && studentNotifications === null;
  const hasNews = unreadNotifications.length > 0 || (assignmentNotifications?.length ?? 0) > 0;
  const isEmpty = !loading && !loadFailed && count === 0 && readNotifications.length === 0;

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={count > 0 ? `Ծանուցումներ, ${count} նոր` : "Ծանուցումներ"}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        className={cn(
          "tap-target flex h-[34px] w-[34px] items-center justify-center rounded-[var(--radius-full)] border",
          "transition-colors duration-[var(--motion-fast)]",
          open ? "border-primary bg-primary-bg text-primary" : "border-border bg-surface text-text-muted hover:border-primary hover:text-text",
        )}
      >
        <Bell size={17} strokeWidth={1.75} />
        {count > 0 && (
          <span
            aria-hidden="true"
            className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-[var(--radius-full)] bg-incorrect px-1 text-[length:var(--text-xs)] font-semibold tabular-nums text-white"
          >
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div
          id={panelId}
          ref={panelRef}
          role="dialog"
          aria-label="Ծանուցումներ"
          tabIndex={-1}
          style={narrowTop !== null ? { top: narrowTop } : undefined}
          className={cn(
            "z-50 max-h-[min(32rem,70vh)] overflow-y-auto rounded-[var(--radius)] border border-border",
            "bg-surface shadow-[var(--shadow-lg)] outline-none",
            narrowTop !== null
              ? "fixed left-[var(--space-2)] right-[var(--space-2)] w-auto"
              : "absolute right-0 mt-2 w-[min(92vw,24rem)]",
          )}
        >
          <div className="sticky top-0 z-10 flex items-center justify-between gap-[var(--space-3)] border-b border-border bg-surface px-[var(--space-4)] py-[var(--space-3)]">
            <h2 className="text-[length:var(--text-sm)] font-semibold text-text">Ծանուցումներ</h2>
            {unreadNotifications.length > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="flex items-center gap-[var(--space-1)] rounded-[var(--radius-md)] text-[length:var(--text-xs)] font-medium text-primary transition-colors hover:underline"
              >
                <CheckCheck size={13} strokeWidth={2} aria-hidden="true" />
                Նշել բոլորը կարդացված
              </button>
            )}
          </div>

          {loading && (
            <div className="p-[var(--space-4)]">
              <SkeletonRows count={3} />
            </div>
          )}

          {loadFailed && !loading && (
            <div className="p-[var(--space-4)]">
              <ErrorState size="sm" title="Չհաջողվեց բեռնել ծանուցումները։" onRetry={loadIncoming} />
            </div>
          )}

          {isEmpty && (
            <div className="flex flex-col items-center gap-[var(--space-2)] px-[var(--space-4)] py-[var(--space-8)] text-center">
              <BellOff size={22} strokeWidth={1.75} className="text-text-muted" aria-hidden="true" />
              <p className="text-[length:var(--text-sm)] font-medium text-text">Ամեն ինչ ընթերցված է</p>
              <p className="text-[length:var(--text-xs)] text-text-muted">
                Նոր ծանուցումները կհայտնվեն այստեղ։
              </p>
            </div>
          )}

          {/* ── Needs an answer ── */}
          {requests > 0 && (
            <PanelSection icon={Users} title="Քո պատասխանն է սպասվում">
              {incomingParents?.map((r) => (
                <RequestRow
                  key={`parent-${r.id}`}
                  person={r.parent}
                  description={
                    <>
                      <span className="font-medium">{displayName(r.parent)}</span> ցանկանում է լինել քո ծնողը
                    </>
                  }
                  onAccept={() => handleRespondParent(r.id, "accept")}
                  onReject={() => handleRespondParent(r.id, "reject")}
                  onViewProfile={() => viewProfile(r.parent.id)}
                />
              ))}
              {incomingFriends?.map((r) => (
                <RequestRow
                  key={`friend-${r.id}`}
                  person={r.sender}
                  description={
                    <>
                      <span className="font-medium">{displayName(r.sender)}</span>-ից ընկերության հարցում
                    </>
                  }
                  onAccept={() => handleRespondFriend(r.id, "accept")}
                  onReject={() => handleRespondFriend(r.id, "reject")}
                  onViewProfile={() => viewProfile(r.sender.id)}
                />
              ))}
              {teachingInvitations?.map((inv) => (
                <RequestRow
                  key={`teaching-${inv.id}`}
                  person={inv.teacher}
                  description={
                    <>
                      <span className="font-medium">{displayName(inv.teacher)}</span>-ից ուսուցչի հրավեր
                    </>
                  }
                  onAccept={() => handleRespondInvitation(inv.id, "accept")}
                  onReject={() => handleRespondInvitation(inv.id, "decline")}
                  onViewProfile={() => viewProfile(inv.teacher.id)}
                />
              ))}
            </PanelSection>
          )}

          {/* ── News ── */}
          {hasNews && (
            <PanelSection icon={Bell} title="Նորություններ">
              {unreadNotifications.map((n) => (
                <NotificationRow key={n.id} notification={n} onClick={() => handleNotificationClick(n)} />
              ))}
              {assignmentNotifications?.map((a) => (
                <Link
                  key={`assignment-${a.id}`}
                  to={isStudent ? "/student-dashboard" : `/assignments/${a.id}`}
                  onClick={() => handleAssignmentClick(a.id)}
                  className="flex items-start gap-[var(--space-3)] border-b border-border p-[var(--space-3)] transition-colors last:border-0 hover:bg-surface-muted"
                >
                  <span
                    aria-hidden="true"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-full)] bg-primary-bg text-primary"
                  >
                    {isStudent ? (
                      <ClipboardList size={15} strokeWidth={2} />
                    ) : (
                      <GraduationCap size={15} strokeWidth={2} />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[length:var(--text-sm)] text-text">
                      {assignmentNotificationText(a, isStudent)}
                    </span>
                    <span className="block truncate text-[length:var(--text-xs)] text-text-muted">
                      {assignmentDisplayTitle(a)} · {assignmentTargetLabel(a)}
                    </span>
                  </span>
                </Link>
              ))}
            </PanelSection>
          )}

          {/* ── Already read ──
              Kept rather than discarded: the old panel filtered read
              notifications out entirely, so a glance at the bell destroyed
              the thing you glanced at. */}
          {readNotifications.length > 0 && (
            <PanelSection icon={CheckCheck} title="Կարդացված">
              {readNotifications.slice(0, 10).map((n) => (
                <NotificationRow key={n.id} notification={n} onClick={() => handleNotificationClick(n)} />
              ))}
            </PanelSection>
          )}
        </div>
      )}
    </div>
  );
}
