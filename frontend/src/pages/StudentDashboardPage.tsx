import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart3, BookOpen, CalendarDays, Flame, GraduationCap, Send, Star, Target, Trophy } from "lucide-react";
import * as profileApi from "../api/profile";
import type { ActivityDay, Profile, UserAchievement } from "../api/profile";
import * as teachingApi from "../api/teaching";
import type { Assignment } from "../api/teaching";
import { TeachingModal } from "../components/teaching/TeachingModal";
import { DailyProgressChart } from "../components/dashboard/DailyProgressChart";
import { DashboardAssignmentCard } from "../components/dashboard/DashboardAssignmentCard";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EmptyState } from "../components/ui/EmptyState";
import { LinkButton } from "../components/ui/LinkButton";
import { Skeleton } from "../components/ui/Skeleton";
import { StatTile } from "../components/ui/StatTile";
import { DatePicker } from "../components/ui/DatePicker";

const ACCURACY_RING_R = 24;
const ACCURACY_RING_CIRCUMFERENCE = 2 * Math.PI * ACCURACY_RING_R;

export function StudentDashboardPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [assignments, setAssignments] = useState<Assignment[] | null>(null);
  const [achievements, setAchievements] = useState<UserAchievement[] | null>(null);
  const [activity, setActivity] = useState<ActivityDay[] | null>(null);
  const [teachingOpen, setTeachingOpen] = useState(false);
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
    return (
      <div className="min-h-screen bg-bg px-4 py-8 sm:px-8 lg:px-16">
        <div className="mx-auto max-w-6xl">
          <Skeleton className="mb-10 h-16 w-full" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
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
          <LinkButton to="/">← Գլխավոր</LinkButton>
        </div>

        {/* HEADER */}
        <div className="mb-10 flex flex-col gap-6 border-b border-border pb-7 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2.5 text-sm font-medium tracking-[0.16em] text-text-muted">
              Աշակերտի վահանակ
            </div>
            <h1 className="text-3xl font-semibold text-text sm:text-4xl">
              Բարի վերադարձ, {fullName.split(" ")[0]}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm font-semibold text-text">{fullName}</div>
              <div className="text-xs text-text-muted">{profile.grade ? `${profile.grade}-րդ դասարան` : profile.username}</div>
            </div>
            <Avatar src={profile.avatar} name={fullName} size="lg" />
          </div>
        </div>

        {/* TEACHERS */}
        <div className="mb-8">
          <div className="mb-3.5 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-text">
              <GraduationCap size={19} strokeWidth={1.75} className="text-text-muted" />
              Ուսուցիչներ
            </h2>
            <Button variant="secondary" size="sm" onClick={() => setTeachingOpen(true)}>
              Հրավերներ
            </Button>
          </div>
          {profile.teachers && profile.teachers.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {profile.teachers.map((t) => {
                const name = [t.first_name, t.last_name].filter(Boolean).join(" ") || t.username;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => navigate(`/profile/${t.id}`)}
                    className="flex items-center gap-3.5 rounded-full border border-border bg-surface py-2.5 pr-6 pl-2.5 text-left transition-colors hover:border-primary"
                  >
                    <Avatar src={t.avatar} name={name} size="md" />
                    <div>
                      <div className="text-base font-semibold text-text">{name}</div>
                      <div className="text-xs text-text-muted">@{t.username}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <EmptyState
              size="sm"
              title="Դեռ կապակցված ուսուցիչներ չկան"
              hint="Ուսուցչի հրավերները հայտնվում են «Հրավերներ» կոճակի տակ։"
            />
          )}
        </div>

        {/* STATS */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 2xl:grid-cols-[minmax(14rem,1.7fr)_1fr_1fr_1fr_minmax(9rem,1.2fr)]">
          {/* Full width until the five-across strip turns on, because this is
              the only cell with a chart in it: at one-of-three it measured a
              161px plot, and seven weekday labels do not fit in 161px. */}
          <Card className="col-span-2 flex flex-col justify-between gap-4 sm:col-span-3 2xl:col-span-1">
            <p className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-text-muted">
              <BarChart3 size={14} strokeWidth={1.75} /> Շաբաթական առաջընթաց
            </p>
            {activity ? <DailyProgressChart days={activity} /> : <Skeleton className="h-[90px] w-full" />}
          </Card>

          <StatTile icon={<Flame size={20} strokeWidth={1.75} />} value={`${profile.streak?.current_streak ?? 0}`} label="Հաջորդականություն" hint="օր անընդմեջ" size="hero" />

          <Card className="flex flex-col justify-between gap-4">
            <p className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-text-muted">
              <Target size={14} strokeWidth={1.75} /> Ճշգրտություն
            </p>
            <div className="flex items-center gap-3.5">
              <svg width="56" height="56" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r={ACCURACY_RING_R} fill="none" stroke="var(--color-border)" strokeWidth="4" />
                <circle
                  cx="28"
                  cy="28"
                  r={ACCURACY_RING_R}
                  fill="none"
                  stroke="var(--color-primary)"
                  strokeWidth="4"
                  strokeDasharray={ACCURACY_RING_CIRCUMFERENCE}
                  strokeDashoffset={accuracyOffset}
                  strokeLinecap="round"
                  transform="rotate(-90 28 28)"
                />
              </svg>
              <div className="text-2xl font-semibold text-text">{Math.round(accuracy)}%</div>
            </div>
          </Card>

          <Card className="flex flex-col justify-between gap-4">
            <p className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-text-muted">
              <Star size={14} strokeWidth={1.75} /> Մակարդակ
            </p>
            <div>
              <div className="text-2xl font-semibold text-text">{profile.level}-րդ մակարդակ</div>
              <div className="mt-2.5">
                <div className="h-2 w-full rounded-full bg-surface-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${xpPercent}%` }} />
                </div>
                <div className="mt-1.5 text-xs text-text-muted">
                  {profile.xp_into_level} / {profile.xp_for_next_level} XP
                </div>
              </div>
            </div>
          </Card>

          {profile.target_exam_date ? (
            <Card
              className="flex flex-col justify-between gap-4 border-none text-white"
              style={{ backgroundImage: "linear-gradient(226deg, #2563EB, #7F24B0, #FF5C8D)" }}
            >
              <p className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-white/70">
                <CalendarDays size={14} strokeWidth={1.75} /> Քննության ամսաթիվ
              </p>
              <div>
                <div className="text-3xl leading-none font-semibold">{Math.max(profile.days_until_exam ?? 0, 0)}</div>
                <div className="mt-1.5 text-xs opacity-70">
                  օր մնաց · {new Date(profile.target_exam_date).toLocaleDateString("hy-AM", { day: "numeric", month: "short" })}
                </div>
              </div>
            </Card>
          ) : (
            <Card className="flex flex-col justify-between gap-4">
              <p className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-text-muted">
                <CalendarDays size={14} strokeWidth={1.75} /> Քննության ամսաթիվ
              </p>
              {settingExamDate ? (
                <div className="flex flex-col gap-2">
                  {/* A short placeholder deliberately: this picker lives in one
                      cell of a five-across stat strip, and the default
                      "Ընտրիր ամսաթիվը" sets a min-content width that pushed the
                      whole row 37px past the viewport. */}
                  <DatePicker
                    value={examDateInput}
                    onChange={setExamDateInput}
                    label="Քննության ամսաթիվ"
                    placeholder="Ամսաթիվ"
                    clearable={false}
                  />
                  <Button size="sm" onClick={handleSetExamDate}>
                    Հաստատել
                  </Button>
                </div>
              ) : (
                <div>
                  <div className="mb-2 text-sm text-text-muted">Նշված չէ</div>
                  <Button variant="secondary" size="sm" onClick={() => setSettingExamDate(true)}>
                    Սահմանել ամսաթիվը
                  </Button>
                </div>
              )}
            </Card>
          )}
        </div>

        {/* ASSIGNMENTS */}
        <div className="mb-8">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="flex items-center gap-2 text-2xl font-semibold text-text">
              <BookOpen size={20} strokeWidth={1.75} className="text-text-muted" />
              Ակտիվ առաջադրանքներ <span className="text-sm font-normal text-text-muted">({activeAssignments.length})</span>
            </h2>
          </div>
          {assignments === null && <Skeleton className="h-40 w-full" />}
          {assignments !== null && activeAssignments.length === 0 && (
            <EmptyState tone="positive" title="Այլ ընթացիկ առաջադրանքներ չկան" />
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
            <h2 className="flex items-center gap-2 text-2xl font-semibold text-text">
              <Send size={20} strokeWidth={1.75} className="text-text-muted" />
              Ուղարկված առաջադրանքներ <span className="text-sm font-normal text-text-muted">({sentAssignments.length})</span>
            </h2>
          </div>
          {sentAssignments.length === 0 ? (
            <EmptyState title="Ուղարկված առաջադրանքներ դեռ չկան" />
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
          <h2 className="mb-5 flex items-center gap-2 text-2xl font-semibold text-text">
            <Trophy size={20} strokeWidth={1.75} className="text-text-muted" />
            Նվաճումներ
          </h2>
          {achievements === null && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          )}
          {achievements !== null && achievements.length === 0 && (
            <EmptyState tone="positive" title="Դեռ նվաճումներ չկան" hint="Շարունակիր սովորել՝ դրանք բացելու համար։" />
          )}
          {achievements !== null && achievements.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {achievements.map((ua) => (
                <div key={ua.id} className="flex items-start gap-3.5 rounded-[var(--radius-xl)] border border-border p-4.5">
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
    </div>
  );
}
