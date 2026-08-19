import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  AlertTriangle, ArrowRight, BookOpen, CalendarDays, Circle, ClipboardCheck,
  Flame, Layers, ListTodo, Sparkles, Target, TrendingUp, Trophy,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import * as profileApi from "../api/profile";
import type { Profile } from "../api/profile";
import * as streaksApi from "../api/streaks";
import {
  getRecommendedExercises, getWeeklyProgress, TIER_LABELS,
  type RecommendedSubtopic,
} from "../api/practice";
import { useAsyncResource } from "../hooks/useAsyncResource";
import { WeeklyProgressChart } from "../components/WeeklyProgressChart";
import { DailyProblemCard } from "../components/DailyProblemCard";
import { TodayMissionHero } from "../components/TodayMissionHero";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { StatTile } from "../components/ui/StatTile";
import { Section } from "../components/ui/Section";
import { LinkButton } from "../components/ui/LinkButton";
import { ErrorState } from "../components/ui/ErrorState";
import { Skeleton, LoadingRegion } from "../components/ui/Skeleton";

/*
  The student dashboard.

  Structured around one question — "what should I do right now?" — answered
  once, in four zones of descending priority:

    1. Now         a single mission, with the coach's reasoning folded in
    2. Warm-up     the daily problem: a different activity, not a rival CTA
    3. Alternatives recommendations, for the student who rejects the suggestion
    4. Progress    retrospective, below the fold on purpose

  Before this restructure the page offered five modules that all answered that
  question, two of which (TodayMissionHero and HaygitInsightCard) resolved to
  the *same* mission and the same destination with different labels — while the
  mission's reason string was additionally printed a third time as greeting
  subtext. HaygitInsightCard now appears only on StudyPlanPage, where it is the
  primary content rather than a duplicate.
*/

