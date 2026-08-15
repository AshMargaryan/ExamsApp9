import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { AxiosError } from "axios";
import { Camera, ClipboardCheck, Target, Users } from "lucide-react";
import * as profileApi from "../api/profile";
import type { Achievement, ActivityDay, Profile, ProfileAnalytics, UserAchievement } from "../api/profile";
import * as rankingsApi from "../api/rankings";
import type { RankingAward } from "../api/rankings";
import { useAuth } from "../auth/AuthContext";

import { ProfileHero } from "../components/profile/ProfileHero";
import { ProfileCompletionCard } from "../components/profile/ProfileCompletionCard";
import { AcademicIdentityCard } from "../components/profile/AcademicIdentityCard";
import { LearningDnaCard } from "../components/profile/LearningDnaCard";
import { AiCoachCard } from "../components/profile/AiCoachCard";
import { NextMissionCard } from "../components/profile/NextMissionCard";
import { AcademicPowerCard } from "../components/profile/AcademicPowerCard";
import { PerformanceOverview } from "../components/profile/PerformanceOverview";
import { PerformanceTrends } from "../components/profile/PerformanceTrends";
import { SubjectMasteryCard } from "../components/profile/SubjectMasteryCard";
import { StreakCard } from "../components/profile/StreakCard";
import { PersonalRecordsCard } from "../components/profile/PersonalRecordsCard";
import { GrowthCard } from "../components/profile/GrowthCard";
import { AchievementsSection } from "../components/profile/AchievementsSection";
import { MonthlyRankingCard } from "../components/profile/MonthlyRankingCard";
import { FriendsSection } from "../components/profile/FriendsSection";
import { TeachersSection } from "../components/profile/TeachersSection";
import { ActivityHeatmapSection } from "../components/profile/ActivityHeatmapSection";
import { ActivityTimeline } from "../components/profile/ActivityTimeline";
import { PrivacySettingsModal } from "../components/profile/PrivacySettingsModal";
import { ShareProfileCard } from "../components/profile/ShareProfileCard";
import { ShareToChatModal } from "../components/chat/ShareToChatModal";
import { LinkButton } from "../components/ui/LinkButton";

const RANK_MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

function daysUntil(dateStr: string): number {
  const diffMs = new Date(dateStr).getTime() - Date.now();
  return diffMs > 0 ? Math.ceil(diffMs / (1000 * 60 * 60 * 24)) : 0;
}

/** Parent accounts get their own full-bleed gradient hero — same premium
 * visual language as ProfileHero, but without XP/streak/achievements/school
 * fields that don't apply to how a parent uses Gitus. Kept as a separate
 * component rather than forced into ProfileHero's student/teacher shape. */
