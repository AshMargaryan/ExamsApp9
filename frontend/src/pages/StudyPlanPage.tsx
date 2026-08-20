import { useCallback, useEffect, useMemo, useState } from "react";
import { Flame, Hourglass, Play, Target } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import {
  getTodayPlan,
  submitTaskCheckIn,
  type CheckInFeeling,
  type DailyStudyPlan,
} from "../api/studyPlan";
import { fetchHomeInsight, fetchProfile, type HomeInsight, type Profile } from "../api/profile";
import { fetchSubjectMasteryScores, type MasteryScore } from "../api/knowledge";
import { GitusInsightCard } from "../components/GitusInsightCard";
import {
  ExamStrategyCard,
  LearningMapCard,
  MistakePatternCard,
  ReviewNudgeCard,
  TargetCard,
  WeekStoryCard,
  missionHrefFor,
} from "../components/study-plan/CoachCards";
import { DayCompleteDialog } from "../components/study-plan/DayCompleteDialog";
import { TaskJourney, taskStatuses } from "../components/study-plan/TaskJourney";
import { TodayProgress } from "../components/study-plan/TodayProgress";
import { formatMinutes, taskHref } from "../components/study-plan/planFormat";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { Skeleton } from "../components/ui/Skeleton";
import { LoadingRegion } from "../components/ui/Skeleton";

/*
  The day's coaching surface.

  Structure follows the one question that matters on opening it — "what do I do
  right now" — so the answer sits at the top of the left column with the only
  primary button above the fold, and everything else (progress, patterns, pace,
  the week) supports it underneath.

  The load is a real state machine. Previously three parallel requests were
  awaited with no `.catch`, so any one failing left the student on a shimmering
  skeleton forever with no way back; now a failure renders a retry.

  Subject mastery is fetched alongside the plan so the learning map can show
  strengths as well as gaps — it comes from the same Knowledge Engine endpoint
  the learning profile uses, so the two pages can't disagree.
*/

type Status = "loading" | "ready" | "error";

function PlanSkeleton() {
  return (
    <LoadingRegion label="Այսօրվա պլանը բեռնվում է" className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-9 w-2/3 max-w-sm" />
        <Skeleton className="h-5 w-full max-w-md" />
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-36" />
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="flex flex-col gap-4">
          <Skeleton className="h-44" />
          <Skeleton className="h-36" />
        </div>
      </div>
    </LoadingRegion>
  );
}

