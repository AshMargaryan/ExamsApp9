import { useCallback, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AxiosError } from "axios";
import {
  Camera,
  ClipboardCheck,
  Lock,
  MessageSquareShare,
  MonitorSmartphone,
  Share2,
  Target,
  Users,
} from "lucide-react";
import * as profileApi from "../api/profile";
import type { Achievement, ActivityDay, Profile, ProfileAnalytics, UserAchievement } from "../api/profile";
import * as rankingsApi from "../api/rankings";
import type { RankingAward } from "../api/rankings";
import { useAuth } from "../auth/AuthContext";
import { useAsyncResource } from "../hooks/useAsyncResource";

import { ProfileHero } from "../components/profile/ProfileHero";
import { ProfileCompletionCard } from "../components/profile/ProfileCompletionCard";
import { AcademicIdentityCard } from "../components/profile/AcademicIdentityCard";
import { LearningDnaCard } from "../components/profile/LearningDnaCard";
import { AcademicPowerCard } from "../components/profile/AcademicPowerCard";
import { PerformanceOverview } from "../components/profile/PerformanceOverview";
import { PerformanceTrends } from "../components/profile/PerformanceTrends";
import { SubjectMasteryCard } from "../components/profile/SubjectMasteryCard";
import { StreakCard } from "../components/profile/StreakCard";
import { PersonalRecordsCard } from "../components/profile/PersonalRecordsCard";
import { AchievementsSection } from "../components/profile/AchievementsSection";
import { MonthlyRankingCard } from "../components/profile/MonthlyRankingCard";
import { RankingAwardsCard } from "../components/profile/RankingAwardsCard";
import { FriendsSection } from "../components/profile/FriendsSection";
import { TeachersSection } from "../components/profile/TeachersSection";
import { ActivityHeatmapSection } from "../components/profile/ActivityHeatmapSection";
import { ActivityTimeline } from "../components/profile/ActivityTimeline";
import { ShareProfileCard } from "../components/profile/ShareProfileCard";
import { ShareToChatModal } from "../components/chat/ShareToChatModal";
import { Dropdown } from "../components/ui/Dropdown";
import { ErrorState } from "../components/ui/ErrorState";
import { LinkButton } from "../components/ui/LinkButton";
import { Section } from "../components/ui/Section";
import { SectionNavBar, useScrollSpy, type SectionNavItem } from "../components/ui/SectionNav";
import { SkeletonCard } from "../components/ui/Skeleton";
import { StatTile } from "../components/ui/StatTile";
import { cn } from "../lib/cn";
import { scrollToElement } from "../lib/scrollToElement";

/*
  THE PROFILE
  ===========

  What was wrong, measured on a seeded account with real history:

  1. **5,776px of page, and three headings on it.** Sixteen analytics modules
     stacked in a dense two-column grid, every gap an identical `mt-6`, no
     grouping, no section headings, and no way to reach anything but by
     scrolling past everything before it. `ui/Section` and `ui/SectionNav`
     both already existed and neither was used here.

  2. **The same question answered twice, three times over.** The clearest
     case: `PerformanceOverview` printed the month's accuracy/questions/tests
     deltas as the change under each figure, and `GrowthCard` — ~1,900px
     lower — printed the *same three deltas* again as a list. Alongside that,
     `NextMissionCard` and `AiCoachCard` sat adjacent and both resolved to the
     same recommendation ("Վերանայեք «Անհավասարումներ» թեման"), which is also
     the dashboard's single hero CTA. This is the dashboard's
     duplicate-recommendation defect, on the other side of the app.

     Both mission cards are now off this page. The profile is the
     retrospective surface — "how have I been doing" — and the dashboard owns
     "what should I do next"; having the answer in two places is how it ends
     up phrased two different ways. `GrowthCard`'s one unique contribution,
     its plain-language verdict on the month, moved into
     `PerformanceOverview`, next to the numbers it is about.

  3. **Fifteen emoji as section iconography**, with 📈 doing duty for two
     different modules and 🏆 for two more, against a `lucide-react` icon
     language used consistently elsewhere. All of them are now lucide icons,
     via the shared `ProfileCard` header.

  4. **The page could hang on "Բեռնվում է..." forever.** Six unguarded
     `.then(setX)` calls with no `.catch`, no cleanup, and the whole page
     gated on `!profile`. Every one now goes through `useAsyncResource`, and
     failures degrade per region.

  The page now reads as five named sections with a sticky table of contents,
  in descending order of how often a student actually wants them.
*/