function ExamDatePrompt({ onUpdated }: { onUpdated: (p: Profile) => void }) {
  const [date, setDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  async function handleSave() {
    if (!date) return;
    setSaving(true);
    setFailed(false);
    try {
      onUpdated(await profileApi.setExamDate(date));
    } catch {
      setFailed(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="rounded-[var(--radius-lg)]">
      <p className="flex items-center gap-[var(--space-2)] text-[length:var(--text-sm)] font-medium text-text">
        <Target size={16} strokeWidth={1.75} className="text-primary" />
        Երբ է ձեր ընդունելության քննությունը?
      </p>
      <p className="mt-[var(--space-1)] text-[length:var(--text-xs)] leading-[var(--leading-body)] text-text-muted">
        Ամսաթիվը նշելուց հետո կտեսնեք, թե որքան ժամանակ է մնացել։
      </p>
      <div className="mt-[var(--space-3)] flex flex-wrap gap-[var(--space-2)]">
        <input
          type="date"
          aria-label="Քննության ամսաթիվը"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="min-w-0 flex-1 rounded-[var(--radius-sm)] border border-border bg-surface px-[var(--space-3)] py-[var(--space-2)] text-[length:var(--text-sm)] text-text outline-none focus:border-primary"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !date}
          className="rounded-[var(--radius-sm)] bg-primary px-[var(--space-5)] py-[var(--space-2)] text-[length:var(--text-sm)] font-medium text-primary-contrast transition-colors hover:bg-primary-hover disabled:opacity-60"
        >
          {saving ? "Պահպանվում է..." : "Հաստատել"}
        </button>
      </div>
      {failed && (
        <p role="alert" className="mt-[var(--space-2)] text-[length:var(--text-xs)] text-incorrect">
          Չհաջողվեց պահպանել ամսաթիվը։ Փորձեք կրկին։
        </p>
      )}
    </Card>
  );
}

const quickActionIconProps = { size: 22, strokeWidth: 1.75 };

/*
  These six destinations all exist in the persistent desktop rail, so the grid
  is `lg:hidden` — it is genuinely useful only below the breakpoint where the
  rail disappears. The tiles previously carried four different accent hues
  assigned in source order; they are peers, and colouring them differently
  implied a categorisation that does not exist.
*/
const QUICK_ACTIONS = [
  { label: "AI Օգնական", href: "/assistant", icon: <Sparkles {...quickActionIconProps} /> },
  { label: "Իմ խնդիրները", href: "/todo", icon: <ListTodo {...quickActionIconProps} /> },
  { label: "Թեստեր", href: "/mock-exams", icon: <ClipboardCheck {...quickActionIconProps} /> },
  { label: "Պարապել", href: "/practice", icon: <BookOpen {...quickActionIconProps} /> },
  { label: "Բառաքարտեր", href: "/flashcards", icon: <Layers {...quickActionIconProps} /> },
  { label: "Վարկանիշներ", href: "/rankings", icon: <Trophy {...quickActionIconProps} /> },
];

function priorityTag(mistakeCount: number | null): { icon: React.ReactNode; label: string; tone: "neutral" | "primary" | "incorrect" } {
  if (mistakeCount === null) return { icon: <Circle size={12} strokeWidth={1.75} />, label: "Նոր", tone: "neutral" };
  if (mistakeCount >= 5) return { icon: <AlertTriangle size={12} strokeWidth={1.75} />, label: "Աշխատիր սրա վրա", tone: "incorrect" };
  return { icon: <ArrowRight size={12} strokeWidth={1.75} />, label: "Հաջորդը", tone: "primary" };
}

function RecommendedExerciseCard({ item }: { item: RecommendedSubtopic }) {
  const priority = priorityTag(item.mistake_count);
  return (
    <Link
      to={`/practice/subtopic/${item.subtopic_id}/${item.suggested_tier}`}
      state={{ subtopicName: item.subtopic_name }}
      className="flex flex-col gap-[var(--space-2)] rounded-[var(--radius-lg)] border border-border bg-surface p-[var(--space-5)] transition-[transform,box-shadow,border-color] duration-150 hover:-translate-y-0.5 hover:border-primary hover:shadow-[var(--shadow-md)]"
    >
      <div className="flex items-start justify-between gap-[var(--space-2)]">
        <p className="text-[length:var(--text-xs)] leading-[var(--leading-snug)] text-text-muted">
          {item.subject_name} · {item.domain_name} · {item.topic_name}
        </p>
        <Badge tone={priority.tone}>
          {priority.icon} {priority.label}
        </Badge>
      </div>
      <p className="font-medium leading-[var(--leading-snug)] text-text">{item.subtopic_name}</p>
      <div className="mt-[var(--space-1)] flex items-center justify-between gap-[var(--space-2)]">
        <span className="text-[length:var(--text-xs)] text-text-muted">
          {item.mistake_count === null ? "Դեռ չսկսված" : `Սխալների քանակ՝ ${item.mistake_count}`}
        </span>
        <span className="shrink-0 rounded-[var(--radius-full)] bg-surface-muted px-[var(--space-2)] py-0.5 text-[length:var(--text-xs)] font-medium text-primary">
          {TIER_LABELS[item.suggested_tier]}
        </span>
      </div>
    </Link>
  );
}

function DashboardSkeleton() {
  return (
    <LoadingRegion label="Գլխավոր էջը բեռնվում է">
      <Skeleton className="h-[var(--space-8)] w-[16rem]" />
      <Skeleton className="mt-[var(--space-2)] h-4 w-[22rem] max-w-full" />
      <div className="mt-[var(--space-5)] flex flex-wrap gap-[var(--space-3)]">
        <Skeleton className="h-11 w-[9rem] rounded-[var(--radius-full)]" />
        <Skeleton className="h-11 w-[13rem] rounded-[var(--radius-full)]" />
        <Skeleton className="h-11 w-[15rem] rounded-[var(--radius-full)]" />
      </div>
      <Skeleton className="mt-[var(--section-gap)] h-[16rem] w-full rounded-[var(--radius-xl)]" />
      <Skeleton className="mt-[var(--section-gap)] h-[12rem] w-full rounded-[var(--radius-lg)]" />
      <div className="mt-[var(--section-gap)] grid grid-cols-1 gap-[var(--space-4)] sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-[8.5rem] rounded-[var(--radius-lg)]" />
        ))}
      </div>
    </LoadingRegion>
  );
}

