import { useEffect, useState } from "react";
import { BookOpen, CalendarDays, Clock, Flame, Plus, Target } from "lucide-react";
import { API_ORIGIN } from "../api/client";
import * as parentsApi from "../api/parents";
import type {
  ChildDashboard, ChildSummary, GoalType, LearningGoal, Notification,
} from "../api/parents";
import { GOAL_TYPE_LABELS } from "../api/parents";
import { getHierarchy } from "../api/practice";
import type { SubjectNode } from "../api/practice";
import { RARITY_COLORS, RARITY_LABELS } from "../lib/achievementRarity";
import { ActivityHeatmap } from "../components/ActivityHeatmap";
import { Chart } from "../components/ui/Chart";
import { ProgressRing } from "../components/dashboard/ProgressRing";
import { SkillColumn } from "../components/dashboard/SkillColumn";
import { SkillsMasteryDonut } from "../components/dashboard/SkillsMasteryDonut";
import { SubjectRadarChart } from "../components/dashboard/SubjectRadarChart";
import { useAuth } from "../auth/AuthContext";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { LinkButton } from "../components/ui/LinkButton";
import { Skeleton, SkeletonRows } from "../components/ui/Skeleton";
import { Tabs } from "../components/ui/Tabs";

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
    <Card className="flex flex-col gap-3 border-dashed bg-surface-muted">
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

      {searching && <SkeletonRows count={2} trailing={false} />}

      {results !== null && !searching && (
        <div className="flex flex-col gap-2">
          {results.length === 0 && <EmptyState size="sm" title="Ոչինչ չի գտնվել" />}
          {results.map((r) => {
            const label = RELATIONSHIP_LABEL(r.relationship_status);
            const name = [r.first_name, r.last_name].filter(Boolean).join(" ") || r.username;
            return (
              <div key={r.id} className="flex items-center justify-between rounded-md border border-border bg-surface p-3">
                <div className="flex items-center gap-2">
                  <Avatar src={r.avatar} name={name} size="sm" />
                  <div>
                    <p className="text-sm text-text">{name}</p>
                    <p className="text-xs text-text-muted">@{r.username}</p>
                  </div>
                </div>
                {label ? (
                  <span className="text-xs text-text-muted">{label}</span>
                ) : (
                  <Button size="sm" onClick={() => handleSend(r.id)} loading={sendingId === r.id}>
                    Ուղարկել հարցում
                  </Button>
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
                <Button variant="ghost" size="sm" onClick={() => handleCancel(req.id)} className="h-7 px-2 text-xs">
                  Չեղարկել
                </Button>
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
    </Card>
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
      <Button type="submit" size="sm" loading={busy}>
        Ավելացնել նպատակ
      </Button>
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
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-40 w-full rounded-[calc(var(--radius)*1.15)]" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  const { overview, subject_performance, skills_mastery, weekly_progress, activity_calendar, recent_achievements, predicted_exam_score, best_study_hour } = dashboard;

  return (
    <div className="flex flex-col gap-6">
      {/* Hero */}
      <section
        className="rounded-[calc(var(--radius)*1.15)] p-6 sm:p-7"
        style={{ background: "var(--gradient-hero)", boxShadow: "0 12px 30px rgba(0,0,0,0.18)" }}
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar
              src={overview.avatar ? (overview.avatar.startsWith("/") ? `${API_ORIGIN}${overview.avatar}` : overview.avatar) : null}
              name={[overview.first_name, overview.last_name].filter(Boolean).join(" ") || overview.username}
              size="lg"
              className="border-2 border-white/40 bg-white/10"
            />
            <div>
              <p className="text-lg font-semibold text-white">
                {[overview.first_name, overview.last_name].filter(Boolean).join(" ") || overview.username}
              </p>
              <p className="text-sm text-white/80">
                {[overview.grade ? `${overview.grade}-րդ դասարան` : null, overview.school].filter(Boolean).join(" · ")}
              </p>
              <p className="text-xs text-white/70">
                Վերջին ակտիվություն՝ {overview.last_active_date ?? "դեռ չկա"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="flex items-center justify-center gap-1.5 text-2xl font-semibold text-white">
                <Flame size={20} strokeWidth={1.75} /> {overview.current_streak}
              </p>
              <p className="text-xs text-white/70">օրյա շարք</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-semibold text-white">{overview.level}</p>
              <p className="text-xs text-white/70">{overview.total_xp} XP</p>
            </div>
            {predicted_exam_score !== null && (
              <div className="flex flex-col items-center gap-1">
                <ProgressRing value={predicted_exam_score} max={100} size={56} color="#fff" />
                <p className="text-[10px] text-white/70">կանխ. միավոր</p>
              </div>
            )}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-white/20 pt-4 text-sm">
          {best_study_hour !== null && (
            <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-white/80">
              <Clock size={14} strokeWidth={1.75} /> Լավագույն ժամ՝ <strong className="text-white">{best_study_hour}:00</strong>
            </span>
          )}
          <span className="rounded-full bg-white/10 px-3 py-1 text-white/80">
            <Flame className="inline" size={14} strokeWidth={1.75} /> Ռեկորդային շարք՝ <strong className="text-white">{overview.longest_streak}</strong> օր
          </span>
          <button onClick={handleUnlink} className="ml-auto text-xs text-white/70 hover:text-white">
            Հեռացնել կապը
          </button>
        </div>
      </section>

      {/* Subject performance */}
      <Card as="section">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-text">
          <BookOpen size={18} strokeWidth={1.75} /> Առարկայական առաջընթաց
        </h2>
        {subject_performance.length === 0 ? (
          <EmptyState size="sm" title="Տվյալներ դեռ չկան" />
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <SubjectRadarChart subjects={subject_performance} />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {subject_performance.map((s) => (
                <div key={s.subject_id} className="rounded-[var(--radius)] border border-border bg-bg p-3">
                  <p className="text-sm font-medium text-text">{s.subject_name}</p>
                  <p className="mt-0.5 text-xs text-text-muted">
                    {s.avg_score === null ? "Դեռ չսկսված" : `Միջին միավոր՝ ${s.avg_score}%`}
                  </p>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${s.completion_percent}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-text-muted">{s.completion_percent}% ավարտված</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Skills mastery */}
      <Card as="section">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-text">
          <Target size={18} strokeWidth={1.75} /> Հմտությունների յուրացում
        </h2>
        <div className="mb-4">
          <SkillsMasteryDonut
            counts={{
              mastered: skills_mastery.mastered.length,
              practicing: skills_mastery.practicing.length,
              needs_improvement: skills_mastery.needs_improvement.length,
            }}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SkillColumn title="Յուրացված" color="🟢" items={skills_mastery.mastered} />
          <SkillColumn title="Պարապում է" color="🟡" items={skills_mastery.practicing} />
          <SkillColumn title="Կարիք ունի ուշադրության" color="🔴" items={skills_mastery.needs_improvement} />
        </div>
      </Card>

      {/* Weekly progress + activity calendar */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-text">
            <CalendarDays size={18} strokeWidth={1.75} /> Առաջընթաց ըստ շաբաթների
          </h2>
          <Chart
            data={weekly_progress.map((p) => ({
              week: new Date(p.week_start).toLocaleDateString("hy-AM", { day: "numeric", month: "short" }),
              solved: p.solved,
              correct: p.correct,
            }))}
            xKey="week"
            series={[
              { key: "solved", label: "Ընդհանուր", color: "var(--color-border)" },
              { key: "correct", label: "Ճիշտ", color: "var(--color-accent)" },
            ]}
          />
        </Card>
        <Card>
          <h2 className="mb-3 text-lg font-semibold text-text">Ակտիվության օրացույց (30 օր)</h2>
          <ActivityHeatmap
            points={activity_calendar.map((p) => ({ ...p, tooltip: `${p.date}՝ ${p.count} հարց` }))}
            rangeDays={30}
          />
        </Card>
      </section>

      {/* Achievements */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-text">Վերջին նվաճումները</h2>
        {recent_achievements.length === 0 ? (
          <EmptyState tone="positive" size="sm" title="Դեռ նվաճումներ չկան" />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {recent_achievements.map((ua) => (
              <Card key={ua.id} className="text-center">
                <p className="text-2xl">{ua.achievement.icon || "🏆"}</p>
                <p className="mt-1 text-sm font-medium text-text">{ua.achievement.name}</p>
                <p className="mt-1 text-xs font-medium" style={{ color: RARITY_COLORS[ua.achievement.rarity] }}>
                  {RARITY_LABELS[ua.achievement.rarity]}
                </p>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Goals */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-text">Ուսումնական նպատակներ</h2>
        <div className="flex flex-col gap-3">
          {goals?.map((g) => (
            <Card key={g.id} className="flex items-center gap-4">
              <ProgressRing value={g.progress.current} max={g.progress.target} size={48} strokeWidth={5} color="var(--color-accent)" />
              <div className="flex-1">
                <p className="text-sm font-medium text-text">
                  {GOAL_TYPE_LABELS[g.goal_type]}{g.subject_name ? ` · ${g.subject_name}` : ""}
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  {g.progress.current} / {g.progress.target}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => handleDeleteGoal(g.id)} className="h-7 px-2 text-xs">
                Ջնջել
              </Button>
            </Card>
          ))}
          {goals?.length === 0 && <EmptyState size="sm" title="Դեռ նպատակներ չկան" />}
          <GoalForm childId={child.id} subjects={subjects} onCreated={handleCreateGoal} />
        </div>
      </section>

      {/* Weekly AI report */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-text">Շաբաթական AI հաշվետվություն</h2>
        <Card>
          {report && <p className="mb-4 whitespace-pre-line text-sm leading-relaxed text-text">{report}</p>}
          {emailSent && <p className="mb-3 text-sm text-correct">Ուղարկվեց ձեր էլ. փոստին։</p>}
          <div className="flex gap-3">
            <Button size="sm" onClick={() => handleGenerateReport(false)} loading={reportBusy}>
              {report ? "Թարմացնել" : "Ստեղծել հաշվետվություն"}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => handleGenerateReport(true)} loading={reportBusy}>
              Ուղարկել իմ էլ. փոստին
            </Button>
          </div>
        </Card>
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
          <Button variant="secondary" size="sm" onClick={handleMarkAllRead}>
            Նշել բոլորը կարդացված
          </Button>
        )}
      </div>
      {notifications.length === 0 ? (
        <EmptyState tone="positive" size="sm" title="Ծանուցումներ դեռ չկան" />
      ) : (
        <div className="flex flex-col gap-2">
          {notifications.slice(0, 10).map((n) => (
            <Card key={n.id} className={`p-3 text-sm ${n.is_read ? "text-text-muted" : "text-text"}`}>
              <span className="font-medium">{n.child_name}</span>: {n.message}
            </Card>
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
          <LinkButton to="/profile">← Պրոֆիլ</LinkButton>
          <h1 className="text-xl font-semibold text-text">Ծնողական վահանակ</h1>
          <Button variant="secondary" size="sm" onClick={logout}>
            Ելք
          </Button>
        </div>

        {children === null && <Skeleton className="mb-6 h-10 w-full" />}

        {children !== null && children.length === 0 && (
          <div className="mb-6">
            <SendRequestCard onRefreshChildren={refreshChildren} />
          </div>
        )}

        {children && children.length > 0 && (
          <>
            <div className="mb-6 flex flex-wrap items-center gap-2">
              <Tabs
                label="Երեխաներ"
                value={String(selectedId)}
                onChange={(v) => setSelectedId(Number(v))}
                items={children.map((c) => ({ value: String(c.id), label: c.first_name || c.username }))}
              />
              <Button variant="ghost" size="sm" iconLeft={<Plus size={16} strokeWidth={1.75} />} onClick={() => setShowInvite((v) => !v)}>
                Ավելացնել
              </Button>
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