const STUDENT_SECTIONS: SectionNavItem[] = [
  { id: "profile-overview", label: "Ամփոփում" },
  { id: "profile-progress", label: "Առաջընթաց" },
  { id: "profile-achievements", label: "Նվաճումներ" },
  { id: "profile-activity", label: "Ակտիվություն" },
  { id: "profile-network", label: "Ցանց" },
];

function daysUntil(dateStr: string): number {
  const diffMs = new Date(dateStr).getTime() - Date.now();
  return diffMs > 0 ? Math.ceil(diffMs / (1000 * 60 * 60 * 24)) : 0;
}

/** A section that the sticky nav can reach. `tabIndex={-1}` is what lets
 *  `scrollToSection` move focus here, so keyboard users land where sighted
 *  users just scrolled instead of continuing from the nav. */
function AnchoredSection({
  id,
  title,
  description,
  children,
  spacing = "loose",
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  spacing?: "default" | "loose";
}) {
  return (
    <div id={id} tabIndex={-1} className="scroll-mt-24 outline-none">
      <Section title={title} description={description} spacing={spacing}>
        {children}
      </Section>
    </div>
  );
}

/** Parent accounts get the same brand band as students, but without the
 *  XP/streak/achievement furniture that does not describe how a parent uses
 *  Gitus. Kept separate rather than forced into ProfileHero's shape. */
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
    "w-full rounded-[var(--radius-md)] border border-on-brand-line bg-on-brand-fill px-3 py-2 text-on-brand placeholder-on-brand-muted outline-none backdrop-blur-md focus:border-on-brand";
  const glassLabelClass =
    "mb-1 block text-[length:var(--text-xs)] font-medium tracking-[var(--tracking-wide)] text-on-brand-muted";
  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(" ");

  return (
    <div className="relative isolate w-full overflow-hidden">
      {/* Theme-invariant brand band — see theme.css. The old version built its
          gradient from --color-primary, which inverts in dark mode and left
          this white text at roughly 2:1. */}
      <div className="absolute inset-0 -z-10" style={{ background: "var(--gradient-brand)" }} />

      <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
        <form onSubmit={handleSave}>
          <div className="flex items-center justify-end">
            {!editing ? (
              <button
                type="button"
                onClick={startEdit}
                className="rounded-[var(--radius-full)] border border-on-brand-line bg-on-brand-fill px-4 py-1.5 text-sm font-medium text-on-brand backdrop-blur-md transition-colors hover:bg-[color-mix(in_srgb,var(--color-on-brand)_22%,transparent)]"
              >
                Խմբագրել
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="rounded-[var(--radius-full)] border border-on-brand-line px-4 py-1.5 text-sm font-medium text-on-brand-muted transition-colors hover:bg-on-brand-fill"
                >
                  Չեղարկել
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-[var(--radius-full)] bg-on-brand px-4 py-1.5 text-sm font-semibold text-[var(--color-brand-2)] shadow-[var(--shadow-md)] disabled:opacity-60"
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
                className={cn(
                  "flex h-28 w-28 items-center justify-center overflow-hidden rounded-[var(--radius-full)]",
                  "border-4 border-on-brand-line bg-on-brand-fill text-4xl font-bold text-on-brand backdrop-blur-md",
                  editing ? "cursor-pointer" : "cursor-default",
                )}
              >
                {avatarPreview || profile.avatar ? (
                  <img src={avatarPreview ?? profile.avatar ?? undefined} alt={profile.username} className="h-full w-full object-cover" />
                ) : (
                  (profile.first_name || profile.username).slice(0, 1).toUpperCase()
                )}
              </button>
              {editing && (
                <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-[var(--radius-full)] bg-on-brand text-[var(--color-brand-2)] shadow-[var(--shadow-sm)]">
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
                  <h1 className="font-display text-[length:var(--text-4xl)] font-semibold leading-[var(--leading-display)] tracking-[var(--tracking-tight)] text-on-brand">
                    {fullName || profile.username}
                  </h1>
                  <p className="mt-1 text-lg text-on-brand-muted">@{profile.username}</p>
                  <p className="mt-1 flex items-center justify-center gap-1 text-sm text-on-brand-muted sm:justify-start">
                    <Users size={14} strokeWidth={1.75} /> Ծնող
                  </p>
                  {user?.email && <p className="mt-1 text-sm text-on-brand-muted">{user.email}</p>}
                </>
              ) : (
                <div className="grid gap-3 rounded-[var(--radius-lg)] border border-on-brand-line bg-on-brand-fill p-4 backdrop-blur-md sm:grid-cols-2">
                  <div>
                    <label className={glassLabelClass}>Օգտանուն</label>
                    <input
                      className={`${glassInputClass} ${usernameLocked ? "cursor-not-allowed opacity-60" : ""}`}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      disabled={usernameLocked}
                      required
                    />
                    {usernameLocked && (
                      <p className="mt-1 text-xs text-on-brand-muted">
                        Օգտանունը կրկին կարող ես փոխել {usernameDaysLeft} օրից։
                      </p>
                    )}
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
            <div className="mt-4 text-sm font-medium text-on-brand">
              <p role="alert">{error}</p>
              {usernameSuggestions && usernameSuggestions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {usernameSuggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => pickUsernameSuggestion(s)}
                      className="rounded-[var(--radius-full)] border border-on-brand-line bg-on-brand-fill px-2 py-1 text-xs text-on-brand backdrop-blur-md"
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
          className="mt-8 flex items-center justify-between rounded-[var(--radius-lg)] border border-on-brand-line bg-on-brand-fill p-5 backdrop-blur-md transition-colors hover:bg-[color-mix(in_srgb,var(--color-on-brand)_18%,transparent)]"
        >
          <span className="flex items-center gap-3 text-on-brand">
            <Users size={22} strokeWidth={1.75} />
            <span>
              <span className="block font-semibold">Ծնողական վահանակ</span>
              <span className="block text-sm text-on-brand-muted">Հետևեք երեխաների առաջընթացին</span>
            </span>
          </span>
          <span className="text-on-brand-muted">→</span>
        </Link>
      </div>
    </div>
  );
}

export function ProfilePage() {
  const { user, logout } = useAuth();
  const [shareOpen, setShareOpen] = useState(false);
  const [shareToChatOpen, setShareToChatOpen] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const profileResource = useAsyncResource<Profile>(useCallback(() => profileApi.fetchProfile(), []));
  const profile = profileResource.data;
  const isStudent = profile?.role === "student";

  // Analytics is five separate reads. Each is its own resource so one failing
  // endpoint takes down one card, not the page — the previous version blanked
  // everything on any failure of the first call.
  const analyticsResource = useAsyncResource<ProfileAnalytics | null>(
    useCallback(() => (isStudent ? profileApi.fetchAnalytics() : Promise.resolve(null)), [isStudent]),
    [isStudent],
  );
  const achievementsResource = useAsyncResource<Achievement[] | null>(
    useCallback(() => (isStudent ? profileApi.fetchAchievements() : Promise.resolve(null)), [isStudent]),
    [isStudent],
  );
  const myAchievementsResource = useAsyncResource<UserAchievement[] | null>(
    useCallback(() => (isStudent ? profileApi.fetchMyAchievements() : Promise.resolve(null)), [isStudent]),
    [isStudent],
  );
  const activityResource = useAsyncResource<ActivityDay[] | null>(
    useCallback(() => (isStudent ? profileApi.fetchActivityHeatmap() : Promise.resolve(null)), [isStudent]),
    [isStudent],
  );
  const awardsResource = useAsyncResource<RankingAward[] | null>(
    useCallback(() => (isStudent ? rankingsApi.fetchMyRankingAwards() : Promise.resolve(null)), [isStudent]),
    [isStudent],
  );

  const analytics = analyticsResource.data;
  const activityDays = activityResource.data;

  const sectionIds = useMemo(() => STUDENT_SECTIONS.map((s) => s.id), []);
  const activeSection = useScrollSpy(isStudent ? sectionIds : []);

  const scrollToHero = useCallback(() => scrollToElement(heroRef.current), []);

  if (profileResource.isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8" aria-busy="true">
        <SkeletonCard lines={6} />
        <div className="mt-[var(--section-gap)] grid gap-[var(--space-5)] sm:grid-cols-2">
          <SkeletonCard lines={4} />
          <SkeletonCard lines={4} />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-8">
        <ErrorState
          title="Չհաջողվեց բեռնել պրոֆիլը։"
          hint="Ստուգիր կապը և փորձիր կրկին։"
          onRetry={profileResource.retry}
        />
      </div>
    );
  }

  if (profile.role === "parent") {
    return (
      <div className="min-h-screen bg-bg">
        <div className="flex items-center justify-between px-4 py-4 sm:px-8">
          <LinkButton to="/family">← Ծնողական վահանակ</LinkButton>
          <div className="flex items-center gap-4">
            <Link to="/settings#devices" className="text-sm text-text-muted hover:text-primary">
              Ակտիվ սարքեր
            </Link>
            <button type="button" onClick={logout} className="text-sm text-text-muted hover:text-primary">
              Ելք
            </button>
          </div>
        </div>
        <ParentProfileCard profile={profile} onProfileUpdated={profileResource.setData} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      {/*
        The old header was four undifferentiated text links, two of which read
        "Կիսվել" and "Կիսվել → Չաթ" — near-identical labels side by side, for
        two destinations of one action. Sharing is now one control that asks
        where, and the account-level links moved into a menu so the row has
        one obvious primary thing in it.
      */}
      <div className="flex items-center justify-between gap-[var(--space-3)] px-4 py-4 sm:px-8">
        <LinkButton to="/">← Գլխավոր</LinkButton>
        <div className="flex items-center gap-[var(--space-2)]">
          {isStudent && (
            <Dropdown
              align="end"
              renderTrigger={(triggerProps) => (
                <button
                  type="button"
                  {...triggerProps}
                  className="flex items-center gap-[var(--space-2)] rounded-[var(--radius-md)] px-[var(--space-3)] py-[var(--space-2)] text-[length:var(--text-sm)] text-text-muted transition-colors hover:bg-surface-muted hover:text-text"
                >
                  <Share2 size={15} strokeWidth={1.75} /> Կիսվել
                </button>
              )}
              items={[
                {
                  key: "card",
                  label: "Պրոֆիլի քարտ",
                  icon: <Share2 size={15} strokeWidth={1.75} />,
                  onSelect: () => setShareOpen(true),
                },
                ...(user
                  ? [
                      {
                        key: "chat",
                        label: "Ուղարկել չաթում",
                        icon: <MessageSquareShare size={15} strokeWidth={1.75} />,
                        onSelect: () => setShareToChatOpen(true),
                      },
                    ]
                  : []),
              ]}
            />
          )}
          <Dropdown
            align="end"
            renderTrigger={(triggerProps) => (
              <button
                type="button"
                {...triggerProps}
                aria-label="Հաշվի կարգավորումներ"
                className="flex items-center gap-[var(--space-2)] rounded-[var(--radius-md)] px-[var(--space-3)] py-[var(--space-2)] text-[length:var(--text-sm)] text-text-muted transition-colors hover:bg-surface-muted hover:text-text"
              >
                <Lock size={15} strokeWidth={1.75} /> Հաշիվ
              </button>
            )}
            items={[
              {
                key: "privacy",
                label: "Գաղտնիություն",
                icon: <Lock size={15} strokeWidth={1.75} />,
                // Both of these used to be two different kinds of thing: an
                // overlay owned by this page, and a separate route. They are
                // two sections of one settings page now.
                onSelect: () => navigate("/settings#privacy"),
              },
              {
                key: "sessions",
                label: "Ակտիվ սարքեր",
                icon: <MonitorSmartphone size={15} strokeWidth={1.75} />,
                // navigate(), not location.href — a full page reload here
                // would throw away the whole SPA and re-fetch everything.
                onSelect: () => navigate("/settings#devices"),
              },
            ]}
          />
        </div>
      </div>

      <div ref={heroRef}>
        <ProfileHero
          profile={profile}
          achievements={achievementsResource.data ?? null}
          myAchievements={myAchievementsResource.data ?? null}
          onProfileUpdated={profileResource.setData}
        />
      </div>

      {isStudent && (
        <div className="sticky top-0 z-20 border-b border-border bg-bg/90 backdrop-blur">
          <div className="mx-auto max-w-6xl px-4 sm:px-8">
            <SectionNavBar items={STUDENT_SECTIONS} active={activeSection} className="border-b-0 bg-transparent" />
          </div>
        </div>
      )}

      <div className="mx-auto max-w-6xl px-4 pb-16 pt-[var(--space-6)] sm:px-8">
        {isStudent && (
          <>
            {profile.profile_completion.percent < 100 && (
              <ProfileCompletionCard completion={profile.profile_completion} onEdit={scrollToHero} />
            )}

            {/* ── Ամփոփում: the answer to "how am I doing", above the fold ── */}
            <AnchoredSection
              id="profile-overview"
              title="Ամփոփում"
              description="Քո ընթացիկ վիճակը մեկ հայացքով"
              spacing="default"
            >
              <div className="grid gap-[var(--space-5)]">
                {analyticsResource.error !== null && !analyticsResource.isLoading ? (
                  <ErrorState
                    title="Չհաջողվեց բեռնել վերլուծությունը։"
                    onRetry={analyticsResource.retry}
                  />
                ) : analyticsResource.isLoading ? (
                  <SkeletonCard lines={4} />
                ) : (
                  <>
                    {profile.stats && (
                      <PerformanceOverview stats={profile.stats} growth={analytics?.growth ?? null} />
                    )}
                    <div className="grid gap-[var(--space-5)] lg:grid-cols-2">
                      {analytics && <AcademicPowerCard power={analytics.academic_power} />}
                      {profile.streak && (
                        <StreakCard
                          currentStreak={profile.streak.current_streak}
                          longestStreak={profile.streak.longest_streak}
                        />
                      )}
                    </div>
                    {analytics && (
                      <AcademicIdentityCard
                        profile={profile}
                        subjectMastery={analytics.subject_mastery}
                        academicPower={analytics.academic_power}
                        onSetGoal={scrollToHero}
                      />
                    )}
                  </>
                )}
              </div>
            </AnchoredSection>

            {/* ── Առաջընթաց: how it has changed over time ── */}
            <AnchoredSection
              id="profile-progress"
              title="Առաջընթաց"
              description="Ինչպես է փոխվել քո պատրաստվածությունը ժամանակի ընթացքում"
            >
              <div className="grid gap-[var(--space-5)]">
                {analytics && <SubjectMasteryCard subjects={analytics.subject_mastery} />}
                <PerformanceTrends activityDays={activityDays} />
                {analytics && <LearningDnaCard dna={analytics.learning_dna} />}
              </div>
            </AnchoredSection>

            {/* ── Նվաճումներ ── */}
            <AnchoredSection
              id="profile-achievements"
              title="Նվաճումներ և դասակարգում"
              description="Ինչ եք բացել և ուր եք կանգնած մյուսների կողքին"
            >
              <div className="grid gap-[var(--space-5)]">
                <AchievementsSection
                  achievements={achievementsResource.data ?? null}
                  myAchievements={myAchievementsResource.data ?? null}
                  trophiesCount={profile.trophies_count}
                />
                <div className="grid gap-[var(--space-5)] lg:grid-cols-2">
                  <MonthlyRankingCard />
                  <RankingAwardsCard
                    awards={awardsResource.data ?? null}
                    isLoading={awardsResource.isLoading}
                    error={awardsResource.error}
                    onRetry={awardsResource.retry}
                  />
                </div>
                {analytics && <PersonalRecordsCard records={analytics.personal_records} />}
              </div>
            </AnchoredSection>

            {/* ── Ակտիվություն ── */}
            <AnchoredSection
              id="profile-activity"
              title="Ակտիվություն"
              description="Երբ եք սովորել, և ինչ եք արել"
            >
              <div className="grid gap-[var(--space-5)]">
                {activityResource.error !== null && !activityResource.isLoading ? (
                  <ErrorState
                    title="Չհաջողվեց բեռնել ակտիվության պատմությունը։"
                    onRetry={activityResource.retry}
                  />
                ) : (
                  <ActivityHeatmapSection activityDays={activityDays} />
                )}
                <ActivityTimeline />
              </div>
            </AnchoredSection>

            {/* ── Ցանց ── */}
            <AnchoredSection
              id="profile-network"
              title="Ուսումնական ցանց"
              description="Ում հետ եք սովորում"
            >
              <div className="grid gap-[var(--space-5)] lg:grid-cols-2">
                <FriendsSection />
                <TeachersSection profile={profile} onProfileChange={profileResource.retry} />
              </div>
            </AnchoredSection>
          </>
        )}

        {profile.role === "teacher" && (
          <Section title="Դասավանդում" description="Ձեր աշակերտների ամփոփ ցուցանիշները" spacing="tight">
            <div className="grid gap-[var(--space-5)]">
              {/* Was three tiles each with its own two-colour gradient bar,
                  hue assigned by source order rather than by meaning. They are
                  peers, so they now look like peers. */}
              <div className="grid grid-cols-1 gap-[var(--space-4)] sm:grid-cols-3">
                <StatTile
                  align="start"
                  icon={<Users size={20} strokeWidth={1.75} />}
                  label="Աշակերտներ"
                  value={String(profile.total_students ?? 0)}
                />
                <StatTile
                  align="start"
                  icon={<Target size={20} strokeWidth={1.75} />}
                  label="Ճշգրտության միջին առաջընթաց"
                  value={
                    profile.avg_student_accuracy_improvement !== null
                      ? `${profile.avg_student_accuracy_improvement}%`
                      : "—"
                  }
                />
                <StatTile
                  align="start"
                  icon={<ClipboardCheck size={20} strokeWidth={1.75} />}
                  label="Թեստերի միջին առաջընթաց"
                  value={
                    profile.avg_student_test_improvement !== null
                      ? `${profile.avg_student_test_improvement}%`
                      : "—"
                  }
                />
              </div>
              <TeachersSection profile={profile} onProfileChange={profileResource.retry} />
            </div>
          </Section>
        )}
      </div>

      {shareOpen && isStudent && (
        <ShareProfileCard
          profile={profile}
          academicPower={analytics?.academic_power ?? null}
          onClose={() => setShareOpen(false)}
        />
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