function ParentProfileCard({ profile, onProfileUpdated }: { profile: Profile; onProfileUpdated: (p: Profile) => void }) {
  const { user, refreshUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[] | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [username, setUsername] = useState(profile.username);
  const [firstName, setFirstName] = useState(profile.first_name);
  const [lastName, setLastName] = useState(profile.last_name);

  function startEdit() {
    setUsername(profile.username);
    setFirstName(profile.first_name);
    setLastName(profile.last_name);
    setEditing(true);
  }

  function closeError() {
    setError(null);
    setUsernameSuggestions(null);
  }

  function pickUsernameSuggestion(suggestion: string) {
    setUsername(suggestion);
    closeError();
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    closeError();
    setSaving(true);
    try {
      const updated = await profileApi.updateProfile({
        username, first_name: firstName, last_name: lastName, avatar: avatarFile ?? undefined,
      });
      onProfileUpdated(updated);
      setAvatarFile(null);
      setAvatarPreview(null);
      setEditing(false);
      await refreshUser();
    } catch (err) {
      if (err instanceof AxiosError && err.response?.data) {
        const data = err.response.data as Record<string, unknown>;
        const usernameErr = data.username;
        if (usernameErr && typeof usernameErr === "object" && !Array.isArray(usernameErr) && "suggestions" in usernameErr) {
          const { message, suggestions } = usernameErr as { message: string; suggestions: string[] };
          setError(message);
          setUsernameSuggestions(suggestions);
        } else {
          const firstError = Object.values(data).flat()[0];
          setError((firstError as string) ?? "Պահպանումը ձախողվեց։");
        }
      } else {
        setError("Պահպանումը ձախողվեց։");
      }
    } finally {
      setSaving(false);
    }
  }

  const usernameDaysLeft = daysUntil(profile.username_change_available_at);
  const usernameLocked = usernameDaysLeft > 0;
  const glassInputClass =
    "w-full rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-white placeholder-white/50 outline-none backdrop-blur-md focus:border-white/60 focus:bg-white/15";
  const glassLabelClass = "mb-1 block text-xs font-medium uppercase tracking-wide text-white/60";
  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(" ");

  return (
    <div className="relative isolate w-full overflow-hidden">
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(135deg, var(--color-primary) 0%, var(--color-accent) 55%, var(--color-primary-hover) 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute -right-24 -top-32 -z-10 h-96 w-96 rounded-full opacity-40 blur-3xl"
        style={{ background: "radial-gradient(circle, var(--color-medium) 0%, transparent 70%)" }}
      />

      <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
        <form onSubmit={handleSave}>
          <div className="flex items-center justify-end">
            {!editing ? (
              <button
                type="button"
                onClick={startEdit}
                className="rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-sm font-medium text-white backdrop-blur-md transition-colors hover:bg-white/20"
              >
                Խմբագրել
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="rounded-full border border-white/25 px-4 py-1.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/10"
                >
                  Չեղարկել
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-[var(--color-primary)] shadow-lg shadow-black/10 transition-transform hover:scale-105 disabled:opacity-60"
                >
                  {saving ? "..." : "Պահպանել"}
                </button>
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-col items-center gap-6 text-center sm:flex-row sm:items-center sm:text-left">
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => editing && fileInputRef.current?.click()}
                className={`flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-white/40 bg-white/15 text-4xl font-bold text-white shadow-[0_0_40px_rgba(255,255,255,0.25)] backdrop-blur-md ${editing ? "cursor-pointer" : "cursor-default"}`}
              >
                {avatarPreview || profile.avatar ? (
                  <img src={avatarPreview ?? profile.avatar ?? undefined} alt={profile.username} className="h-full w-full object-cover" />
                ) : (
                  (profile.first_name || profile.username).slice(0, 1).toUpperCase()
                )}
              </button>
              {editing && (
                <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-white text-[var(--color-primary)] shadow-md">
                  <Camera size={15} strokeWidth={1.75} />
                </span>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setAvatarFile(file);
                  setAvatarPreview(URL.createObjectURL(file));
                }}
              />
            </div>

            <div className="min-w-0 flex-1">
              {!editing ? (
                <>
                  <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">{fullName || profile.username}</h1>
                  <p className="mt-1 text-lg text-white/70">@{profile.username}</p>
                  <p className="mt-1 flex items-center gap-1 text-sm text-white/70">
                    <Users size={14} strokeWidth={1.75} /> Ծնող
                  </p>
                  {user?.email && <p className="mt-1 text-sm text-white/60">{user.email}</p>}
                </>
              ) : (
                <div className="grid gap-3 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-md sm:grid-cols-2">
                  <div>
                    <label className={glassLabelClass}>Օգտանուն</label>
                    <input
                      className={`${glassInputClass} ${usernameLocked ? "cursor-not-allowed opacity-60" : ""}`}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      disabled={usernameLocked}
                      required
                    />
                    {usernameLocked && <p className="mt-1 text-xs text-white/60">Օգտանունը կրկին կարող եք փոխել {usernameDaysLeft} օրից։</p>}
                  </div>
                  <div>
                    <label className={glassLabelClass}>Անուն</label>
                    <input className={glassInputClass} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                  </div>
                  <div>
                    <label className={glassLabelClass}>Ազգանուն</label>
                    <input className={glassInputClass} value={lastName} onChange={(e) => setLastName(e.target.value)} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {error && (
            <div className="mt-4 text-sm font-medium text-white">
              <p>{error}</p>
              {usernameSuggestions && usernameSuggestions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {usernameSuggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => pickUsernameSuggestion(s)}
                      className="rounded-full border border-white/30 bg-white/10 px-2 py-1 text-xs text-white backdrop-blur-md hover:bg-white/20"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </form>

        <Link
          to="/family"
          className="mt-8 flex items-center justify-between rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-md transition-colors hover:bg-white/15"
        >
          <span className="flex items-center gap-3 text-white">
            <Users size={22} strokeWidth={1.75} />
            <span>
              <span className="block font-semibold">Ծնողական վահանակ</span>
              <span className="block text-sm text-white/70">Հետևեք երեխաների առաջընթացին</span>
            </span>
          </span>
          <span className="text-white/70">→</span>
        </Link>
      </div>
    </div>
  );
}

export function ProfilePage() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [analytics, setAnalytics] = useState<ProfileAnalytics | null>(null);
  const [achievements, setAchievements] = useState<Achievement[] | null>(null);
  const [myAchievements, setMyAchievements] = useState<UserAchievement[] | null>(null);
  const [activityDays, setActivityDays] = useState<ActivityDay[] | null>(null);
  const [rankingAwards, setRankingAwards] = useState<RankingAward[] | null>(null);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareToChatOpen, setShareToChatOpen] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    profileApi.fetchProfile().then(setProfile);
  }, []);

  useEffect(() => {
    if (!profile || profile.role !== "student") return;
    profileApi.fetchAnalytics().then(setAnalytics);
    profileApi.fetchAchievements().then(setAchievements);
    profileApi.fetchMyAchievements().then(setMyAchievements);
    profileApi.fetchActivityHeatmap().then(setActivityDays);
    rankingsApi.fetchMyRankingAwards().then(setRankingAwards);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.role]);

  function refreshProfile() {
    profileApi.fetchProfile().then(setProfile);
  }

  function scrollToHero() {
    heroRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (!profile) {
    return <div className="p-8 text-lg text-text-muted">Բեռնվում է...</div>;
  }

  if (profile.role === "parent") {
    return (
      <div className="min-h-screen bg-bg">
        <div className="flex items-center justify-between px-4 py-4 sm:px-8">
          <LinkButton to="/family">← Ծնողական վահանակ</LinkButton>
          <div className="flex items-center gap-4">
            <Link to="/account/sessions" className="text-sm text-text-muted hover:text-primary">
              Ակտիվ սարքեր
            </Link>
            <button type="button" onClick={logout} className="text-sm text-text-muted hover:text-primary">
              Ելք
            </button>
          </div>
        </div>
        <ParentProfileCard profile={profile} onProfileUpdated={setProfile} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="flex items-center justify-between px-4 py-4 sm:px-8">
        <LinkButton to="/">← Գլխավոր</LinkButton>
        <div className="flex items-center gap-3">
          {profile.role === "student" && (
            <button type="button" onClick={() => setShareOpen(true)} className="text-sm text-text-muted hover:text-primary">
              Կիսվել
            </button>
          )}
          {profile.role === "student" && user && (
            <button type="button" onClick={() => setShareToChatOpen(true)} className="text-sm text-text-muted hover:text-primary">
              Կիսվել → Չաթ
            </button>
          )}
          <Link to="/account/sessions" className="text-sm text-text-muted hover:text-primary">
            Ակտիվ սարքեր
          </Link>
          <button type="button" onClick={() => setPrivacyOpen(true)} className="text-sm text-text-muted hover:text-primary">
            🔒 Գաղտնիություն
          </button>
        </div>
      </div>

      <div ref={heroRef}>
        <ProfileHero profile={profile} achievements={achievements} myAchievements={myAchievements} onProfileUpdated={setProfile} />
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
        {profile.role === "student" && (
          <>
            {profile.profile_completion.percent < 100 && (
              <div className="mt-4">
                <ProfileCompletionCard completion={profile.profile_completion} onEdit={scrollToHero} />
              </div>
            )}

            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <FriendsSection />
              <TeachersSection profile={profile} onProfileChange={refreshProfile} />
            </div>

            <div className="mt-6 grid gap-6 lg:grid-flow-row-dense lg:grid-cols-[1fr_360px]">
              <div className="min-w-0 lg:col-start-1">{analytics && <NextMissionCard mission={analytics.next_mission} />}</div>
              <div className="min-w-0 lg:col-start-1">{analytics && <AiCoachCard coach={analytics.coach} />}</div>
              <div className="min-w-0 lg:col-start-1">{analytics && <LearningDnaCard dna={analytics.learning_dna} />}</div>

              <div className="min-w-0 lg:col-start-2">
                {profile.streak && <StreakCard currentStreak={profile.streak.current_streak} longestStreak={profile.streak.longest_streak} />}
              </div>
              <div className="min-w-0 lg:col-start-2">{analytics && <AcademicPowerCard power={analytics.academic_power} />}</div>

              <div className="min-w-0 lg:col-start-1">{profile.stats && <PerformanceOverview stats={profile.stats} growth={analytics?.growth ?? null} />}</div>
              <div className="min-w-0 lg:col-start-1">
                <PerformanceTrends activityDays={activityDays} />
              </div>
              <div className="min-w-0 lg:col-start-1">{analytics && <SubjectMasteryCard subjects={analytics.subject_mastery} />}</div>
              <div className="min-w-0 lg:col-start-1">
                <AchievementsSection achievements={achievements} myAchievements={myAchievements} trophiesCount={profile.trophies_count} />
              </div>

              <div className="min-w-0 lg:col-start-1">
                {analytics && (
                  <AcademicIdentityCard profile={profile} subjectMastery={analytics.subject_mastery} academicPower={analytics.academic_power} onSetGoal={scrollToHero} />
                )}
              </div>
              <div className="min-w-0 lg:col-start-1">{analytics && <GrowthCard growth={analytics.growth} />}</div>

              <div className="min-w-0 lg:col-start-2">
                <MonthlyRankingCard />
              </div>
              <div className="min-w-0 lg:col-start-2">{analytics && <PersonalRecordsCard records={analytics.personal_records} />}</div>
              <div className="min-w-0 lg:col-start-2">
                <div className="rounded-[var(--radius)] border border-border bg-surface p-5">
                  <p className="mb-3 text-sm font-semibold text-text">🥇 Դասակարգման մեդալներ {rankingAwards ? `(${rankingAwards.length})` : ""}</p>
                  {rankingAwards === null && <p className="text-sm text-text-muted">Բեռնվում է...</p>}
                  {rankingAwards?.length === 0 && (
                    <p className="text-sm text-text-muted">Դեռ մեդալներ չկան։ Ամսվա վերջում թոփ 3-ի մեջ մտնողները ստանում են 🥇🥈🥉 մեդալ։</p>
                  )}
                  {rankingAwards && rankingAwards.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {rankingAwards.map((award) => (
                        <div key={award.id} title={award.title} className="rounded-[var(--radius)] border border-border bg-bg p-2 text-center">
                          <p className="text-xl">{RANK_MEDALS[award.rank] ?? "🏅"}</p>
                          <p className="mt-1 truncate text-xs font-medium text-text">{award.title}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="min-w-0 lg:col-start-1">
                <ActivityHeatmapSection activityDays={activityDays} />
              </div>
              <div className="min-w-0 lg:col-start-1">
                <ActivityTimeline />
              </div>
            </div>
          </>
        )}

        {profile.role === "teacher" && (
          <div className="mt-6 flex flex-col gap-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                { icon: <Users size={22} strokeWidth={1.75} />, label: "Աշակերտներ", value: String(profile.total_students ?? 0), gradient: "var(--color-primary), var(--color-accent)" },
                {
                  icon: <Target size={22} strokeWidth={1.75} />,
                  label: "Ճշգրտության միջին առաջընթաց",
                  value: profile.avg_student_accuracy_improvement !== null ? `${profile.avg_student_accuracy_improvement}%` : "—",
                  gradient: "var(--color-accent), var(--color-easy)",
                },
                {
                  icon: <ClipboardCheck size={22} strokeWidth={1.75} />,
                  label: "Թեստերի միջին առաջընթաց",
                  value: profile.avg_student_test_improvement !== null ? `${profile.avg_student_test_improvement}%` : "—",
                  gradient: "var(--color-medium), var(--color-primary)",
                },
              ].map((tile) => (
                <div key={tile.label} className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
                  <div className="h-1.5" style={{ backgroundImage: `linear-gradient(90deg, ${tile.gradient})` }} />
                  <div className="p-5">
                    <span className="text-2xl">{tile.icon}</span>
                    <p className="mt-2 text-3xl font-bold text-text">{tile.value}</p>
                    <p className="mt-1 text-sm text-text-muted">{tile.label}</p>
                  </div>
                </div>
              ))}
            </div>
            <TeachersSection profile={profile} onProfileChange={refreshProfile} />
          </div>
        )}
      </div>

      {privacyOpen && <PrivacySettingsModal onClose={() => setPrivacyOpen(false)} />}
      {shareOpen && profile.role === "student" && (
        <ShareProfileCard profile={profile} academicPower={analytics?.academic_power ?? null} onClose={() => setShareOpen(false)} />
      )}
      {shareToChatOpen && user && (
        <ShareToChatModal
          contextType="profile"
          contextId={user.id}
          title="Կիսվել պրոֆիլով չաթում"
          onClose={() => setShareToChatOpen(false)}
        />
      )}
    </div>
  );
}