export function StudyPlanPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("loading");
  const [plan, setPlan] = useState<DailyStudyPlan | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [insight, setInsight] = useState<HomeInsight | null>(null);
  const [scores, setScores] = useState<MasteryScore[]>([]);
  const [summaryDismissed, setSummaryDismissed] = useState(false);

  const load = useCallback(() => {
    setStatus("loading");
    Promise.all([getTodayPlan(), fetchProfile(), fetchHomeInsight(), fetchSubjectMasteryScores()])
      .then(([planData, profileData, insightData, scoreData]) => {
        setPlan(planData);
        setProfile(profileData);
        setInsight(insightData);
        setScores(scoreData);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  useEffect(load, [load]);

  const statuses = useMemo(() => (plan ? taskStatuses(plan.tasks) : []), [plan]);

  const handleCheckIn = useCallback(async (taskId: number, feeling: CheckInFeeling) => {
    setPlan((prev) =>
      prev
        ? { ...prev, tasks: prev.tasks.map((t) => (t.id === taskId ? { ...t, check_in_feeling: feeling } : t)) }
        : prev,
    );
    try {
      await submitTaskCheckIn(taskId, feeling);
    } catch {
      setPlan((prev) =>
        prev
          ? { ...prev, tasks: prev.tasks.map((t) => (t.id === taskId ? { ...t, check_in_feeling: null } : t)) }
          : prev,
      );
    }
  }, []);

  if (status === "loading") return <PlanSkeleton />;

  if (status === "error" || !plan || !profile || !insight) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <ErrorState
          title="Չկարողացանք բեռնել այսօրվա պլանը։"
          hint="Սա սովորաբար ժամանակավոր խնդիր է։ Առաջընթացդ պահպանված է։"
          onRetry={load}
        />
      </div>
    );
  }

  const { coach } = plan;
  const activeIndex = statuses.indexOf("active");
  const activeTask = activeIndex >= 0 ? plan.tasks[activeIndex] : null;
  const allDone = plan.tasks.length > 0 && coach.today.done_count === coach.today.total_count;
  const missionHref = missionHrefFor(insight.next_mission);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-9">
      {/* ---- Hero: who, what today looks like, and the one action ---- */}
      <header className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
          <div className="max-w-xl">
            {/* Was "Բարի վերադարձ, {name}" — the dashboard's headline,
                verbatim, on a second page. Two routes titled the same thing
                leaves "where am I" answerable only by reading the whole
                screen. The plan's own name goes here; the greeting stays on
                the one page whose job is to greet. */}
            <h1 className="font-display text-[length:var(--text-3xl)] leading-[var(--leading-display)] font-semibold tracking-[var(--tracking-tight)] text-text">
              Ուսումնական պլան
            </h1>
            <p className="mt-2 text-[15px] leading-relaxed text-text-muted sm:text-base">{plan.headline}</p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {profile.streak && profile.streak.current_streak > 0 && (
              <span
                className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold"
                style={{
                  background: "color-mix(in srgb, var(--color-primary) 12%, var(--color-bg))",
                  color: "var(--color-primary)",
                }}
              >
                <Flame size={15} strokeWidth={2} />
                {profile.streak.current_streak} օր
              </span>
            )}
            {profile.days_until_exam !== null ? (
              <span
                className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold"
                style={{
                  background: "color-mix(in srgb, var(--color-purple) 14%, var(--color-bg))",
                  color: "var(--color-purple)",
                }}
              >
                <Hourglass size={15} strokeWidth={2} />
                {profile.days_until_exam} օր մինչև քննություն
              </span>
            ) : (
              <Link
                to="/learning-profile"
                className="flex items-center gap-1.5 rounded-full border border-dashed border-border px-3.5 py-2 text-sm font-medium text-text-muted transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Սահմանել քննության ամսաթիվը
              </Link>
            )}
          </div>
        </div>

        {activeTask && (
          <Button
            size="lg"
            className="mt-6 w-full sm:w-auto"
            onClick={() => navigate(taskHref(activeTask))}
            iconLeft={<Play size={17} strokeWidth={2.5} />}
          >
            Սկսել՝ {activeTask.title}
          </Button>
        )}
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr] lg:items-start lg:gap-7">
        {/* ---- Primary column: today's plan ---- */}
        <div className="flex min-w-0 flex-col gap-6">
          <section className="rounded-[var(--radius)] border border-border bg-surface p-5 sm:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-text">
                <Target size={18} strokeWidth={2} className="text-primary" />
                Այսօրվա պլանը
              </h2>
              <Badge tone={coach.today.priority === "high" ? "primary" : "neutral"}>
                {coach.today.priority === "high" ? "Բարձր առաջնահերթություն" : "Կանոնավոր տեմպ"}
              </Badge>
            </div>

            {plan.tasks.length === 0 ? (
              <EmptyState
                icon={<Target size={24} strokeWidth={1.75} />}
                title="Դեռ բավարար տվյալներ չկան անհատական պլան կազմելու համար"
                hint="Gitus-ը պլանը կառուցում է քո իրական սխալների ու թույլ թեմաների վրա։ Լուծիր մի քանի վարժություն, և վաղը այստեղ կլինի կոնկրետ ցուցակ։"
                cta={{ label: "Սկսել վարժություններից", onClick: () => navigate("/subjects") }}
              />
            ) : (
              <>
                <dl className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="rounded-[var(--radius)] bg-surface-muted px-3.5 py-3">
                    <dt className="text-[10.5px] font-semibold tracking-[0.08em] text-text-muted">ԸՆԴԱՄԵՆԸ</dt>
                    <dd className="mt-1 text-base font-bold text-text">
                      {formatMinutes(coach.today.minutes_total)}
                    </dd>
                  </div>
                  <div className="rounded-[var(--radius)] bg-surface-muted px-3.5 py-3">
                    <dt className="text-[10.5px] font-semibold tracking-[0.08em] text-text-muted">ԿԱՐԳԱՎԻՃԱԿ</dt>
                    <dd className="mt-1 text-base font-bold text-text">
                      {coach.today.done_count} / {coach.today.total_count}
                    </dd>
                  </div>
                  <div className="col-span-2 rounded-[var(--radius)] bg-surface-muted px-3.5 py-3 sm:col-span-1">
                    <dt className="text-[10.5px] font-semibold tracking-[0.08em] text-text-muted">
                      ԱԿՆԿԱԼՎՈՂ ԱՐԴՅՈՒՆՔ
                    </dt>
                    <dd className="mt-1 line-clamp-2 text-[13px] font-semibold leading-snug text-text">
                      {coach.today.expected_result}
                    </dd>
                  </div>
                </dl>

                <TaskJourney tasks={plan.tasks} statuses={statuses} onCheckIn={handleCheckIn} />
              </>
            )}
          </section>

          {plan.tasks.length > 0 && <TodayProgress today={coach.today} />}

          <MistakePatternCard coach={insight.coach} missionHref={missionHref} />
        </div>

        {/* ---- Coach column ---- */}
        <div className="flex min-w-0 flex-col gap-5">
          <GitusInsightCard
            coach={insight.coach}
            mission={insight.next_mission}
            personalizedMessage={plan.coach_message}
          />
          {coach.strategy && <ExamStrategyCard strategy={coach.strategy} />}
          <TargetCard profile={profile} />
          {coach.review && <ReviewNudgeCard review={coach.review} />}
          <LearningMapCard scores={scores} />
          <WeekStoryCard week={coach.week} report={coach.weekly_report} />
        </div>
      </div>

      <DayCompleteDialog
        open={allDone && !summaryDismissed}
        onOpenChange={(open) => !open && setSummaryDismissed(true)}
        today={coach.today}
      />
    </div>
  );
}
