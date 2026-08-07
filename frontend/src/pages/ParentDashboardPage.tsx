import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API_ORIGIN } from "../api/client";
import * as parentsApi from "../api/parents";
import type {
  ChildDashboard, ChildSummary, GoalType, LearningGoal, Notification,
} from "../api/parents";
import { GOAL_TYPE_LABELS } from "../api/parents";
import { getHierarchy } from "../api/practice";
import type { SubjectNode } from "../api/practice";
import { RARITY_COLORS, RARITY_LABELS } from "../lib/achievementRarity";
import { WeeklyProgressChart } from "../components/WeeklyProgressChart";
import { useAuth } from "../auth/AuthContext";

const GOAL_TYPES: GoalType[] = ["lessons_per_week", "xp_per_month", "subject_accuracy"];

function RELATIONSHIP_LABEL(status: parentsApi.ChildRelationshipStatus): string | null {
  if (status === "already_linked") return "Արդեն կապված է";
  if (status === "request_pending") return "Հարցումն ուղարկված է";
  return null;
}

function SendRequestCard({ onRefreshChildren }: { onRefreshChildren: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<parentsApi.ChildSearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [sendingId, setSendingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [outgoing, setOutgoing] = useState<parentsApi.ParentChildRequest[] | null>(null);

  function refreshOutgoing() {
    parentsApi.fetchOutgoingChildRequests().then(setOutgoing);
  }

  useEffect(refreshOutgoing, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      return;
    }
    setSearching(true);
    const handle = setTimeout(() => {
      parentsApi
        .searchChildren(query.trim())
        .then(setResults)
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [query]);

  async function handleSend(childId: number) {
    setSendingId(childId);
    setError(null);
    try {
      await parentsApi.sendChildRequest(childId);
      setResults((prev) =>
        (prev ?? []).map((r) => (r.id === childId ? { ...r, relationship_status: "request_pending" } : r)),
      );
      refreshOutgoing();
    } catch {
      setError("Չհաջողվեց ուղարկել հարցումը։");
    } finally {
      setSendingId(null);
    }
  }

  async function handleCancel(requestId: number) {
    await parentsApi.cancelChildRequest(requestId);
    refreshOutgoing();
  }

  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius)] border border-dashed border-border bg-surface-muted p-5">
      <div>
        <label className="mb-1 block text-sm font-medium text-text">Կապել երեխայի հաշիվը</label>
        <p className="mb-2 text-xs text-text-muted">
          Փնտրեք ձեր երեխայի օգտանունով և ուղարկեք հարցում։ Նա այն կտեսնի իր ծանուցումներում և կընդունի կամ կմերժի։
        </p>
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Երեխայի օգտանունը..."
        className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus:border-primary"
      />

      {error && <p className="text-sm text-incorrect">{error}</p>}

      {searching && <p className="text-sm text-text-muted">Փնտրվում է...</p>}

      {results !== null && !searching && (
        <div className="flex flex-col gap-2">
          {results.length === 0 && <p className="text-sm text-text-muted">Ոչինչ չի գտնվել։</p>}
          {results.map((r) => {
            const label = RELATIONSHIP_LABEL(r.relationship_status);
            return (
              <div key={r.id} className="flex items-center justify-between rounded-md border border-border bg-surface p-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-muted text-xs font-semibold text-text-muted">
                    {r.avatar ? (
                      <img src={r.avatar} alt={r.username} className="h-full w-full object-cover" />
                    ) : (
                      (r.first_name || r.username).slice(0, 1).toUpperCase()
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-text">{[r.first_name, r.last_name].filter(Boolean).join(" ") || r.username}</p>
                    <p className="text-xs text-text-muted">@{r.username}</p>
                  </div>
                </div>
                {label ? (
                  <span className="text-xs text-text-muted">{label}</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSend(r.id)}
                    disabled={sendingId === r.id}
                    className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-contrast transition-colors hover:bg-primary-hover disabled:opacity-60"
                  >
                    {sendingId === r.id ? "..." : "Ուղարկել հարցում"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {outgoing && outgoing.length > 0 && (
        <div className="border-t border-border pt-3">
          <p className="mb-2 text-xs font-medium text-text-muted">Սպասվող հարցումներ</p>
          <div className="flex flex-col gap-2">
            {outgoing.map((req) => (
              <div key={req.id} className="flex items-center justify-between rounded-md border border-border bg-surface p-2.5">
                <span className="text-sm text-text">@{req.child.username}</span>
                <button
                  type="button"
                  onClick={() => handleCancel(req.id)}
                  className="text-xs text-text-muted hover:text-incorrect"
                >
                  Չեղարկել
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onRefreshChildren}
        title="Թարմացնել ցուցակը, եթե երեխան արդեն ընդունել է"
        className="self-start text-xs text-text-muted hover:text-primary"
      >
        ↻ Թարմացնել երեխաների ցուցակը
      </button>
    </div>
  );
}

function ActivityHeatmap({ points }: { points: ChildDashboard["activity_calendar"] }) {
  function levelClass(count: number) {
    if (count === 0) return "bg-surface-muted";
    if (count <= 2) return "bg-primary/30";
    if (count <= 5) return "bg-primary/60";
    return "bg-primary";
  }

  return (
    <div className="flex flex-wrap gap-1">
      {points.map((p) => (
        <div
          key={p.date}
          title={`${p.date}՝ ${p.count} հարց`}
          className={`h-3.5 w-3.5 rounded-sm ${levelClass(p.count)}`}
        />
      ))}
    </div>
  );
}

function SkillColumn({ title, color, items }: { title: string; color: string; items: { name: string; subject_name: string; avg_score: number }[] }) {
  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-4">
      <p className="mb-2 text-sm font-semibold text-text">
        {color} {title} ({items.length})
      </p>
      {items.length === 0 ? (
        <p className="text-xs text-text-muted">Դեռ ոչինչ այս խմբում։</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {items.slice(0, 8).map((item) => (
            <li key={item.name} className="text-xs text-text-muted">
              <span className="text-text">{item.name}</span> · {item.subject_name} · {item.avg_score}%
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function GoalForm({
  childId, subjects, onCreated,
}: {
  childId: number; subjects: SubjectNode[]; onCreated: (g: LearningGoal) => void;
}) {
  const [goalType, setGoalType] = useState<GoalType>("lessons_per_week");
  const [targetValue, setTargetValue] = useState("5");
  const [subjectId, setSubjectId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const goal = await parentsApi.createGoal(childId, {
        goal_type: goalType,
        target_value: Number(targetValue),
        subject: subjectId ? Number(subjectId) : undefined,
      });
      onCreated(goal);
      setTargetValue("5");
    } catch {
      setError("Չհաջողվեց ստեղծել նպատակը։");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 rounded-[var(--radius)] border border-border bg-surface-muted p-4">
      <div>
        <label className="mb-1 block text-xs text-text-muted">Նպատակի տեսակ</label>
        <select
          value={goalType}
          onChange={(e) => setGoalType(e.target.value as GoalType)}
          className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text outline-none focus:border-primary"
        >
          {GOAL_TYPES.map((t) => (
            <option key={t} value={t}>{GOAL_TYPE_LABELS[t]}</option>
          ))}
        </select>
      </div>
      {goalType === "subject_accuracy" && (
        <div>
          <label className="mb-1 block text-xs text-text-muted">Առարկա</label>
          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            required
            className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text outline-none focus:border-primary"
          >
            <option value="">Ընտրեք...</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label className="mb-1 block text-xs text-text-muted">Նպատակային արժեք</label>
        <input
          type="number"
          min={1}
          value={targetValue}
          onChange={(e) => setTargetValue(e.target.value)}
          className="w-24 rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text outline-none focus:border-primary"
        />
      </div>
      <button
        type="submit"
        disabled={busy}
        className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-contrast transition-colors hover:bg-primary-hover disabled:opacity-60"
      >
        {busy ? "..." : "Ավելացնել նպատակ"}
      </button>
      {error && <p className="w-full text-sm text-incorrect">{error}</p>}
    </form>
  );
}

function ChildDashboardView({ child }: { child: ChildSummary }) {
  const [dashboard, setDashboard] = useState<ChildDashboard | null>(null);
  const [goals, setGoals] = useState<LearningGoal[] | null>(null);
  const [subjects, setSubjects] = useState<SubjectNode[]>([]);
  const [report, setReport] = useState<string | null>(null);
  const [reportBusy, setReportBusy] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    setDashboard(null);
    setGoals(null);
    setReport(null);
    parentsApi.getChildDashboard(child.id).then(setDashboard);
    parentsApi.getChildGoals(child.id).then(setGoals);
    getHierarchy().then(setSubjects);
  }, [child.id]);

  async function handleGenerateReport(email: boolean) {
    setReportBusy(true);
    setEmailSent(false);
    try {
      const text = await parentsApi.generateWeeklyReport(child.id, email);
      setReport(text);
      if (email) setEmailSent(true);
    } finally {
      setReportBusy(false);
    }
  }

  async function handleCreateGoal(g: LearningGoal) {
    setGoals((prev) => [g, ...(prev ?? [])]);
  }

  async function handleDeleteGoal(id: number) {
    await parentsApi.deleteGoal(id);
    setGoals((prev) => (prev ?? []).filter((g) => g.id !== id));
  }

  async function handleUnlink() {
    if (!confirm(`Հեռացնե՞լ ${child.first_name || child.username}-ի կապը։`)) return;
    await parentsApi.unlinkChild(child.id);
    window.location.reload();
  }

  if (!dashboard) {
    return <p className="text-text-muted">Բեռնվում է...</p>;
  }

  const { overview, subject_performance, skills_mastery, weekly_progress, activity_calendar, recent_achievements, predicted_exam_score, best_study_hour } = dashboard;

  return (
    <div className="flex flex-col gap-6">
      {/* Overview */}
      <section className="rounded-[var(--radius)] border border-border bg-surface p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-muted text-2xl font-semibold text-text-muted">
              {overview.avatar ? (
                <img
                  src={overview.avatar.startsWith("/") ? `${API_ORIGIN}${overview.avatar}` : overview.avatar}
                  alt={overview.username}
                  className="h-full w-full object-cover"
                />
              ) : (
                (overview.first_name || overview.username).slice(0, 1).toUpperCase()
              )}
            </div>
            <div>
              <p className="text-lg font-semibold text-text">
                {[overview.first_name, overview.last_name].filter(Boolean).join(" ") || overview.username}
              </p>
              <p className="text-sm text-text-muted">
                {[overview.grade ? `${overview.grade}-րդ դասարան` : null, overview.school].filter(Boolean).join(" · ")}
              </p>
              <p className="text-xs text-text-muted">
                Վերջին ակտիվություն՝ {overview.last_active_date ?? "դեռ չկա"}
              </p>
            </div>
          </div>
          <div className="flex gap-6">
            <div className="text-center">
              <p className="text-2xl font-semibold text-text">🔥 {overview.current_streak}</p>
              <p className="text-xs text-text-muted">օրյա շարք</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-semibold text-text">{overview.level}</p>
              <p className="text-xs text-text-muted">{overview.total_xp} XP</p>
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3 border-t border-border pt-4 text-sm">
          {predicted_exam_score !== null && (
            <span className="rounded-full bg-surface-muted px-3 py-1 text-text-muted">
              🎯 Կանխատեսվող միավոր՝ <strong className="text-text">{predicted_exam_score}</strong>
            </span>
          )}
          {best_study_hour !== null && (
            <span className="rounded-full bg-surface-muted px-3 py-1 text-text-muted">
              ⏰ Լավագույն ժամ՝ <strong className="text-text">{best_study_hour}:00</strong>
            </span>
          )}
          <button onClick={handleUnlink} className="ml-auto text-xs text-text-muted hover:text-incorrect">
            Հեռացնել կապը
          </button>
        </div>
      </section>

      {/* Subject performance */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-text">Առարկայական առաջընթաց</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subject_performance.map((s) => (
            <div key={s.subject_id} className="rounded-[var(--radius)] border border-border bg-surface p-4">
              <p className="font-medium text-text">{s.subject_name}</p>
              <p className="mt-1 text-sm text-text-muted">
                {s.avg_score === null ? "Դեռ չսկսված" : `Միջին միավոր՝ ${s.avg_score}%`}
              </p>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${s.completion_percent}%` }} />
              </div>
              <p className="mt-1 text-xs text-text-muted">{s.completion_percent}% ավարտված</p>
            </div>
          ))}
          {subject_performance.length === 0 && <p className="text-text-muted">Տվյալներ դեռ չկան։</p>}
        </div>
      </section>

      {/* Skills mastery */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-text">Հմտությունների յուրացում</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SkillColumn title="Յուրացված" color="🟢" items={skills_mastery.mastered} />
          <SkillColumn title="Պարապում է" color="🟡" items={skills_mastery.practicing} />
          <SkillColumn title="Կարիք ունի ուշադրության" color="🔴" items={skills_mastery.needs_improvement} />
        </div>
      </section>

      {/* Weekly progress + activity calendar */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-[var(--radius)] border border-border bg-surface p-5">
          <h2 className="mb-3 text-lg font-semibold text-text">Առաջընթաց ըստ շաբաթների</h2>
          <WeeklyProgressChart points={weekly_progress} />
        </div>
        <div className="rounded-[var(--radius)] border border-border bg-surface p-5">
          <h2 className="mb-3 text-lg font-semibold text-text">Ակտիվության օրացույց (30 օր)</h2>
          <ActivityHeatmap points={activity_calendar} />
        </div>
      </section>

      {/* Achievements */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-text">Վերջին նվաճումները</h2>
        {recent_achievements.length === 0 ? (
          <p className="text-text-muted">Դեռ նվաճումներ չկան։</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {recent_achievements.map((ua) => (
              <div key={ua.id} className="rounded-[var(--radius)] border border-border bg-surface p-4 text-center">
                <p className="text-2xl">{ua.achievement.icon || "🏆"}</p>
                <p className="mt-1 text-sm font-medium text-text">{ua.achievement.name}</p>
                <p className="mt-1 text-xs font-medium" style={{ color: RARITY_COLORS[ua.achievement.rarity] }}>
                  {RARITY_LABELS[ua.achievement.rarity]}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Goals */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-text">Ուսումնական նպատակներ</h2>
        <div className="flex flex-col gap-3">
          {goals?.map((g) => (
            <div key={g.id} className="flex items-center gap-4 rounded-[var(--radius)] border border-border bg-surface p-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-text">
                  {GOAL_TYPE_LABELS[g.goal_type]}{g.subject_name ? ` · ${g.subject_name}` : ""}
                </p>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${g.progress.percent}%` }} />
                </div>
                <p className="mt-1 text-xs text-text-muted">
                  {g.progress.current} / {g.progress.target}
                </p>
              </div>
              <button onClick={() => handleDeleteGoal(g.id)} className="text-xs text-text-muted hover:text-incorrect">
                Ջնջել
              </button>
            </div>
          ))}
          {goals?.length === 0 && <p className="text-text-muted">Դեռ նպատակներ չկան։</p>}
          <GoalForm childId={child.id} subjects={subjects} onCreated={handleCreateGoal} />
        </div>
      </section>

      {/* Weekly AI report */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-text">Շաբաթական AI հաշվետվություն</h2>
        <div className="rounded-[var(--radius)] border border-border bg-surface p-5">
          {report && <p className="mb-4 whitespace-pre-line text-sm leading-relaxed text-text">{report}</p>}
          {emailSent && <p className="mb-3 text-sm text-correct">Ուղարկվեց ձեր էլ. փոստին։</p>}
          <div className="flex gap-3">
            <button
              onClick={() => handleGenerateReport(false)}
              disabled={reportBusy}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-contrast transition-colors hover:bg-primary-hover disabled:opacity-60"
            >
              {reportBusy ? "..." : report ? "Թարմացնել" : "Ստեղծել հաշվետվություն"}
            </button>
            <button
              onClick={() => handleGenerateReport(true)}
              disabled={reportBusy}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-text transition-colors hover:border-primary disabled:opacity-60"
            >
              Ուղարկել իմ էլ. փոստին
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function NotificationsPanel() {
  const [notifications, setNotifications] = useState<Notification[] | null>(null);

  useEffect(() => {
    parentsApi.getNotifications().then(setNotifications);
  }, []);

  async function handleMarkAllRead() {
    await parentsApi.markNotificationsRead();
    setNotifications((prev) => (prev ?? []).map((n) => ({ ...n, is_read: true })));
  }

  if (!notifications) return null;
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text">
          Ծանուցումներ {unreadCount > 0 ? `(${unreadCount})` : ""}
        </h2>
        {unreadCount > 0 && (
          <button onClick={handleMarkAllRead} className="text-sm text-primary hover:underline">
            Նշել բոլորը կարդացված
          </button>
        )}
      </div>
      {notifications.length === 0 ? (
        <p className="text-text-muted">Ծանուցումներ դեռ չկան։</p>
      ) : (
        <div className="flex flex-col gap-2">
          {notifications.slice(0, 10).map((n) => (
            <div
              key={n.id}
              className={`rounded-[var(--radius)] border border-border bg-surface p-3 text-sm ${n.is_read ? "text-text-muted" : "text-text"}`}
            >
              <span className="font-medium">{n.child_name}</span>: {n.message}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function ParentDashboardPage() {
  const { logout } = useAuth();
  const [children, setChildren] = useState<ChildSummary[] | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showInvite, setShowInvite] = useState(false);

  function refreshChildren() {
    parentsApi.getChildren().then((cs) => {
      setChildren(cs);
      setSelectedId((prev) => prev ?? (cs.length > 0 ? cs[0].id : null));
    });
  }

  useEffect(refreshChildren, []);

  const selected = children?.find((c) => c.id === selectedId) ?? null;

  return (
    <div className="min-h-screen bg-bg px-4 py-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/profile" className="text-sm text-primary hover:underline">
            ← Պրոֆիլ
          </Link>
          <h1 className="text-xl font-semibold text-text">👨‍👩‍👧 Ծնողական վահանակ</h1>
          <button type="button" onClick={logout} className="text-sm text-primary hover:underline">
            Ելք
          </button>
        </div>

        {children === null && <p className="text-text-muted">Բեռնվում է...</p>}

        {children !== null && children.length === 0 && (
          <div className="mb-6">
            <SendRequestCard onRefreshChildren={refreshChildren} />
          </div>
        )}

        {children && children.length > 0 && (
          <>
            <div className="mb-6 flex flex-wrap items-center gap-2">
              {children.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                    selectedId === c.id
                      ? "border-primary bg-surface-muted text-primary"
                      : "border-border text-text-muted hover:border-primary"
                  }`}
                >
                  {c.first_name || c.username}
                </button>
              ))}
              <button
                onClick={() => setShowInvite((v) => !v)}
                className="rounded-full border border-dashed border-border px-4 py-1.5 text-sm text-text-muted hover:border-primary"
              >
                + Ավելացնել
              </button>
            </div>

            {showInvite && (
              <div className="mb-6">
                <SendRequestCard onRefreshChildren={refreshChildren} />
              </div>
            )}

            <NotificationsPanel />

            {selected && <ChildDashboardView key={selected.id} child={selected} />}
          </>
        )}
      </div>
    </div>
  );
}
