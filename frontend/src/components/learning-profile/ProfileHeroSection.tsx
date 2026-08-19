import { ArrowRight, Check, Target } from "lucide-react";
import { Link } from "react-router-dom";
import { SUBJECTS } from "../../lib/subjects";
import { MASTERY_BAND_COLOR, MASTERY_BAND_LABEL, masteryBand } from "../../lib/mastery";
import { Button } from "../ui/Button";
import { ErrorState } from "../ui/ErrorState";
import { Metric } from "../ui/Metric";
import { ProgressRing } from "../ui/ProgressRing";
import { Skeleton } from "../ui/Skeleton";
import { scrollToSection } from "../ui/SectionNav";
import {
  completenessSteps,
  focusedAverageMastery,
  hasDeclaredAvailability,
  hasChosenCadence,
  nextUpcomingExam,
  useLearningProfileData,
} from "./LearningProfileData";

/*
  The page's answer to "where am I, where am I going, what should I do next" —
  in that order, above the fold.

  The old hero carried a decorative orbit of all five subject glyphs whether or
  not the student studied them. It's replaced by the subjects they actually
  chose, each showing its real score, because that is what the average in the
  ring is made of. If a visual can't be made to mean something, it shouldn't
  survive a redesign.
*/

function HeroSkeleton() {
  return (
    <div className="rounded-[calc(var(--radius)*1.15)] border border-border bg-surface p-7 sm:p-9">
      <div className="grid gap-8 sm:grid-cols-[1.15fr_auto]">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-11 w-52" />
          <div className="mt-2 flex gap-8">
            <Skeleton className="h-12 w-20" />
            <Skeleton className="h-12 w-20" />
            <Skeleton className="h-12 w-20" />
          </div>
        </div>
        <Skeleton className="mx-auto hidden h-[172px] w-[172px] rounded-full sm:block" />
      </div>
    </div>
  );
}

