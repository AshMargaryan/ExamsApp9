import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Award,
  Bell,
  BookOpen,
  CalendarDays,
  ChevronDown,
  Clock,
  Flame,
  MoreHorizontal,
  Plus,
  Target,
  Unlink,
} from "lucide-react";
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
import { DataCard } from "../components/ui/DataCard";
import { EmptyState } from "../components/ui/EmptyState";
import { LinkButton } from "../components/ui/LinkButton";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { Dropdown } from "../components/ui/Dropdown";
import { ErrorState } from "../components/ui/ErrorState";
import { Section } from "../components/ui/Section";
import { Skeleton, SkeletonRows } from "../components/ui/Skeleton";
import { Tabs } from "../components/ui/Tabs";
import { useAsyncResource } from "../hooks/useAsyncResource";
import { cn } from "../lib/cn";
import { Field } from "../components/ui/Field";
import { NumberInput } from "../components/ui/NumberInput";
import { SearchField } from "../components/ui/SearchField";
import { Select } from "../components/ui/Select";

/*
  THE PARENT'S VAHANAK

  The child was below the fold, and a machine log was above it. Ten raw
  event lines — "daniel: Ավարտեց «Ծանրության ուժ և մարմնի քաշը» թեման
  (easy մակարդակ), 75.0% արդյունքով" — filled the entire first screen of
  the page whose whole purpose is to answer "how is my child doing".
  Several of them were near-duplicates of each other and two were byte
  identical, because the backend emits one per tier completed.

  A parent opening this page wants the child first. The feed moved below
  the dashboard, is deduplicated on its text, and shows five entries with
  the rest behind a disclosure. The one thing the feed was genuinely good
  for — "is there anything new?" — is now an unread count in the header,
  where it costs one line instead of one screen.

  The other serious problem was that unlinking a child — permanently
  ending a parent/child relationship — was an unstyled text link inside a
  coloured band, behind a native `confirm()` with untranslated OK/Cancel,
  followed by `window.location.reload()`.
*/

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
          Փնտրեք Ձեր երեխայի օգտանունով և ուղարկեք հարցում։ Նա այն կտեսնի իր ծանուցումներում և կընդունի կամ կմերժի։
        </p>
      </div>

      <SearchField
        value={query}
        onChange={setQuery}
        label="Երեխայի օգտանունը"
        placeholder="Երեխայի օգտանունը…"
        className="bg-surface text-[length:var(--text-sm)]"
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
      <Field label="Նպատակի տեսակ" containerClassName="mb-0 min-w-52">
        {(control) => (
          <Select<GoalType>
            id={control.id}
            value={goalType}
            onChange={setGoalType}
            options={GOAL_TYPES.map((t) => ({ value: t, label: GOAL_TYPE_LABELS[t] }))}
          />
        )}
      </Field>
      {goalType === "subject_accuracy" && (
        <Field label="Առարկա" containerClassName="mb-0 min-w-48">
          {(control) => (
            <Select<string>
              id={control.id}
              value={subjectId}
              onChange={setSubjectId}
              placeholder="Ընտրեք…"
              options={subjects.map((s) => ({ value: String(s.id), label: s.name }))}
            />
          )}
        </Field>
      )}
      <Field label="Նպատակային արժեք" containerClassName="mb-0 w-40">
        {(control) => (
          <NumberInput
            id={control.id}
            value={targetValue === "" ? null : Number(targetValue)}
            min={1}
            onChange={(next) => setTargetValue(next == null ? "" : String(next))}
          />
        )}
      </Field>
      <Button type="submit" size="sm" loading={busy}>
        Ավելացնել նպատակ
      </Button>
      {error && <p className="w-full text-sm text-incorrect">{error}</p>}
    </form>
  );
}

