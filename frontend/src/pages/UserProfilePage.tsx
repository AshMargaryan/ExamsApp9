import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { TrendingUp } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../components/ui/Button";
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

  useEffect(() => {
    setDashboard(null);
    setRankHistory(null);
    teachingApi.fetchStudentDashboard(studentId).then(setDashboard);
    teachingApi.fetchStudentRankHistory(studentId, "global").then(setRankHistory);
  }, [studentId]);

  if (!dashboard) {
    return <p className="text-text-muted">Բեռնվում է...</p>;
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
        <h3 className="mb-2 text-sm font-semibold text-text-muted">📊 Դասակարգման առաջընթաց</h3>
        {rankHistory ? <RankProgressChart points={rankHistory} /> : <p className="text-text-muted">Բեռնվում է...</p>}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-text-muted">📚 Առարկայական առաջընթաց</h3>
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
        <h3 className="mb-2 text-sm font-semibold text-text-muted">🧩 Հմտությունների յուրացում</h3>
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
        <h3 className="mb-2 text-sm font-semibold text-text-muted">📈 Առաջընթաց ըստ շաբաթների</h3>
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
        <h3 className="mb-2 text-sm font-semibold text-text-muted">🗓️ Ակտիվության օրացույց (30 օր)</h3>
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

export function UserProfilePage() {
  const { userId: userIdParam } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const userId = Number(userIdParam);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [achievements, setAchievements] = useState<Achievement[] | null>(null);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[] | null>(null);
  const [friendDashboard, setFriendDashboard] = useState<ChildDashboard | null>(null);
  const [assignments, setAssignments] = useState<Assignment[] | null>(null);
  const [isMyStudent, setIsMyStudent] = useState(false);
  const [tab, setTab] = useState<"overview" | "assignments" | "progress">("overview");

  const isTeacher = user?.role === "teacher";

  useEffect(() => {
    setProfile(null);
    setAchievements(null);
    setUserAchievements(null);
    setFriendDashboard(null);
    setAssignments(null);
    setIsMyStudent(false);
    setTab("overview");
    if (!userId) return;

    profileApi.fetchUserProfile(userId).then(setProfile);
    profileApi.fetchAchievements().then(setAchievements);
    profileApi.fetchUserAchievements(userId).then(setUserAchievements);
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

  if (!userIdParam || Number.isNaN(userId)) {
    return <Navigate to="/" replace />;
  }

  if (user && userId === user.id) {
    return <Navigate to="/profile" replace />;
  }

  const unlockedKeys = new Set((userAchievements ?? []).map((ua) => ua.achievement.key));
  const fullName = profile ? [profile.first_name, profile.last_name].filter(Boolean).join(" ") : "";

  return (
    <div className="min-h-screen bg-bg">
      <div className="flex items-center justify-between px-4 py-4 sm:px-8">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
        >
          ← Հետ
        </Button>
      </div>

      <div className="mx-auto max-w-3xl px-4 pb-12 sm:px-8">
        {!profile && <p className="text-text-muted">Բեռնվում է...</p>}

        {profile && (
          <>
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-muted text-3xl font-semibold text-text-muted">
                {profile.avatar ? (
                  <img src={profile.avatar} alt={profile.username} className="h-full w-full object-cover" />
                ) : (
                  (profile.first_name || profile.username).slice(0, 1).toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-2xl font-semibold text-text">{fullName || profile.username}</p>
                <p className="text-text-muted">@{profile.username}</p>
                <p className="text-sm text-text-muted">
                  Մակարդակ {profile.level} · {profile.total_xp} XP
                </p>
              </div>
            </div>

            {profile.bio && <p className="mt-4 whitespace-pre-wrap text-text">{profile.bio}</p>}

            <div className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-text-muted">Դպրոց</p>
                <p className="text-text">{profile.school ? profile.school.name : "Չնշված"}</p>
              </div>
              <div>
                <p className="text-sm text-text-muted">Ցանկալի բուհ</p>
                <p className="text-text">{profile.university ? profile.university.name : "Չնշված"}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-4 text-center">
              <div>
                <p className="text-lg font-semibold text-text">
                  {profile.stats ? `${profile.stats.accuracy_percentage}%` : "—"}
                </p>
                <p className="text-xs text-text-muted">Ճշգրտություն</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-text">{profile.stats ? profile.stats.tests_completed : "—"}</p>
                <p className="text-xs text-text-muted">Ավարտված թեստեր</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-text">{profile.trophies_count}</p>
                <p className="text-xs text-text-muted">Նվաճումներ</p>
              </div>
            </div>

            {isMyStudent && (
              <div className="mt-6 flex gap-2 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={() => setTab("overview")}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    tab === "overview" ? "border-primary bg-surface-muted text-primary" : "border-border text-text-muted hover:border-primary"
                  }`}
                >
                  Ընդհանուր
                </button>
                <button
                  type="button"
                  onClick={() => setTab("assignments")}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    tab === "assignments" ? "border-primary bg-surface-muted text-primary" : "border-border text-text-muted hover:border-primary"
                  }`}
                >
                  Առաջադրանքներ
                </button>
                <button
                  type="button"
                  onClick={() => setTab("progress")}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    tab === "progress" ? "border-primary bg-surface-muted text-primary" : "border-border text-text-muted hover:border-primary"
                  }`}
                >
                  Առաջընթաց
                </button>
              </div>
            )}

            {(!isMyStudent || tab === "overview") && (
              <div className="mt-6 border-t border-border pt-4">
                <h3 className="mb-2 text-sm font-semibold text-text-muted">Նվաճումներ</h3>
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                  {achievements === null && <p className="col-span-full text-text-muted">Բեռնվում է...</p>}
                  {achievements?.map((a) => {
                    const unlocked = unlockedKeys.has(a.key);
                    return (
                      <div
                        key={a.id}
                        title={a.description}
                        className={`rounded-[var(--radius)] border border-border bg-bg p-3 text-center ${unlocked ? "" : "opacity-40 grayscale"}`}
                      >
                        <p className="text-xl">{unlocked ? a.icon || "🏆" : "🔒"}</p>
                        <p className="mt-1 text-xs font-medium text-text">{a.name}</p>
                        <p className="mt-0.5 text-[0.65rem] font-medium" style={{ color: RARITY_COLORS[a.rarity] }}>
                          {RARITY_LABELS[a.rarity]}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {friendDashboard && (
                  <div className="mt-6">
                    <FriendProgressSection friendDashboard={friendDashboard} />
                  </div>
                )}
              </div>
            )}

            {isMyStudent && tab === "assignments" && (
              <div className="mt-6 border-t border-border pt-4">
                {assignments === null && <p className="text-text-muted">Բեռնվում է...</p>}
                {assignments?.length === 0 && <p className="text-text-muted">Առաջադրանքներ դեռ չկան։</p>}
                <div className="flex flex-col gap-2">
                  {assignments?.map((a) => (
                    <Link
                      key={a.id}
                      to={`/assignments/${a.id}`}
                      className="rounded-[var(--radius)] border border-border bg-bg p-3 transition-colors hover:border-primary"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm text-text">{assignmentDisplayTitle(a)}</p>
                          <p className="text-xs text-text-muted">{assignmentTargetLabel(a)}</p>
                        </div>
                        <span className="flex shrink-0 items-center gap-1.5 text-xs text-text-muted">
                          {a.status === "submitted" && <span className="h-2 w-2 rounded-full bg-primary" title="Սպասում է հաստատման" />}
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
                  ))}
                </div>
              </div>
            )}

            {isMyStudent && tab === "progress" && (
              <div className="mt-6 border-t border-border pt-4">
                <TeacherProgressSection studentId={userId} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
