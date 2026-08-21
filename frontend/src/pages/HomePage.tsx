import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  AlertTriangle, ArrowRight, BookOpen, CalendarDays, Circle, ClipboardCheck,
  Flame, Layers, ListTodo, Sparkles, Target, Trophy,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import * as profileApi from "../api/profile";
import type { Profile } from "../api/profile";
import * as streaksApi from "../api/streaks";
import {
  getRecommendedExercises, getWeeklyProgress, TIER_LABELS,
  type RecommendedSubtopic, type WeeklyProgressPoint,
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
import { PageHeader } from "../components/ui/PageHeader";
import { cn } from "../lib/cn";

/** One shape for the three facts at the top of the dashboard. */
const STATUS_CHIP = cn(
  "flex items-center gap-[var(--space-2)] rounded-[var(--radius-full)]",
  "border border-border bg-surface",
  // Tighter on a phone: at full desktop padding these three chips stacked into
  // three near-full-width rows and pushed the mission band — the one thing the
  // page exists to show — below the fold at 375px.
  "px-[var(--space-3)] py-[var(--space-2)] sm:px-[var(--space-4)] sm:py-[var(--space-3)]",
);

/*
  The student dashboard.

  Structured around one question — "what should I do right now?" — answered
  once, in four zones of descending priority:

    1. Now         a single mission, with the coach's reasoning folded in
    2. Warm-up     the daily problem: a different activity, not a rival CTA
    3. Alternatives recommendations, for the student who rejects the suggestion
    4. Progress    retrospective, below the fold on purpose

  Before this restructure the page offered five modules that all answered that
  question, two of which (TodayMissionHero and GitusInsightCard) resolved to
  the *same* mission and the same destination with different labels — while the
  mission's reason string was additionally printed a third time as greeting
  subtext. GitusInsightCard now appears only on StudyPlanPage, where it is the
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
        Ե՞րբ է քո ընդունելության քննությունը։
      </p>
      <p className="mt-[var(--space-1)] text-[length:var(--text-xs)] leading-[var(--leading-body)] text-text-muted">
        Ամսաթիվը նշելուց հետո կտեսնես, թե որքան ժամանակ է մնացել։
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
          Չհաջողվեց պահպանել ամսաթիվը։ Փորձիր կրկին։
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


/*
  The student's accuracy in their most recent active week, against the average
  of the active weeks before it. Deliberately compares like with like — weeks
  where nothing was solved are skipped rather than counted as 0%, which would
  make a break from studying look like a collapse in ability.

  Returns null unless there are at least two active weeks and enough questions
  in them to mean anything: a delta computed from three answers is noise
  presented as a trend.
*/
const MIN_QUESTIONS_FOR_TREND = 5;

function accuracyTrendFrom(points: WeeklyProgressPoint[] | null): { delta: string } | null {
  if (!points) return null;
  const active = points.filter((p) => p.solved > 0);
  if (active.length < 2) return null;

  const latest = active[active.length - 1];
  const earlier = active.slice(0, -1);
  const earlierSolved = earlier.reduce((sum, p) => sum + p.solved, 0);
  if (latest.solved < MIN_QUESTIONS_FOR_TREND || earlierSolved < MIN_QUESTIONS_FOR_TREND) return null;

  const latestAccuracy = (latest.correct / latest.solved) * 100;
  const earlierAccuracy = (earlier.reduce((sum, p) => sum + p.correct, 0) / earlierSolved) * 100;
  const delta = latestAccuracy - earlierAccuracy;
  if (Math.abs(delta) < 1) return null;

  return { delta: `${delta > 0 ? "+" : "−"}${Math.abs(delta).toFixed(1)}% այս շաբաթ` };
}

function RecommendedExerciseCard({ item }: { item: RecommendedSubtopic }) {
  const priority = priorityTag(item.mistake_count);
  return (
    <Link
      to={`/practice/subtopic/${item.subtopic_id}/${item.suggested_tier}`}
      state={{ subtopicName: item.subtopic_name }}
      className="flex flex-col gap-[var(--space-2)] rounded-[var(--radius-lg)] border border-border bg-surface p-[var(--space-5)] transition-[transform,box-shadow,border-color] duration-150 hover:-translate-y-0.5 hover:border-primary hover:shadow-[var(--shadow-md)]"
    >
      {/* The subtopic name is what the student is actually choosing between, so
          it leads. The subject/domain/topic breadcrumb used to sit above it in
          three lines of small grey text, which inverted the hierarchy — the
          metadata dominated the card and the choice itself came second. It is
          now a single clamped line of context underneath. */}
      <div className="flex items-start justify-between gap-[var(--space-2)]">
        <p className="font-medium leading-[var(--leading-snug)] text-text">{item.subtopic_name}</p>
        <Badge tone={priority.tone}>
          {priority.icon} {priority.label}
        </Badge>
      </div>
      <p className="line-clamp-2 text-[length:var(--text-xs)] leading-[var(--leading-snug)] text-text-muted">
        {item.subject_name} · {item.domain_name} · {item.topic_name}
      </p>
      {/* The difficulty used to be a filled primary-text pill in the card's
          bottom-right corner — the canonical position and shape of a button,
          for a label that is not one. The whole card is the link, so the
          corner now says so, and the tier joins the other metadata on the
          left where it belongs. */}
      <div className="mt-auto flex items-center justify-between gap-[var(--space-2)] border-t border-border pt-[var(--space-3)]">
        <span className="min-w-0 truncate text-[length:var(--text-xs)] text-text-muted">
          {TIER_LABELS[item.suggested_tier]}
          {item.mistake_count === null ? " · Դեռ չսկսված" : ` · ${item.mistake_count} սխալ`}
        </span>
        <span className="flex shrink-0 items-center gap-1 text-[length:var(--text-xs)] font-semibold text-primary">
          Սկսել <ArrowRight size={13} strokeWidth={2} aria-hidden />
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
  const accuracyTrend = accuracyTrendFrom(weeklyRes.data);

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
            hint="Ստուգիր ինտերնետ կապը և փորձիր կրկին։"
            onRetry={profileRes.retry}
          />
        ) : (
          <>
            {/* `PageHeader`, not a hand-rolled h1. The dashboard was rebuilt
                before the display face existed, so its h1 was set in the body
                face while the `Section` headings *below* it were serif — the
                page's most important line was the least distinctive thing on
                it. Every other page in the product opens this way. */}
            <PageHeader
              title={`Բարի վերադարձ${firstName ? `, ${firstName}` : ""}`}
              description={[
                `@${profile.username}`,
                profile.grade ? `${profile.grade}-րդ դասարան` : null,
                profile.school?.name,
              ]
                .filter(Boolean)
                .join(" · ")}
              className="mb-[var(--space-5)]"
            />

            {/* Status strip. The exam countdown lives here and ONLY here — it
                used to be repeated as a full card lower down the page.

                These carry the border token now. Borderless `bg-surface` on
                `bg-bg` is a 1.15:1 step in dark mode, so three chips that are
                meant to read as objects read as loose floating text instead —
                and they were the only surface elements in the product with no
                edge at all. */}
            <div className="flex flex-wrap gap-[var(--space-3)]">
              <span className={STATUS_CHIP}>
                <Flame size={18} strokeWidth={1.75} className="text-text-muted" />
                <span className="text-[length:var(--text-sm)] text-text">
                  <strong>{streak?.current_streak ?? 0} օրյա</strong> շարք
                </span>
              </span>

              <span className={cn(STATUS_CHIP, "gap-[var(--space-3)]")}>
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
                  className={cn(STATUS_CHIP, "transition-colors hover:border-primary-line hover:bg-surface-muted")}
                >
                  <CalendarDays size={18} strokeWidth={1.75} className="text-text-muted" />
                  <span className="text-[length:var(--text-sm)] text-text">
                    <strong>{Math.max(profile.days_until_exam ?? 0, 0)} օր</strong> մինչև քննությունը
                    {/* The exact date is context, not the headline, and it is
                        what made this chip too wide to share a row on a
                        phone. The day count is the thing being tracked. */}
                    <span className="hidden sm:inline">
                      {" · "}
                      {new Date(profile.target_exam_date).toLocaleDateString("hy-AM", {
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
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
                  Հիանալի՜ է։ Յուրացրել ես բոլոր հասանելի թեմաները։
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
              /* No leading icon: the other section headings have none, and a
                 TrendingUp glyph here would be decoration rather than meaning. */
              title="Քո առաջընթացը"
              description="Վերջին 8 շաբաթվա պարապմունքները։"
            >
              <div className="rounded-[var(--radius-xl)] border border-border bg-surface p-[var(--space-6)] sm:p-[var(--space-7)]">
                {/* "Ճիշտ / Ընդհանուր" was wrong as well as hard to see: the
                    two swatches are the two *parts* of a bar, so the second one
                    is the incorrect remainder, not the total. */}
                <div className="mb-[var(--space-4)] flex items-center justify-end gap-[var(--space-3)] text-[length:var(--text-xs)] text-text-muted">
                  <span className="flex items-center gap-[var(--space-1)]">
                    <span className="h-2 w-2 rounded-[var(--radius-full)] bg-primary" /> Ճիշտ
                  </span>
                  <span className="flex items-center gap-[var(--space-1)]">
                    <span className="h-2 w-2 rounded-[var(--radius-full)] bg-primary/25" /> Սխալ
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
                  {/* An accuracy figure with nothing beside it is a verdict,
                      not information — a student reading "14.3%" cold has no
                      way to tell whether that is improving, what it counts, or
                      what to do about it. The weekly series already on this
                      page supplies the only comparison that is honest and
                      always available: the student against their own earlier
                      weeks. When there are not two active weeks to compare,
                      the tile at least says what the number covers. */}
                  <StatTile
                    label="Ճշգրտություն"
                    value={`${profile.stats?.accuracy_percentage ?? 0}%`}
                    delta={accuracyTrend?.delta}
                    hint={accuracyTrend ? undefined : "Բոլոր լուծված հարցերի հաշվով"}
                  />
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