function ChildDashboardView({ child, onUnlinked }: { child: ChildSummary; onUnlinked: () => void }) {
  const [goals, setGoals] = useState<LearningGoal[] | null>(null);
  const [subjects, setSubjects] = useState<SubjectNode[]>([]);
  const [report, setReport] = useState<string | null>(null);
  const [reportBusy, setReportBusy] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [confirmUnlink, setConfirmUnlink] = useState(false);
  const [unlinking, setUnlinking] = useState(false);

  const dashboardResource = useAsyncResource<ChildDashboard>(
    useCallback(() => parentsApi.getChildDashboard(child.id), [child.id]),
    [child.id],
  );
  const dashboard = dashboardResource.data;

  useEffect(() => {
    setGoals(null);
    setReport(null);
    parentsApi.getChildGoals(child.id).then(setGoals).catch(() => setGoals([]));
    getHierarchy().then(setSubjects).catch(() => setSubjects([]));
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

  /*
    Unlinking permanently ends a parent/child relationship. It used to be an
    unstyled text link inside the coloured hero band, behind a native
    `confirm()` — a browser dialog with untranslated OK/Cancel buttons, no
    focus trap and no explanation of what is lost — followed by a full
    `window.location.reload()`. It is now behind the child's overflow menu,
    with a real dialog that says what happens, and it refreshes state
    instead of reloading the application.
  */
  async function handleUnlink() {
    setUnlinking(true);
    try {
      await parentsApi.unlinkChild(child.id);
      setConfirmUnlink(false);
      onUnlinked();
    } finally {
      setUnlinking(false);
    }
  }

  if (dashboardResource.error !== null && !dashboardResource.isLoading) {
    return (
      <ErrorState
        title={`Չհաջողվեց բեռնել ${child.first_name || child.username}-ի տվյալները։`}
        onRetry={dashboardResource.retry}
      />
    );
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
        style={{ background: "var(--gradient-brand)", boxShadow: "var(--shadow-lg)" }}
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar
              src={overview.avatar ? (overview.avatar.startsWith("/") ? `${API_ORIGIN}${overview.avatar}` : overview.avatar) : null}
              name={[overview.first_name, overview.last_name].filter(Boolean).join(" ") || overview.username}
              size="lg"
              className="border-2 border-on-brand-line bg-on-brand-fill"
            />
            <div>
              <p className="text-lg font-semibold text-on-brand">
                {[overview.first_name, overview.last_name].filter(Boolean).join(" ") || overview.username}
              </p>
              <p className="text-sm text-on-brand-muted">
                {[overview.grade ? `${overview.grade}-րդ դասարան` : null, overview.school].filter(Boolean).join(" · ")}
              </p>
              <p className="text-xs text-on-brand-muted">
                Վերջին ակտիվություն՝ {overview.last_active_date ?? "դեռ չկա"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="flex items-center justify-center gap-1.5 text-2xl font-semibold text-on-brand">
                <Flame size={20} strokeWidth={1.75} /> {overview.current_streak}
              </p>
              <p className="text-xs text-on-brand-muted">օրյա շարք</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-semibold text-on-brand">{overview.level}</p>
              <p className="text-xs text-on-brand-muted">{overview.total_xp} XP</p>
            </div>
            {predicted_exam_score !== null && (
              <div className="flex flex-col items-center gap-1">
                <ProgressRing value={predicted_exam_score} max={100} size={56} color="var(--color-on-brand)" />
                <p className="text-[10px] text-on-brand-muted">կանխ. միավոր</p>
              </div>
            )}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-on-brand-line pt-4 text-sm">
          {best_study_hour !== null && (
            <span className="flex items-center gap-1.5 rounded-[var(--radius-full)] bg-on-brand-fill px-3 py-1 text-on-brand-muted">
              <Clock size={14} strokeWidth={1.75} /> Լավագույն ժամ՝ <strong className="text-on-brand">{best_study_hour}:00</strong>
            </span>
          )}
          <span className="rounded-[var(--radius-full)] bg-on-brand-fill px-3 py-1 text-on-brand-muted">
            <Flame className="inline" size={14} strokeWidth={1.75} /> Ռեկորդային շարք՝ <strong className="text-on-brand">{overview.longest_streak}</strong> օր
          </span>
          <div className="ml-auto">
            <Dropdown
              align="end"
              renderTrigger={(props) => (
                <button
                  {...props}
                  aria-label="Երեխայի կարգավորումներ"
                  className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] border border-on-brand-line text-on-brand-muted transition-colors hover:bg-on-brand-fill hover:text-on-brand"
                >
                  <MoreHorizontal size={16} strokeWidth={2} />
                </button>
              )}
              items={[
                {
                  key: "unlink",
                  label: "Հեռացնել կապը",
                  tone: "danger",
                  icon: <Unlink size={15} strokeWidth={1.75} />,
                  onSelect: () => setConfirmUnlink(true),
                },
              ]}
            />
          </div>
        </div>
      </section>

      {/* Subject performance */}
      <DataCard icon={BookOpen} title="Առարկայական առաջընթաց" description="Ինչ առարկաներով է աշխատում, և ինչ արդյունքով">
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
      </DataCard>

      {/* Skills mastery */}
      <DataCard icon={Target} title="Հմտությունների յուրացում" description="Որ թեմաներն են արդեն ամուր, և որոնց վրա արժե աշխատել">
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
          <SkillColumn title="Յուրացված" tone="mastered" items={skills_mastery.mastered} />
          <SkillColumn title="Պարապում է" tone="practicing" items={skills_mastery.practicing} />
          <SkillColumn
            title="Կարիք ունի ուշադրության"
            tone="needs_improvement"
            items={skills_mastery.needs_improvement}
          />
        </div>
      </DataCard>

      {/* Weekly progress + activity calendar */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DataCard icon={CalendarDays} title="Առաջընթաց ըստ շաբաթների">
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
        </DataCard>
        <DataCard icon={Flame} title="Ակտիվության օրացույց" description="Վերջին 30 օրը">
          <ActivityHeatmap
            points={activity_calendar.map((p) => ({ ...p, tooltip: `${p.date}՝ ${p.count} հարց` }))}
            rangeDays={30}
          />
        </DataCard>
      </section>

      {/* Achievements */}
      <Section spacing="none" title="Վերջին նվաճումները">
        {recent_achievements.length === 0 ? (
          <EmptyState tone="positive" size="sm" title="Դեռ նվաճումներ չկան" />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {recent_achievements.map((ua) => (
              <Card key={ua.id} className="text-center">
                <p className="flex justify-center text-2xl">
                  {/* The achievement's own icon is content set per achievement;
                      only the *fallback* was a hardcoded emoji. */}
                  {ua.achievement.icon || <Award size={24} strokeWidth={1.75} className="text-text-muted" />}
                </p>
                <p className="mt-1 text-sm font-medium text-text">{ua.achievement.name}</p>
                <p className="mt-1 text-xs font-medium" style={{ color: RARITY_COLORS[ua.achievement.rarity] }}>
                  {RARITY_LABELS[ua.achievement.rarity]}
                </p>
              </Card>
            ))}
          </div>
        )}
      </Section>

      {/* Goals */}
      <Section
        spacing="none"
        title="Ուսումնական նպատակներ"
        description="Ձեր սահմանած նպատակները, և որքան է մնացել դրանց"
      >
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
      </Section>

      {/* Weekly AI report */}
      <Section
        spacing="none"
        title="Շաբաթական AI հաշվետվություն"
        description="Gitus-ի ամփոփումը Ձեր երեխայի շաբաթվա մասին՝ սովորական լեզվով"
      >
        <Card>
          {report && <p className="mb-4 whitespace-pre-line text-sm leading-relaxed text-text">{report}</p>}
          {emailSent && <p className="mb-3 text-sm text-correct">Ուղարկվեց Ձեր էլ. փոստին։</p>}
          {/* flex-wrap: the two Armenian button labels together are 455px
              wide, which pushed the page 80px off a 375px screen. */}
          <div className="flex flex-wrap gap-[var(--space-3)]">
            <Button size="sm" onClick={() => handleGenerateReport(false)} loading={reportBusy}>
              {report ? "Թարմացնել" : "Ստեղծել հաշվետվություն"}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => handleGenerateReport(true)} loading={reportBusy}>
              Ուղարկել իմ էլ. փոստին
            </Button>
          </div>
        </Card>
      </Section>

      <ConfirmDialog
        open={confirmUnlink}
        onOpenChange={setConfirmUnlink}
        title={`Հեռացնե՞լ ${child.first_name || child.username}-ի կապը`}
        description="Դուք այլևս չեք տեսնի նրա առաջընթացը, և Ձեր սահմանած նպատակները կջնջվեն։ Երեխայի հաշիվն ու տվյալները մնում են անփոփոխ, և կապը կարելի է վերականգնել նոր հարցումով։"
        confirmLabel="Հեռացնել"
        busy={unlinking}
        onConfirm={handleUnlink}
      />
    </div>
  );
}

/*
  The activity feed.

  Three changes from the version that used to sit above the child:

  1. **Deduplicated.** The backend emits one notification per tier
     completed, so a child finishing three tiers of one topic produced
     three lines, two of them byte identical. Collapsing on the rendered
     text turns that back into one line with a count.
  2. **Capped at five**, with the rest behind a disclosure. Ten log lines
     is not information, it is a wall.
  3. It is the last section on the page rather than the first, because the
     question a parent came to answer is about the child, not about the
     event stream.
*/
const FEED_PREVIEW = 5;

interface FeedEntry {
  key: string;
  childName: string;
  message: string;
  unread: boolean;
  count: number;
}

function dedupe(notifications: Notification[]): FeedEntry[] {
  const seen = new Map<string, FeedEntry>();
  for (const n of notifications) {
    const key = `${n.child_name}::${n.message}`;
    const existing = seen.get(key);
    if (existing) {
      existing.count += 1;
      existing.unread = existing.unread || !n.is_read;
    } else {
      seen.set(key, {
        key,
        childName: n.child_name,
        message: n.message,
        unread: !n.is_read,
        count: 1,
      });
    }
  }
  return [...seen.values()];
}

function NotificationsPanel({
  notifications,
  isLoading,
  error,
  onRetry,
  onMarkAllRead,
}: {
  notifications: Notification[] | null;
  isLoading: boolean;
  error: unknown | null;
  onRetry: () => void;
  onMarkAllRead: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const entries = useMemo(() => dedupe(notifications ?? []), [notifications]);
  const unreadCount = entries.filter((e) => e.unread).length;
  const shown = expanded ? entries : entries.slice(0, FEED_PREVIEW);

  return (
    <Section
      title={
        <span className="flex items-center gap-2">
          <Bell size={18} strokeWidth={1.75} className="text-text-muted" />
          Վերջին իրադարձությունները
        </span>
      }
      description="Ինչ է արել Ձեր երեխան Gitus-ում"
      action={
        unreadCount > 0 ? (
          <Button variant="secondary" size="sm" onClick={onMarkAllRead}>
            Նշել բոլորը կարդացված
          </Button>
        ) : null
      }
    >
      {isLoading ? (
        <SkeletonRows count={3} />
      ) : error !== null ? (
        <ErrorState size="sm" title="Չհաջողվեց բեռնել իրադարձությունները։" onRetry={onRetry} />
      ) : entries.length === 0 ? (
        <EmptyState tone="positive" size="sm" title="Ծանուցումներ դեռ չկան" />
      ) : (
        <>
          <ul className="flex flex-col gap-[var(--space-2)]">
            {shown.map((entry) => (
              <li
                key={entry.key}
                className={cn(
                  "flex items-start gap-[var(--space-3)] rounded-[var(--radius)] border border-border",
                  "bg-surface p-[var(--space-3)] text-[length:var(--text-sm)]",
                  entry.unread ? "text-text" : "text-text-muted",
                )}
              >
                {entry.unread && (
                  <>
                    <span
                      aria-hidden="true"
                      className="mt-[7px] h-2 w-2 shrink-0 rounded-[var(--radius-full)] bg-primary"
                    />
                    <span className="sr-only">Չկարդացված</span>
                  </>
                )}
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{entry.childName}</span>: {entry.message}
                  {entry.count > 1 && (
                    <span className="ml-[var(--space-2)] text-[length:var(--text-xs)] text-text-muted">
                      ×{entry.count}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
          {entries.length > FEED_PREVIEW && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-[var(--space-3)]"
              iconLeft={
                <ChevronDown
                  size={15}
                  strokeWidth={1.75}
                  className={cn("transition-transform", expanded && "rotate-180")}
                />
              }
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? "Ցույց տալ ավելի քիչ" : `Ցույց տալ բոլորը (${entries.length})`}
            </Button>
          )}
        </>
      )}
    </Section>
  );
}

export function ParentDashboardPage() {
  const { logout } = useAuth();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showInvite, setShowInvite] = useState(false);

  const childrenResource = useAsyncResource<ChildSummary[]>(
    useCallback(() => parentsApi.getChildren(), []),
  );
  const children = childrenResource.data;

  const notificationsResource = useAsyncResource<Notification[]>(
    useCallback(() => parentsApi.getNotifications(), []),
  );

  useEffect(() => {
    if (children && children.length > 0) {
      setSelectedId((prev) => prev ?? children[0].id);
    }
  }, [children]);

  const selected = children?.find((c) => c.id === selectedId) ?? null;
  const unreadCount = (notificationsResource.data ?? []).filter((n) => !n.is_read).length;

  async function handleMarkAllRead() {
    await parentsApi.markNotificationsRead();
    notificationsResource.retry();
  }

  return (
    <div className="min-h-screen bg-bg px-4 py-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-[var(--space-6)] flex flex-wrap items-center justify-between gap-[var(--space-3)]">
          <div className="min-w-0">
            <LinkButton to="/profile">← Պրոֆիլ</LinkButton>
            <h1 className="mt-[var(--space-2)] font-display text-[length:var(--text-3xl)] font-semibold leading-[var(--leading-display)] tracking-[var(--tracking-tight)] text-text">
              Ծնողական վահանակ
            </h1>
          </div>
          <div className="flex items-center gap-[var(--space-3)]">
            {/* "Is there anything new" used to cost an entire screen of log
                lines above the child. Here it costs one line. */}
            {unreadCount > 0 && (
              <span className="flex items-center gap-[var(--space-2)] rounded-[var(--radius-full)] border border-primary-line bg-primary-bg px-[var(--space-3)] py-[var(--space-1)] text-[length:var(--text-sm)] font-medium text-primary">
                <Bell size={14} strokeWidth={2} aria-hidden="true" />
                {unreadCount} նոր
              </span>
            )}
            <Button variant="secondary" size="sm" onClick={logout}>
              Ելք
            </Button>
          </div>
        </div>

        {childrenResource.isLoading && <Skeleton className="mb-6 h-10 w-full" />}

        {childrenResource.error !== null && !childrenResource.isLoading && (
          <ErrorState title="Չհաջողվեց բեռնել Ձեր երեխաների ցանկը։" onRetry={childrenResource.retry} />
        )}

        {children !== null && children.length === 0 && (
          <div className="mb-6">
            <SendRequestCard onRefreshChildren={childrenResource.retry} />
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
              <Button
                variant="ghost"
                size="sm"
                iconLeft={<Plus size={16} strokeWidth={1.75} />}
                onClick={() => setShowInvite((v) => !v)}
              >
                Ավելացնել
              </Button>
            </div>

            {showInvite && (
              <div className="mb-6">
                <SendRequestCard onRefreshChildren={childrenResource.retry} />
              </div>
            )}

            {/* The child first, the event log last. */}
            {selected && (
              <ChildDashboardView key={selected.id} child={selected} onUnlinked={childrenResource.retry} />
            )}

            <NotificationsPanel
              notifications={notificationsResource.data}
              isLoading={notificationsResource.isLoading}
              error={notificationsResource.error}
              onRetry={notificationsResource.retry}
              onMarkAllRead={handleMarkAllRead}
            />
          </>
        )}
      </div>
    </div>
  );
}
