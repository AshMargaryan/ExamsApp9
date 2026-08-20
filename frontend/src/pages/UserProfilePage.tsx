import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import {
  Award, BarChart3, CalendarDays, ClipboardList, GraduationCap, Layers, Library,
  Lock, School, TrendingUp,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { Avatar } from "../components/ui/Avatar";
import { ErrorState } from "../components/ui/ErrorState";
import { PageHeader } from "../components/ui/PageHeader";
import { Section } from "../components/ui/Section";
import { Skeleton } from "../components/ui/Skeleton";
import { StatTile } from "../components/ui/StatTile";
import { Tabs, TabPanel } from "../components/ui/Tabs";
import { cn } from "../lib/cn";
import * as profileApi from "../api/profile";
import type { Achievement, Profile, UserAchievement } from "../api/profile";
import * as friendsApi from "../api/friends";
import type { ChildDashboard } from "../api/parents";
import type { RankHistoryPoint } from "../api/rankings";
import * as teachingApi from "../api/teaching";
import type { Assignment } from "../api/teaching";
import { assignmentDisplayTitle, assignmentTargetLabel } from "../lib/assignmentLabels";
import { RARITY_COLORS, RARITY_LABELS } from "../lib/achievementRarity";
import { ActivityHeatmap } from "../components/ActivityHeatmap";
import { Chart } from "../components/ui/Chart";
import { ProgressRing } from "../components/dashboard/ProgressRing";
import { SkillColumn } from "../components/dashboard/SkillColumn";
import { SkillsMasteryDonut } from "../components/dashboard/SkillsMasteryDonut";
import { SubjectRadarChart } from "../components/dashboard/SubjectRadarChart";
import { RankProgressChart } from "../components/rankings/RankProgressChart";
import { AssignmentProgressBar } from "../components/teaching/AssignmentProgressBar";
import { TestStatusIndicator } from "../components/teaching/TestStatusIndicator";

const ASSIGNMENT_STATUS_LABELS: Record<Assignment["status"], string> = {
  assigned: "Հանձնարարված",
  in_progress: "Ընթացքի մեջ",
  submitted: "Սպասում է հաստատման",
  completed: "Ավարտված",
};

function TeacherProgressSection({ studentId }: { studentId: number }) {
  const [dashboard, setDashboard] = useState<ChildDashboard | null>(null);
  const [rankHistory, setRankHistory] = useState<RankHistoryPoint[] | null>(null);
  const [failed, setFailed] = useState(false);

  // Both calls were bare `.then(setX)`, and the section was gated on
  // `!dashboard` — so a failure left three skeletons pulsing for ever inside
  // an otherwise working page. The rank history is optional decoration on
  // top and degrades to nothing; the dashboard says it could not load.
  const load = useCallback(() => {
    setDashboard(null);
    setRankHistory(null);
    setFailed(false);
    teachingApi.fetchStudentDashboard(studentId).then(setDashboard).catch(() => setFailed(true));
    teachingApi.fetchStudentRankHistory(studentId, "global").then(setRankHistory).catch(() => setRankHistory([]));
  }, [studentId]);

  useEffect(load, [load]);

  if (failed) {
    return (
      <ErrorState
        title="Աշակերտի առաջընթացը չհաջողվեց բեռնել։"
        hint="Պրոֆիլի մնացած մասը հասանելի է։"
        onRetry={load}
      />
    );
  }

  if (!dashboard) {
    return (
      <div className="flex flex-col gap-[var(--space-4)]">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-40 w-full" />)}
      </div>
    );
  }

  const { subject_performance, skills_mastery, weekly_progress, activity_calendar, predicted_exam_score } = dashboard;

  return (
    <div className="flex flex-col gap-5">
      {predicted_exam_score !== null && (
        <div className="flex items-center gap-3 rounded-[var(--radius)] border border-border bg-bg p-3">
          <ProgressRing value={predicted_exam_score} max={100} size={48} strokeWidth={5} />
          <div>
            <p className="text-sm font-medium text-text">Կանխատեսվող միավոր</p>
            <p className="text-xs text-text-muted">Վերջին թեստերի միջինով</p>
          </div>
        </div>
      )}

      <div>
        <h3 className="mb-2 flex items-center gap-[var(--space-2)] text-[length:var(--text-sm)] font-semibold text-text"><BarChart3 size={15} strokeWidth={1.75} aria-hidden className="text-text-muted" />Դասակարգման առաջընթաց</h3>
        {rankHistory ? <RankProgressChart points={rankHistory} /> : <Skeleton className="h-40 w-full" />}
      </div>

      <div>
        <h3 className="mb-2 flex items-center gap-[var(--space-2)] text-[length:var(--text-sm)] font-semibold text-text"><Library size={15} strokeWidth={1.75} aria-hidden className="text-text-muted" />Առարկայական առաջընթաց</h3>
        {subject_performance.length === 0 ? (
          <p className="text-sm text-text-muted">Տվյալներ դեռ չկան։</p>
        ) : (
          <>
            <SubjectRadarChart subjects={subject_performance} />
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {subject_performance.map((s) => (
                <div key={s.subject_id} className="rounded-[var(--radius)] border border-border bg-bg p-3">
                  <p className="text-sm font-medium text-text">{s.subject_name}</p>
                  <p className="mt-0.5 text-xs text-text-muted">
                    {s.avg_score === null ? "Դեռ չսկսված" : `Միջին միավոր՝ ${s.avg_score}%`}
                  </p>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${s.completion_percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div>
        <h3 className="mb-2 flex items-center gap-[var(--space-2)] text-[length:var(--text-sm)] font-semibold text-text"><Layers size={15} strokeWidth={1.75} aria-hidden className="text-text-muted" />Հմտությունների յուրացում</h3>
        <SkillsMasteryDonut
          counts={{
            mastered: skills_mastery.mastered.length,
            practicing: skills_mastery.practicing.length,
            needs_improvement: skills_mastery.needs_improvement.length,
          }}
        />
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <SkillColumn title="Յուրացված" tone="mastered" items={skills_mastery.mastered} />
          <SkillColumn title="Պարապում է" tone="practicing" items={skills_mastery.practicing} />
          <SkillColumn title="Կարիք ունի ուշադրության" tone="needs_improvement" items={skills_mastery.needs_improvement} />
        </div>
      </div>

      <div>
        <h3 className="mb-2 flex items-center gap-[var(--space-2)] text-[length:var(--text-sm)] font-semibold text-text"><TrendingUp size={15} strokeWidth={1.75} aria-hidden className="text-text-muted" />Առաջընթաց ըստ շաբաթների</h3>
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
          height={180}
        />
      </div>

      <div>
        <h3 className="mb-2 flex items-center gap-[var(--space-2)] text-[length:var(--text-sm)] font-semibold text-text"><CalendarDays size={15} strokeWidth={1.75} aria-hidden className="text-text-muted" />Ակտիվության օրացույց (30 օր)</h3>
        <ActivityHeatmap
          points={activity_calendar.map((p) => ({ ...p, tooltip: `${p.date}՝ ${p.count} հարց` }))}
          rangeDays={30}
        />
      </div>
    </div>
  );
}

function FriendProgressSection({ friendDashboard }: { friendDashboard: ChildDashboard }) {
  return (
    <div className="rounded-[var(--radius)] border border-border bg-surface p-5">
      <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-text-muted">
        <TrendingUp size={15} strokeWidth={1.75} /> Առաջընթաց (ընկերների համար)
      </h3>
      <div className="flex flex-col gap-4">
        <div>
          <p className="mb-2 text-xs font-medium text-text-muted">Առարկայական առաջընթաց</p>
          <SubjectRadarChart subjects={friendDashboard.subject_performance} />
        </div>
        <div>
          <p className="mb-2 text-xs font-medium text-text-muted">Հմտությունների յուրացում</p>
          <SkillsMasteryDonut
            counts={{
              mastered: friendDashboard.skills_mastery.mastered.length,
              practicing: friendDashboard.skills_mastery.practicing.length,
              needs_improvement: friendDashboard.skills_mastery.needs_improvement.length,
            }}
          />
        </div>
        <div>
          <p className="mb-2 text-xs font-medium text-text-muted">Առաջընթաց ըստ շաբաթների</p>
          <Chart
            data={friendDashboard.weekly_progress.map((p) => ({
              week: new Date(p.week_start).toLocaleDateString("hy-AM", { day: "numeric", month: "short" }),
              solved: p.solved,
              correct: p.correct,
            }))}
            xKey="week"
            series={[
              { key: "solved", label: "Ընդհանուր", color: "var(--color-border)" },
              { key: "correct", label: "Ճիշտ", color: "var(--color-accent)" },
            ]}
            height={160}
          />
        </div>
        <div>
          <p className="mb-2 text-xs font-medium text-text-muted">Ակտիվության օրացույց (30 օր)</p>
          <ActivityHeatmap
            points={friendDashboard.activity_calendar.map((p) => ({ ...p, tooltip: `${p.date}՝ ${p.count} հարց` }))}
            rangeDays={30}
          />
        </div>
      </div>
    </div>
  );
}

type ProfileTab = "overview" | "assignments" | "progress";

export function UserProfilePage() {
  const { userId: userIdParam } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const userId = Number(userIdParam);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileFailed, setProfileFailed] = useState(false);
  const [achievements, setAchievements] = useState<Achievement[] | null>(null);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[] | null>(null);
  const [friendDashboard, setFriendDashboard] = useState<ChildDashboard | null>(null);
  const [assignments, setAssignments] = useState<Assignment[] | null>(null);
  const [isMyStudent, setIsMyStudent] = useState(false);
  const [tab, setTab] = useState<ProfileTab>("overview");

  const isTeacher = user?.role === "teacher";

  const load = useCallback(() => {
    setProfile(null);
    setProfileFailed(false);
    setAchievements(null);
    setUserAchievements(null);
    setFriendDashboard(null);
    setAssignments(null);
    setIsMyStudent(false);
    setTab("overview");
    if (!userId) return;

    // Was unguarded: a 404 on a stale link, or any network failure, left the
    // page reading "Բեռնվում է..." for ever with no way to tell which.
    profileApi.fetchUserProfile(userId).then(setProfile).catch(() => setProfileFailed(true));
    profileApi.fetchAchievements().then(setAchievements).catch(() => setAchievements([]));
    profileApi.fetchUserAchievements(userId).then(setUserAchievements).catch(() => setUserAchievements([]));
    // 403s for anyone who isn't a confirmed friend (or self) — that's the
    // expected common case (viewing a stranger's profile), not an error,
    // so it's swallowed and the extra section just doesn't render.
    friendsApi.fetchFriendDashboard(userId).then(setFriendDashboard).catch(() => {});

    if (isTeacher) {
      teachingApi
        .fetchAssignments(userId)
        .then((list) => {
          setAssignments(list);
          setIsMyStudent(true);
          list
            .filter((a) => a.status === "submitted" && !a.seen_by_teacher)
            .forEach((a) => teachingApi.markAssignmentSeen(a.id));
        })
        .catch(() => {});
    }
  }, [userId, isTeacher]);

  useEffect(() => {
    load();
  }, [load]);

  if (!userIdParam || Number.isNaN(userId)) {
    return <Navigate to="/" replace />;
  }

  if (user && userId === user.id) {
    return <Navigate to="/profile" replace />;
  }

  const unlockedKeys = new Set((userAchievements ?? []).map((ua) => ua.achievement.key));
  const fullName = profile ? [profile.first_name, profile.last_name].filter(Boolean).join(" ") : "";

  if (profileFailed) {
    return (
      <div className="mx-auto max-w-3xl px-[var(--space-4)] py-[var(--space-8)]">
        <PageHeader title="Պրոֆիլ" back={{ to: "/rankings", label: "Դասակարգում" }} />
        <ErrorState
          title="Այս պրոֆիլը չհաջողվեց բացել։"
          hint="Հնարավոր է՝ օգտատերը այլևս գոյություն չունի, կամ կապն ընդհատվել է։"
          onRetry={load}
        />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-3xl px-[var(--space-4)] py-[var(--space-8)]">
        <Skeleton className="mb-[var(--space-3)] h-4 w-32" />
        <div className="mb-[var(--space-6)] flex items-center gap-[var(--space-4)]">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div className="flex-1 space-y-[var(--space-2)]">
            <Skeleton className="h-7 w-2/3" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const overview = (
    <>
      <Section title="Նվաճումներ" level={2} spacing="tight">
        {achievements === null ? (
          <div className="grid grid-cols-3 gap-[var(--space-3)] sm:grid-cols-4">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
        ) : (
          <ul className="grid grid-cols-3 gap-[var(--space-3)] sm:grid-cols-4">
            {achievements.map((a) => {
              const unlocked = unlockedKeys.has(a.key);
              return (
                <li
                  key={a.id}
                  className={cn(
                    "rounded-[var(--radius-lg)] border border-border bg-surface p-[var(--space-3)] text-center",
                    !unlocked && "opacity-55",
                  )}
                >
                  {/* Locked was a 🔒 and the unlocked fallback a 🏆. The
                      server-authored `icon` is the badge's own emblem and
                      stays; everything around it is lucide, matching
                      ProfileHero's precedent. */}
                  <span className="flex h-7 items-center justify-center text-[length:var(--text-xl)] text-text-muted">
                    {unlocked
                      ? a.icon || <Award size={20} strokeWidth={1.75} aria-hidden />
                      : <Lock size={18} strokeWidth={1.75} aria-hidden />}
                  </span>
                  <p className="mt-1 text-[length:var(--text-xs)] font-medium text-text">{a.name}</p>
                  <p className="mt-0.5 text-[0.65rem] font-medium" style={{ color: RARITY_COLORS[a.rarity] }}>
                    {RARITY_LABELS[a.rarity]}
                  </p>
                  {/* The description was a `title` tooltip — the one string
                      saying what earns the badge, invisible on every touch
                      device. */}
                  {a.description && (
                    <p className="mt-1 text-[0.65rem] leading-snug text-text-muted">{a.description}</p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Section>

      {friendDashboard && (
        <div className="mt-[var(--space-6)]">
          <FriendProgressSection friendDashboard={friendDashboard} />
        </div>
      )}
    </>
  );

  const assignmentsPanel = assignments === null ? (
    <div className="flex flex-col gap-[var(--space-2)]">
      {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
    </div>
  ) : assignments.length === 0 ? (
    <p className="text-text-muted">Առաջադրանքներ դեռ չկան։</p>
  ) : (
    <ul className="flex flex-col gap-[var(--space-2)]">
      {assignments.map((a) => (
        <li key={a.id}>
          <Link
            to={`/assignments/${a.id}`}
            className="block rounded-[var(--radius-lg)] border border-border bg-surface p-[var(--space-3)] transition-colors hover:border-primary"
          >
            <div className="flex items-center justify-between gap-[var(--space-3)]">
              <div className="min-w-0">
                <p className="truncate text-[length:var(--text-sm)] text-text">{assignmentDisplayTitle(a)}</p>
                <p className="text-[length:var(--text-xs)] text-text-muted">{assignmentTargetLabel(a)}</p>
              </div>
              <span className="flex shrink-0 items-center gap-1.5 text-[length:var(--text-xs)] text-text-muted">
                {/* Was a bare dot with a `title` — colour plus a tooltip,
                    which is nothing at all on a phone. The label beside it
                    already says "Սպասում է հաստատման". */}
                {a.status === "submitted" && <span className="h-2 w-2 rounded-full bg-primary" aria-hidden />}
                {ASSIGNMENT_STATUS_LABELS[a.status]}
              </span>
            </div>
            {(a.status === "assigned" || a.status === "in_progress") &&
              (a.assignment_type === "mock_exam" ? (
                a.test_status && <TestStatusIndicator status={a.test_status} className="mt-2" />
              ) : (
                <AssignmentProgressBar percent={a.progress} className="mt-2" />
              ))}
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="mx-auto max-w-3xl px-[var(--space-4)] py-[var(--space-8)]">
      {/*
        The back control was a "← Հետ" button in a bar of its own,
        driven by `window.history.length` — which counts the whole
        session, not this app, so on a fresh tab opened from a link it
        could send the student to whatever page preceded Gitus.
        `PageHeader` names a real destination.
      */}
      <PageHeader
        back={{ to: "/rankings", label: "Դասակարգում" }}
        eyebrow={`@${profile.username}`}
        title={fullName || profile.username}
        description={`Մակարդակ ${profile.level} · ${profile.total_xp} XP`}
        actions={<Avatar src={profile.avatar} name={fullName || profile.username} size="lg" />}
      />

      {profile.bio && (
        <p className="mb-[var(--space-6)] whitespace-pre-wrap text-text">{profile.bio}</p>
      )}

      <div className="mb-[var(--space-4)] grid grid-cols-3 gap-[var(--space-3)]">
        <StatTile
          label="Ճշգրտություն"
          value={profile.stats ? `${profile.stats.accuracy_percentage}%` : "—"}
        />
        <StatTile
          label="Ավարտված թեստեր"
          value={profile.stats ? String(profile.stats.tests_completed) : "—"}
        />
        <StatTile label="Նվաճումներ" value={String(profile.trophies_count)} />
      </div>

      {/* School and university are facts about a person, not measurements —
          set in a `StatTile`'s metric size, "Երևանի թիվ 195 ավագ դպրոց" ran
          to three lines and became the loudest thing in the row. */}
      <dl className="mb-[var(--space-6)] flex flex-wrap gap-x-[var(--space-6)] gap-y-[var(--space-1)] text-[length:var(--text-sm)]">
        <div className="flex items-baseline gap-[var(--space-2)]">
          <dt className="flex items-center gap-[var(--space-2)] text-text-muted">
            <School size={15} strokeWidth={1.75} aria-hidden className="shrink-0" />
            Դպրոց
          </dt>
          <dd className="text-text">{profile.school ? profile.school.name : "Չնշված"}</dd>
        </div>
        <div className="flex items-baseline gap-[var(--space-2)]">
          <dt className="flex items-center gap-[var(--space-2)] text-text-muted">
            <GraduationCap size={15} strokeWidth={1.75} aria-hidden className="shrink-0" />
            Ցանկալի բուհ
          </dt>
          <dd className="text-text">{profile.university ? profile.university.name : "Չնշված"}</dd>
        </div>
      </dl>

      {isMyStudent ? (
        /* Three bare buttons whose only selected signal was colour, and which
           the keyboard walked one stop at a time. */
        <Tabs
          label="Աշակերտի բաժիններ"
          className="mb-[var(--space-6)]"
          value={tab}
          onChange={setTab}
          items={[
            { value: "overview", label: "Ընդհանուր", icon: <Award size={15} strokeWidth={1.75} aria-hidden /> },
            { value: "assignments", label: "Առաջադրանքներ", icon: <ClipboardList size={15} strokeWidth={1.75} aria-hidden /> },
            { value: "progress", label: "Առաջընթաց", icon: <TrendingUp size={15} strokeWidth={1.75} aria-hidden /> },
          ]}
        >
          <TabPanel value="overview">{overview}</TabPanel>
          <TabPanel value="assignments">{assignmentsPanel}</TabPanel>
          <TabPanel value="progress">
            <TeacherProgressSection studentId={userId} />
          </TabPanel>
        </Tabs>
      ) : (
        /* For a friend or a stranger the overview is the whole page, so it is
           not a tab panel — there is nothing to switch between. */
        overview
      )}
    </div>
  );
}
