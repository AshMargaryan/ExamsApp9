import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { AxiosError } from "axios";
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
import { GoalsCard } from "../components/profile/GoalsCard";
import { AchievementsSection } from "../components/profile/AchievementsSection";
import { MonthlyRankingCard } from "../components/profile/MonthlyRankingCard";
import { FriendsSection } from "../components/profile/FriendsSection";
import { TeachersSection } from "../components/profile/TeachersSection";
import { ActivityHeatmapSection } from "../components/profile/ActivityHeatmapSection";
import { ActivityTimeline } from "../components/profile/ActivityTimeline";
import { PrivacySettingsModal } from "../components/profile/PrivacySettingsModal";
import { ShareProfileCard } from "../components/profile/ShareProfileCard";
import { StatTile } from "../components/ui/StatTile";

const RANK_MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

function daysUntil(dateStr: string): number {
  const diffMs = new Date(dateStr).getTime() - Date.now();
  return diffMs > 0 ? Math.ceil(diffMs / (1000 * 60 * 60 * 24)) : 0;
}

/** Parent accounts have a much smaller, bespoke identity card — not the
 * student/teacher gamification hero (no XP, streak, achievements, bio apply
 * to how a parent uses Gitus). Kept separate rather than forced into
 * ProfileHero's generic shape. */
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
  const inputClass = "w-full rounded-md border border-border bg-bg px-3 py-2 text-text outline-none focus:border-primary";
  const labelClass = "mb-1 block text-sm text-text-muted";
  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(" ");

  return (
    <form onSubmit={handleSave} className="rounded-[var(--radius)] border border-border bg-surface p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-end">
        {!editing ? (
          <button type="button" onClick={startEdit} className="rounded-md border border-primary px-4 py-1.5 text-sm font-medium text-primary hover:bg-surface-muted">
            Խմբագրել
          </button>
        ) : (
          <div className="flex gap-2">
            <button type="button" onClick={() => setEditing(false)} className="rounded-md border border-border px-4 py-1.5 text-sm font-medium text-text-muted hover:bg-surface-muted">
              Չեղարկել
            </button>
            <button type="submit" disabled={saving} className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-contrast hover:bg-primary-hover disabled:opacity-60">
              {saving ? "..." : "Պահպանել"}
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => editing && fileInputRef.current?.click()}
            className={`flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-muted text-3xl font-semibold text-text-muted ${editing ? "cursor-pointer" : "cursor-default"}`}
          >
            {avatarPreview || profile.avatar ? (
              <img src={avatarPreview ?? profile.avatar ?? undefined} alt={profile.username} className="h-full w-full object-cover" />
            ) : (
              (profile.first_name || profile.username).slice(0, 1).toUpperCase()
            )}
          </button>
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
        <div className="min-w-0 flex-1 text-center sm:text-left">
          {!editing ? (
            <>
              <h1 className="text-2xl font-semibold text-text">{fullName || profile.username}</h1>
              <p className="text-text-muted">@{profile.username}</p>
              {user?.email && <p className="mt-1 text-sm text-text-muted">{user.email}</p>}
            </>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Օգտանուն</label>
                <input className={`${inputClass} ${usernameLocked ? "cursor-not-allowed opacity-60" : ""}`} value={username} onChange={(e) => setUsername(e.target.value)} disabled={usernameLocked} required />
                {usernameLocked && <p className="mt-1 text-xs text-text-muted">Օգտանունը կրկին կարող եք փոխել {usernameDaysLeft} օրից։</p>}
              </div>
              <div>
                <label className={labelClass}>Անուն</label>
                <input className={inputClass} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Ազգանուն</label>
                <input className={inputClass} value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
            </div>
          )}
        </div>
      </div>
      {error && (
        <div className="mt-3 text-sm text-incorrect">
          <p>{error}</p>
          {usernameSuggestions && usernameSuggestions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {usernameSuggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => pickUsernameSuggestion(s)}
                  className="rounded-md border border-border bg-surface px-2 py-1 text-xs text-text hover:border-primary hover:text-primary"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </form>
  );
}

export function ProfilePage() {
  const { logout } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [analytics, setAnalytics] = useState<ProfileAnalytics | null>(null);
  const [achievements, setAchievements] = useState<Achievement[] | null>(null);
  const [myAchievements, setMyAchievements] = useState<UserAchievement[] | null>(null);
  const [activityDays, setActivityDays] = useState<ActivityDay[] | null>(null);
  const [rankingAwards, setRankingAwards] = useState<RankingAward[] | null>(null);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
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
      <div className="min-h-screen bg-bg px-4 py-8">
        <div className="mx-auto max-w-lg">
          <div className="mb-6 flex items-center justify-between">
            <Link to="/family" className="text-sm text-primary hover:underline">
              ← Ծնողական վահանակ
            </Link>
            <div className="flex items-center gap-4">
              <Link to="/account/sessions" className="text-sm text-primary hover:underline">
                Ակտիվ սարքեր
              </Link>
              <button type="button" onClick={logout} className="text-sm text-primary hover:underline">
                Ելք
              </button>
            </div>
          </div>
          <ParentProfileCard profile={profile} onProfileUpdated={setProfile} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/" className="text-sm text-primary hover:underline">
            ← Գլխավոր
          </Link>
          <div className="flex items-center gap-3">
            {profile.role === "student" && (
              <button type="button" onClick={() => setShareOpen(true)} className="text-sm text-text-muted hover:text-primary">
                Կիսվել
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

        {profile.role === "student" && (
          <>
            {profile.profile_completion.percent < 100 && (
              <div className="mt-4">
                <ProfileCompletionCard completion={profile.profile_completion} onEdit={scrollToHero} />
              </div>
            )}

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

              <div className="min-w-0 lg:col-start-2">
                <GoalsCard />
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
              <div className="min-w-0 lg:col-start-1">
                <FriendsSection />
              </div>
              <div className="min-w-0 lg:col-start-1">
                <TeachersSection profile={profile} onProfileChange={refreshProfile} />
              </div>
            </div>
          </>
        )}

        {profile.role === "teacher" && (
          <div className="mt-6 flex flex-col gap-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <StatTile label="Աշակերտներ" value={String(profile.total_students ?? 0)} />
              <StatTile
                label="Ճշգրտության միջին առաջընթաց"
                value={profile.avg_student_accuracy_improvement !== null ? `${profile.avg_student_accuracy_improvement}%` : "—"}
                hint="Շուտով"
              />
              <StatTile
                label="Թեստերի միջին առաջընթաց"
                value={profile.avg_student_test_improvement !== null ? `${profile.avg_student_test_improvement}%` : "—"}
                hint="Շուտով"
              />
            </div>
            <TeachersSection profile={profile} onProfileChange={refreshProfile} />
          </div>
        )}
      </div>

      {privacyOpen && <PrivacySettingsModal onClose={() => setPrivacyOpen(false)} />}
      {shareOpen && profile.role === "student" && (
        <ShareProfileCard profile={profile} academicPower={analytics?.academic_power ?? null} onClose={() => setShareOpen(false)} />
      )}
    </div>
  );
}