export function ProfileHeroSection() {
  const { status, reload, interests, scores, goals, exams, availability, coachPreferences } =
    useLearningProfileData();

  if (status === "loading") return <HeroSkeleton />;
  if (status === "error") {
    return (
      <ErrorState
        title="Չհաջողվեց բեռնել քո ուսումնական պրոֆիլը։"
        hint="Սա սովորաբար ժամանակավոր խնդիր է։ Տվյալներդ տեղում են։"
        onRetry={reload}
      />
    );
  }

  const overallMastery = focusedAverageMastery(interests, scores);
  const next = nextUpcomingExam(exams);
  const activeGoals = goals.filter((g) => !g.completed_at);

  const steps = completenessSteps({
    interests,
    goals,
    exams,
    hasAvailability: hasDeclaredAvailability(availability),
    hasCadence: hasChosenCadence(coachPreferences),
  });
  const doneSteps = steps.filter((s) => s.done);
  const completionPct = Math.round((doneSteps.length / steps.length) * 100);
  const firstMissing = steps.find((s) => !s.done);

  const scoreByKey = new Map(scores.map((s) => [s.subject_key, s]));
  const focused = interests
    .filter((i) => i.is_active)
    .map((i) => ({
      meta: SUBJECTS.find((s) => s.key === i.subject_key),
      score: scoreByKey.get(i.subject_key)?.mastery_score ?? null,
    }))
    .filter((f) => f.meta)
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1));

  return (
    <div className="lp-rise-in relative overflow-hidden rounded-[calc(var(--radius)*1.15)] border border-border bg-surface">
      <div
        className="pointer-events-none absolute -top-32 -right-24 h-72 w-72 rounded-full opacity-25 blur-3xl"
        style={{ background: "var(--color-primary)" }}
        aria-hidden="true"
      />

      <div className="relative grid items-center gap-8 p-7 sm:p-9 lg:grid-cols-[1.15fr_auto]">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-text-muted">ՈՒՍՈՒՄՆԱԿԱՆ ՊՐՈՖԻԼ</p>
          <h1 className="mt-2 flex items-center gap-2.5 text-[26px] leading-tight font-semibold text-text sm:text-[32px]">
            <Target size={26} strokeWidth={1.75} className="shrink-0 text-primary" />
            Իմ ուսումնական պրոֆիլը
          </h1>
          <p className="mt-2 max-w-lg text-[15px] leading-relaxed text-text-muted">
            Այստեղ Haygit-ը սովորում է քեզ ճանաչել՝ առարկաներդ, նպատակներդ, քննություններդ և
            ժամանակդ։ Ինչքան շատ գիտի, այնքան ճշգրիտ է քո ամենօրյա պլանը։
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {firstMissing ? (
              <Button
                size="md"
                onClick={() => scrollToSection(firstMissing.target)}
                iconRight={<ArrowRight size={16} strokeWidth={2} />}
              >
                {firstMissing.label}
              </Button>
            ) : (
              <Link
                to="/study-plan"
                className="inline-flex h-11 items-center gap-2 rounded-[var(--radius)] bg-primary px-5 text-[15px] font-medium text-primary-contrast shadow-sm transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
              >
                Անցնել այսօրվա պլանին
                <ArrowRight size={16} strokeWidth={2} />
              </Link>
            )}
            {firstMissing && (
              <Link
                to="/study-plan"
                className="text-sm font-medium text-text-muted underline-offset-4 transition-colors hover:text-primary hover:underline"
              >
                Այսօրվա պլանը →
              </Link>
            )}
          </div>

          <div className="mt-7 flex flex-wrap gap-x-9 gap-y-4">
            <Metric
              label="միջին իմացություն"
              value={overallMastery != null ? `${overallMastery}%` : "—"}
              hint={overallMastery != null ? `${focused.length} ընտրված առարկա` : "ընտրիր առարկա"}
              size="lg"
            />
            <Metric
              label="ակտիվ նպատակ"
              value={activeGoals.length}
              hint={activeGoals.length === 0 ? "դեռ չկա" : undefined}
              size="lg"
            />
            <Metric
              label="հաջորդ քննությունը"
              value={next ? `${next.daysLeft} օր` : "—"}
              hint={next ? next.exam.name : "դեռ չկա"}
              size="lg"
              tone={next && next.daysLeft <= 10 ? "incorrect" : "default"}
            />
          </div>
        </div>

        <div className="mx-auto flex flex-col items-center gap-4">
          <ProgressRing value={overallMastery} size={172} thickness={11} label="Միջին իմացություն">
            <span className="text-[34px] leading-none font-semibold tabular-nums text-text">
              {overallMastery != null ? `${overallMastery}%` : "—"}
            </span>
            <span className="mt-1.5 max-w-[104px] text-[11px] leading-snug text-text-muted">
              {overallMastery != null ? "միջին իմացություն" : "տվյալներ դեռ չկան"}
            </span>
          </ProgressRing>

          {focused.length > 0 && (
            <ul className="flex max-w-[260px] flex-wrap justify-center gap-1.5">
              {focused.map((f) => {
                const band = masteryBand(f.score);
                return (
                  <li
                    key={f.meta!.key}
                    className="flex items-center gap-1.5 rounded-full border border-border bg-bg px-2.5 py-1 text-[11px]"
                    title={`${f.meta!.label} — ${MASTERY_BAND_LABEL[band]}`}
                  >
                    <span
                      aria-hidden
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: MASTERY_BAND_COLOR[band] }}
                    />
                    <span className="text-text-muted">{f.meta!.label}</span>
                    <span className="font-semibold tabular-nums text-text">
                      {f.score != null ? `${f.score}%` : "—"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {firstMissing && (
        <div className="relative border-t border-border bg-surface-muted/40 px-7 py-5 sm:px-9">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
            <p className="text-sm font-medium text-text">
              Պրոֆիլդ {completionPct}% պատրաստ է
            </p>
            <p className="text-xs text-text-muted">
              {doneSteps.length} / {steps.length} քայլ
            </p>
          </div>
          <div className="mt-2.5 flex gap-1" aria-hidden="true">
            {steps.map((s) => (
              <span
                key={s.key}
                className="h-1 flex-1 rounded-full transition-colors duration-[var(--motion-normal)]"
                style={{ background: s.done ? "var(--color-primary)" : "var(--color-surface-muted)" }}
              />
            ))}
          </div>
          <ul className="mt-4 flex flex-wrap gap-2">
            {steps.map((step) => (
              <li key={step.key}>
                {step.done ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-correct/35 bg-correct/10 px-3 py-1.5 text-[12.5px] font-medium text-correct">
                    <Check size={13} strokeWidth={2.5} />
                    {step.label}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => scrollToSection(step.target)}
                    title={step.hint}
                    className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border px-3 py-1.5 text-[12.5px] font-medium text-text-muted transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {step.label}
                    <ArrowRight size={12} strokeWidth={2} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