export function HomePage() {
  const { user } = useAuth();

  const profileRes = useAsyncResource(() => profileApi.fetchProfile());
  const streakRes = useAsyncResource(() => streaksApi.fetchStreak());
  const recommendedRes = useAsyncResource(() => getRecommendedExercises());
  const weeklyRes = useAsyncResource(() => getWeeklyProgress());
  const insightRes = useAsyncResource(() => profileApi.fetchHomeInsight());

  // Parent accounts land on the family dashboard, not the student practice
  // home — this only matters for direct nav/bookmarks, since login/register
  // already route parents to /family. Placed after the hooks above so hook
  // order never changes between renders.
  if (user?.role === "parent") return <Navigate to="/family" replace />;

  // Teachers land straight on the full dashboard — there's no separate
  // "teacher home" content to show first, so a lighter placeholder here
  // would just be an extra click in front of what they actually want.
  if (user?.role === "teacher") return <Navigate to="/teacher-dashboard" replace />;

  const profile = profileRes.data;
  const streak = streakRes.data;
  const insight = insightRes.data;
  const recommended = recommendedRes.data;

  const xpPercent =
    profile && profile.xp_for_next_level > 0
      ? Math.min(100, Math.round((profile.xp_into_level / profile.xp_for_next_level) * 100))
      : 100;
  const firstName = profile ? [profile.first_name, profile.last_name].filter(Boolean).join(" ").split(" ")[0] : "";
  const firstRecommendedHref =
    recommended && recommended.length > 0
      ? `/practice/subtopic/${recommended[0].subtopic_id}/${recommended[0].suggested_tier}`
      : "/practice";
  const weeklyStudyHours = profile?.stats ? profile.stats.weekly_study_seconds / 3600 : 0;

  return (
    <div className="min-h-screen bg-bg px-[var(--space-4)] py-[var(--space-6)] sm:px-[var(--space-6)]">
      <div className="mx-auto max-w-5xl">
        {profileRes.isLoading ? (
          <DashboardSkeleton />
        ) : profileRes.error || !profile ? (
          /* The profile call is the only genuinely load-bearing one — without it
             there is no dashboard to draw. Every other region degrades on its
             own below rather than taking the page down with it. */
          <ErrorState
            title="Չհաջողվեց բեռնել գլխավոր էջը։"
            hint="Ստուգեք ինտերնետ կապը և փորձեք կրկին։"
            onRetry={profileRes.retry}
          />
        ) : (
          <>
            <header>
              <h1 className="text-[length:var(--text-2xl)] font-semibold leading-[var(--leading-display)] tracking-[var(--tracking-tight)] text-text sm:text-[length:var(--text-3xl)]">
                Բարի վերադարձ{firstName ? `, ${firstName}` : ""}
              </h1>
              <p className="mt-[var(--space-1)] text-[length:var(--text-sm)] text-text-muted">
                {[
                  `@${profile.username}`,
                  profile.grade ? `${profile.grade}-րդ դասարան` : null,
                  profile.school?.name,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </header>

            {/* Status strip. The exam countdown lives here and ONLY here — it
                used to be repeated as a full card lower down the page. */}
            <div className="mt-[var(--space-5)] flex flex-wrap gap-[var(--space-3)]">
              <span className="flex items-center gap-[var(--space-2)] rounded-[var(--radius-full)] bg-surface px-[var(--space-4)] py-[var(--space-3)]">
                <Flame size={18} strokeWidth={1.75} className="text-text-muted" />
                <span className="text-[length:var(--text-sm)] text-text">
                  <strong>{streak?.current_streak ?? 0} օրյա</strong> շարք
                </span>
              </span>

              <span className="flex items-center gap-[var(--space-3)] rounded-[var(--radius-full)] bg-surface px-[var(--space-4)] py-[var(--space-3)]">
                <span className="text-[length:var(--text-sm)] text-text">
                  <strong>Level {profile.level}</strong>
                </span>
                <span
                  className="h-1.5 w-[70px] overflow-hidden rounded-[var(--radius-full)] bg-surface-muted"
                  role="progressbar"
                  aria-valuenow={xpPercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Մակարդակ ${profile.level}-ի առաջընթաց`}
                >
                  <span
                    className="block h-full rounded-[var(--radius-full)] bg-primary"
                    style={{ width: `${xpPercent}%` }}
                  />
                </span>
                <span className="text-[length:var(--text-xs)] tabular-nums text-text-muted">
                  {profile.xp_into_level}/{profile.xp_for_next_level} XP
                </span>
              </span>

              {profile.target_exam_date && (
                <Link
                  to="/profile"
                  className="flex items-center gap-[var(--space-2)] rounded-[var(--radius-full)] bg-surface px-[var(--space-4)] py-[var(--space-3)] transition-colors hover:bg-surface-muted"
                >
                  <CalendarDays size={18} strokeWidth={1.75} className="text-text-muted" />
                  <span className="text-[length:var(--text-sm)] text-text">
                    <strong>{Math.max(profile.days_until_exam ?? 0, 0)} օր</strong> մինչև քննությունը ·{" "}
                    {new Date(profile.target_exam_date).toLocaleDateString("hy-AM", { month: "long", day: "numeric" })}
                  </span>
                </Link>
              )}
            </div>

            {/* ── Zone 1: Now ────────────────────────────────────────────── */}
            <Section spacing="default">
              {insightRes.isLoading ? (
                <LoadingRegion label="Այսօրվա պարապմունքը բեռնվում է">
                  <Skeleton className="h-[16rem] w-full rounded-[var(--radius-xl)]" />
                </LoadingRegion>
              ) : insightRes.error ? (
                <ErrorState
                  title="Չհաջողվեց բեռնել այսօրվա պարապմունքը։"
                  hint="Մնացած բաժինները հասանելի են։"
                  onRetry={insightRes.retry}
                />
              ) : (
                <TodayMissionHero insight={insight} streak={streak} />
              )}
            </Section>

            {/* ── Zone 2: Warm-up ────────────────────────────────────────── */}
            <Section spacing="default">
              <DailyProblemCard nextHref={firstRecommendedHref} />
            </Section>

            {/* ── Zone 3: Alternatives ───────────────────────────────────── */}
            <Section
              spacing="loose"
              title="Առաջարկվող վարժություններ"
              description="Եթե այսօրվա առաջադրանքը քեզ չի համապատասխանում, ընտրիր այս թեմաներից որևէ մեկը։"
              action={
                <LinkButton to="/practice" iconRight={<ArrowRight size={14} strokeWidth={2} />}>
                  Բոլորը
                </LinkButton>
              }
            >
              {recommendedRes.isLoading ? (
                <LoadingRegion label="Առաջարկվող վարժությունները բեռնվում են">
                  <div className="grid grid-cols-1 gap-[var(--space-4)] sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 3 }, (_, i) => (
                      <Skeleton key={i} className="h-[8.5rem] rounded-[var(--radius-lg)]" />
                    ))}
                  </div>
                </LoadingRegion>
              ) : recommendedRes.error ? (
                <ErrorState
                  title="Չհաջողվեց բեռնել առաջարկները։"
                  size="sm"
                  onRetry={recommendedRes.retry}
                />
              ) : recommended && recommended.length > 0 ? (
                /* Capped at 3. The endpoint returns 5, which left the 3-column
                   grid with a ragged 3+2 row, and five near-identical cards is
                   more choice than this decision needs — the "Բոլորը" action
                   above leads to the full list. */
                <div className="grid grid-cols-1 gap-[var(--space-4)] sm:grid-cols-2 lg:grid-cols-3">
                  {recommended.slice(0, 3).map((item) => (
                    <RecommendedExerciseCard key={item.subtopic_id} item={item} />
                  ))}
                </div>
              ) : (
                <Card className="rounded-[var(--radius-lg)] border-dashed text-text-muted">
                  Հիանալի է! Դուք յուրացրել եք բոլոր հասանելի թեմաները։
                </Card>
              )}
            </Section>

            {/* Only shown when there is no date yet — once set, the countdown
                lives in the status strip above and this prompt disappears. */}
            {!profile.target_exam_date && (
              <Section spacing="default">
                <ExamDatePrompt onUpdated={profileRes.setData} />
              </Section>
            )}

            {/* ── Zone 4: Progress ───────────────────────────────────────── */}
            <Section
              spacing="loose"
              title={
                <span className="flex items-center gap-[var(--space-2)]">
                  <TrendingUp size={20} strokeWidth={1.75} /> Քո առաջընթացը
                </span>
              }
              description="Վերջին 8 շաբաթվա պարապմունքները։"
            >
              <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-[var(--space-6)] sm:p-[var(--space-7)]">
                <div className="mb-[var(--space-4)] flex items-center justify-end gap-[var(--space-3)] text-[length:var(--text-xs)] text-text-muted">
                  <span className="flex items-center gap-[var(--space-1)]">
                    <span className="h-2 w-2 rounded-[var(--radius-full)] bg-accent" /> Ճիշտ
                  </span>
                  <span className="flex items-center gap-[var(--space-1)]">
                    <span className="h-2 w-2 rounded-[var(--radius-full)] bg-border" /> Ընդհանուր
                  </span>
                </div>

                {weeklyRes.isLoading ? (
                  <LoadingRegion label="Առաջընթացը բեռնվում է">
                    <Skeleton className="h-[9rem] w-full" />
                  </LoadingRegion>
                ) : weeklyRes.error ? (
                  <ErrorState title="Չհաջողվեց բեռնել գրաֆիկը։" size="sm" onRetry={weeklyRes.retry} />
                ) : weeklyRes.data ? (
                  <WeeklyProgressChart points={weeklyRes.data} />
                ) : null}

                <div
                  className={`mt-[var(--space-5)] grid gap-[var(--space-3)] border-t border-border pt-[var(--space-5)] ${
                    weeklyStudyHours > 0 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2"
                  }`}
                >
                  <StatTile label="Ճշգրտություն" value={`${profile.stats?.accuracy_percentage ?? 0}%`} />
                  <StatTile label="Ավարտված թեստ" value={`${profile.stats?.tests_completed ?? 0}`} />
                  {weeklyStudyHours > 0 && (
                    <StatTile label="Այս շաբաթ" value={`${weeklyStudyHours.toFixed(1)} ժ`} />
                  )}
                </div>
              </div>
            </Section>

            {/* Below `lg` there is no navigation rail, so these are the only
                one-tap routes to the six main areas. Above it they would
                duplicate the rail exactly. */}
            <Section spacing="loose" className="lg:hidden">
              <div className="grid grid-cols-2 gap-[var(--space-4)] sm:grid-cols-3">
                {QUICK_ACTIONS.map((qa) => (
                  <Link
                    key={qa.href}
                    to={qa.href}
                    className="flex flex-col gap-[var(--space-3)] rounded-[var(--radius-lg)] border border-border bg-surface p-[var(--space-5)] transition-[transform,box-shadow,border-color] duration-150 hover:-translate-y-0.5 hover:border-primary hover:shadow-[var(--shadow-md)]"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-full)] bg-surface-muted text-primary">
                      {qa.icon}
                    </span>
                    <span className="text-[length:var(--text-sm)] font-semibold leading-[var(--leading-snug)] text-text">
                      {qa.label}
                    </span>
                  </Link>
                ))}
              </div>
            </Section>
          </>
        )}
      </div>
    </div>
  );
}
