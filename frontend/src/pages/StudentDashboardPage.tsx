import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import * as profileApi from "../api/profile";
import type { ActivityDay, Profile, UserAchievement } from "../api/profile";
import * as teachingApi from "../api/teaching";
import type { Assignment } from "../api/teaching";
import { PublicProfileModal } from "../components/profile/PublicProfileModal";
import { TeachingModal } from "../components/teaching/TeachingModal";
import { DailyProgressChart } from "../components/dashboard/DailyProgressChart";
import { DashboardAssignmentCard } from "../components/dashboard/DashboardAssignmentCard";

const ACCURACY_RING_R = 24;
const ACCURACY_RING_CIRCUMFERENCE = 2 * Math.PI * ACCURACY_RING_R;

function StatCard({
  label,
  className = "",
  labelClassName = "text-text-muted",
  style,
  children,
}: {
  label: string;
  className?: string;
  labelClassName?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`flex flex-col justify-between gap-4 rounded-[20px] border border-border p-5 ${className}`}
      style={style}
    >
      <div className={`text-xs font-medium tracking-wide uppercase ${labelClassName}`}>{label}</div>
      {children}
    </div>
  );
}

export function StudentDashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [assignments, setAssignments] = useState<Assignment[] | null>(null);
  const [achievements, setAchievements] = useState<UserAchievement[] | null>(null);
  const [activity, setActivity] = useState<ActivityDay[] | null>(null);
  const [teachingOpen, setTeachingOpen] = useState(false);
  const [viewingUserId, setViewingUserId] = useState<number | null>(null);
  const [settingExamDate, setSettingExamDate] = useState(false);
  const [examDateInput, setExamDateInput] = useState("");

  function refreshProfile() {
    profileApi.fetchProfile().then(setProfile);
  }

  function refreshAssignments() {
    teachingApi.fetchAssignments().then((list) => {
      setAssignments(list);
      list.filter((a) => !a.seen_by_student).forEach((a) => teachingApi.markAssignmentSeen(a.id));
    });
  }

  useEffect(() => {
    refreshProfile();
    refreshAssignments();
    profileApi.fetchMyAchievements().then(setAchievements);
    profileApi.fetchActivityHeatmap(7).then(setActivity);
  }, []);

  function handleTeachingClose() {
    setTeachingOpen(false);
    refreshProfile();
  }

  async function handleStart(id: number) {
    await teachingApi.startAssignment(id);
    refreshAssignments();
  }

  async function handleSetExamDate() {
    if (!examDateInput) return;
    const updated = await profileApi.setExamDate(examDateInput);
    setProfile(updated);
    setSettingExamDate(false);
  }

  if (!profile) {
    return <div className="p-8 text-lg text-text-muted">Բեռնվում է...</div>;
  }

  const active = assignments ?? [];
  const activeAssignments = active.filter((a) => a.status === "assigned" || a.status === "in_progress");
  const sentAssignments = active.filter((a) => a.status === "submitted" || a.status === "completed");

  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.username;
  const accuracy = profile.stats?.accuracy_percentage ?? 0;
  const accuracyOffset = ACCURACY_RING_CIRCUMFERENCE * (1 - accuracy / 100);
  const xpPercent =
    profile.xp_for_next_level > 0 ? Math.min(100, (profile.xp_into_level / profile.xp_for_next_level) * 100) : 100;

  return (
    <div className="min-h-screen bg-bg px-4 py-8 sm:px-8 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4">
          <Link to="/" className="text-sm text-primary hover:underline">
            ← Գլխավոր
          </Link>
        </div>

        {/* HEADER */}
        <div className="mb-10 flex flex-col gap-6 border-b border-border pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div
              className="mb-2.5 text-sm font-medium tracking-[0.16em] text-text-muted uppercase"
              style={{ fontFamily: "'Noto Serif Armenian', serif" }}
            >
              Աշակերտի վահանակ
            </div>
            <h1 className="text-3xl font-semibold text-text sm:text-4xl" style={{ fontFamily: "'Noto Serif Armenian', serif" }}>
              Բարի վերադարձ, {fullName.split(" ")[0]} 👋
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm font-semibold text-text">{fullName}</div>
              <div className="text-xs text-text-muted">{profile.grade ? `${profile.grade}-րդ դասարան` : profile.username}</div>
            </div>
            <span className="flex h-13 w-13 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-muted text-lg font-semibold text-text-muted">
              {profile.avatar ? (
                <img src={profile.avatar} alt={fullName} className="h-full w-full object-cover" />
              ) : (
                fullName.slice(0, 1).toUpperCase()
              )}
            </span>
          </div>
        </div>

        {/* TEACHERS */}
        <div className="mb-8">
          <div className="mb-3.5 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text">👩‍🏫 Ուսուցիչներ</h2>
            <button
              type="button"
              onClick={() => setTeachingOpen(true)}
              className="rounded-md border border-primary px-4 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-surface-muted"
            >
              Հրավերներ
            </button>
          </div>
          {profile.teachers && profile.teachers.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {profile.teachers.map((t) => {
                const name = [t.first_name, t.last_name].filter(Boolean).join(" ") || t.username;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setViewingUserId(t.id)}
                    className="flex items-center gap-3.5 rounded-full border border-border bg-surface py-2.5 pr-6 pl-2.5 text-left transition-colors hover:border-primary"
                  >
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-muted text-base font-semibold text-text-muted">
                      {t.avatar ? (
                        <img src={t.avatar} alt={name} className="h-full w-full object-cover" />
                      ) : (
                        name.slice(0, 1).toUpperCase()
                      )}
                    </span>
                    <div>
                      <div className="text-base font-semibold text-text">{name}</div>
                      <div className="text-xs text-text-muted">@{t.username}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="rounded-[var(--radius)] border border-border bg-surface p-5 text-sm text-text-muted">
              Դեռ կապակցված ուսուցիչներ չկան։ Ուսուցչի հրավերները հայտնվում են «Հրավերներ» կոճակի տակ։
            </p>
          )}
        </div>

        {/* STATS */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-[1.7fr_1fr_1fr_1fr_1.2fr]">
          <StatCard label="📊 Շաբաթական առաջընթաց" className="col-span-2 sm:col-span-3 lg:col-span-1">
            {activity ? <DailyProgressChart days={activity} /> : <p className="text-sm text-text-muted">Բեռնվում է...</p>}
          </StatCard>

          <StatCard label="🔥 Հաջորդականություն">
            <div>
              <div className="text-4xl leading-none font-semibold text-text" style={{ fontFamily: "'Noto Serif Armenian', serif" }}>
                {profile.streak?.current_streak ?? 0}
              </div>
              <div className="mt-1 text-xs text-text-muted">օր անընդմեջ</div>
            </div>
          </StatCard>

          <StatCard label="🎯 Ճշգրտություն">
            <div className="flex items-center gap-3.5">
              <svg width="56" height="56" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r={ACCURACY_RING_R} fill="none" stroke="var(--color-border)" strokeWidth="4" />
                <circle
                  cx="28"
                  cy="28"
                  r={ACCURACY_RING_R}
                  fill="none"
                  stroke="var(--color-text)"
                  strokeWidth="4"
                  strokeDasharray={ACCURACY_RING_CIRCUMFERENCE}
                  strokeDashoffset={accuracyOffset}
                  strokeLinecap="round"
                  transform="rotate(-90 28 28)"
                />
              </svg>
              <div className="text-2xl font-semibold text-text" style={{ fontFamily: "'Noto Serif Armenian', serif" }}>
                {Math.round(accuracy)}%
              </div>
            </div>
          </StatCard>

          <StatCard label="⭐ Մակարդակ">
            <div>
              <div className="text-2xl font-semibold text-text" style={{ fontFamily: "'Noto Serif Armenian', serif" }}>
                {profile.level}-րդ մակարդակ
              </div>
              <div className="mt-2.5">
                <div className="h-2 w-full rounded-full bg-surface-muted">
                  <div className="h-full rounded-full bg-text" style={{ width: `${xpPercent}%` }} />
                </div>
                <div className="mt-1.5 text-xs text-text-muted">
                  {profile.xp_into_level} / {profile.xp_for_next_level} XP
                </div>
              </div>
            </div>
          </StatCard>

          {profile.target_exam_date ? (
            <StatCard
              label="📅 Քննության ամսաթիվ"
              className="text-white"
              labelClassName="text-white/70"
              style={{ backgroundImage: "linear-gradient(226deg, #2563EB, #7F24B0, #FF5C8D)" }}
            >
              <div>
                <div className="text-3xl leading-none font-semibold" style={{ fontFamily: "'Noto Serif Armenian', serif" }}>
                  {Math.max(profile.days_until_exam ?? 0, 0)}
                </div>
                <div className="mt-1.5 text-xs opacity-70">
                  օր մնաց · {new Date(profile.target_exam_date).toLocaleDateString("hy-AM", { day: "numeric", month: "short" })}
                </div>
              </div>
            </StatCard>
          ) : (
            <StatCard label="📅 Քննության ամսաթիվ">
              {settingExamDate ? (
                <div className="flex flex-col gap-2">
                  <input
                    type="date"
                    value={examDateInput}
                    onChange={(e) => setExamDateInput(e.target.value)}
                    className="rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-text outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={handleSetExamDate}
                    className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-contrast hover:bg-primary-hover"
                  >
                    Հաստատել
                  </button>
                </div>
              ) : (
                <>
                  <div className="text-sm text-text-muted">Նշված չէ</div>
                  <button
                    type="button"
                    onClick={() => setSettingExamDate(true)}
                    className="rounded-xl border border-border bg-surface px-3.5 py-2.5 text-xs text-text hover:border-primary"
                  >
                    Սահմանել ամսաթիվը
                  </button>
                </>
              )}
            </StatCard>
          )}
        </div>

        {/* ASSIGNMENTS */}
        <div className="mb-8">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-2xl font-semibold text-text" style={{ fontFamily: "'Noto Serif Armenian', serif" }}>
              📚 Ակտիվ առաջադրանքներ{" "}
              <span className="text-sm font-normal text-text-muted">({activeAssignments.length})</span>
            </h2>
          </div>
          {assignments === null && <p className="text-text-muted">Բեռնվում է...</p>}
          {assignments !== null && activeAssignments.length === 0 && (
            <p className="rounded-[var(--radius)] border border-border bg-surface p-5 text-text-muted">
              Այլ ընթացիկ առաջադրանքներ չկան։
            </p>
          )}
          {activeAssignments.length > 0 && (
            <div className="flex gap-5 overflow-x-auto pb-2" style={{ scrollSnapType: "x mandatory" }}>
              {activeAssignments.map((a) => (
                <DashboardAssignmentCard key={a.id} assignment={a} onStart={handleStart} onRefresh={refreshAssignments} />
              ))}
            </div>
          )}
        </div>

        <div className="mb-8">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-2xl font-semibold text-text" style={{ fontFamily: "'Noto Serif Armenian', serif" }}>
              📨 Ուղարկված առաջադրանքներ{" "}
              <span className="text-sm font-normal text-text-muted">({sentAssignments.length})</span>
            </h2>
          </div>
          {sentAssignments.length === 0 ? (
            <p className="rounded-[var(--radius)] border border-border bg-surface p-5 text-text-muted">
              Ուղարկված առաջադրանքներ դեռ չկան։
            </p>
          ) : (
            <div className="flex gap-5 overflow-x-auto pb-2" style={{ scrollSnapType: "x mandatory" }}>
              {sentAssignments.map((a) => (
                <DashboardAssignmentCard key={a.id} assignment={a} onStart={handleStart} onRefresh={refreshAssignments} />
              ))}
            </div>
          )}
        </div>

        {/* ACHIEVEMENTS */}
        <div>
          <h2 className="mb-5 text-2xl font-semibold text-text" style={{ fontFamily: "'Noto Serif Armenian', serif" }}>
            🏆 Նվաճումներ
          </h2>
          {achievements === null && <p className="text-text-muted">Բեռնվում է...</p>}
          {achievements !== null && achievements.length === 0 && (
            <p className="rounded-[var(--radius)] border border-border bg-surface p-5 text-text-muted">
              Դեռ նվաճումներ չկան։ Շարունակեք սովորել՝ դրանք բացելու համար։
            </p>
          )}
          {achievements !== null && achievements.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {achievements.map((ua) => (
                <div key={ua.id} className="flex items-start gap-3.5 rounded-2xl border border-border p-4.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-text text-base">
                    {ua.achievement.icon || "🏆"}
                  </div>
                  <div>
                    <div className="mb-0.5 text-sm font-semibold text-text">{ua.achievement.name}</div>
                    <div className="text-xs text-text-muted">{ua.achievement.description}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {teachingOpen && <TeachingModal role="student" onClose={handleTeachingClose} onChange={refreshProfile} />}
      {viewingUserId !== null && (
        <PublicProfileModal userId={viewingUserId} onClose={() => setViewingUserId(null)} />
      )}
    </div>
  );
}
