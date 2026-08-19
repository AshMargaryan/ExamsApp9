import { Link } from "react-router-dom";
import { Circle, CheckCircle2, Flame, Play, Target } from "lucide-react";
import type { HomeInsight } from "../api/profile";
import type { LearningStreak } from "../api/streaks";
import { missionHrefOrFallback } from "../lib/missionHref";
import type { NextMission } from "../api/profile";
import { Card } from "./ui/Card";

const CHECKLIST_LABELS: Record<string, string> = {
  practice: "պարապողական հարց",
  mistakes: "սխալի վերանայում",
  daily_problem: "Օրվա խնդիրը",
};

/** The button should name the thing it opens. A single generic label was how
 *  "start today's practice" ended up launching a full mock-exam list. */
function missionCtaLabel(mission: NextMission): string {
  if (!mission.available) return "Սկսել";
  switch (mission.cta.type) {
    case "mistake_review":
      return "Վերանայել սխալները";
    case "mock_exams":
      return "Անցնել ամբողջական թեստ";
    default:
      return "Սկսել այսօրվա պարապմունքը";
  }
}

export function TodayMissionHero({
  insight,
  streak,
}: {
  insight: HomeInsight | null;
  streak: LearningStreak | null;
}) {
  if (insight === null) {
    return (
      <Card className="lg:col-span-2">
        <p className="text-sm text-text-muted">Բեռնվում է...</p>
      </Card>
    );
  }

  const { next_mission: mission, checklist } = insight;

  if (!mission.available) {
    return (
      <Card className="lg:col-span-2 border-dashed text-center">
        <Target className="mx-auto text-text-muted" size={28} strokeWidth={1.75} />
        <h2 className="mt-2 text-lg font-semibold text-text">Եկ կառուցենք քո ուսումնական պլանը</h2>
        <p className="mt-1 text-sm text-text-muted">
          Սկսիր առաջին խնդրից, և Haygit-ը կսկսի հասկանալ քո մակարդակը և կառաջարկի քեզ հարմար ծրագիր։
        </p>
        <Link
          to="/subjects"
          className="mt-4 inline-block rounded-md bg-primary px-6 py-2 font-medium text-primary-contrast transition-colors hover:bg-primary-hover"
        >
          Սկսել →
        </Link>
      </Card>
    );
  }

  if (checklist.all_complete) {
    return (
      <div
        className="rounded-[var(--radius)] p-5 lg:col-span-2"
        style={{ border: "1px solid var(--color-correct)", backgroundColor: "var(--color-surface)" }}
      >
        <h2 className="flex items-center gap-2 text-lg font-semibold text-text">
          <CheckCircle2 className="text-correct" size={20} strokeWidth={1.75} /> Այսօրվա պարապմունքն ավարտված է
        </h2>
        <ul className="mt-3 space-y-1 text-sm text-text">
          {checklist.items.map((item) => (
            <li key={item.key} className="flex items-center gap-2">
              <CheckCircle2 className="text-correct" size={16} strokeWidth={1.75} />
              {item.key === "daily_problem"
                ? CHECKLIST_LABELS[item.key]
                : `${item.done} ${CHECKLIST_LABELS[item.key]}`}
            </li>
          ))}
        </ul>
        {streak && (
          <p className="mt-3 flex items-center gap-1.5 text-sm text-text-muted">
            <Flame size={15} strokeWidth={1.75} /> {streak.current_streak}-օրյա շարքը շարունակվում է։
          </p>
        )}
        <p className="mt-3 text-sm text-text-muted">Gitus-ի հաջորդ խորհուրդը՝ վաղը շարունակիր նույն թափով։</p>
      </div>
    );
  }

  const percent = checklist.total_count > 0 ? (checklist.completed_count / checklist.total_count) * 100 : 0;

  const steps = checklist.items.filter((item) => item.target > 0);

  /*
    Calm surface, not a full-bleed gradient.

    This card used to paint `--gradient-hero` (a saturated magenta→purple ramp)
    edge to edge and set every string on it in white at ~13px. Two problems:
    dense Armenian body copy on a saturated ground is hard to read, and the
    card shouted louder than its own CTA — the brightest thing in it was the
    backdrop rather than the button. Now the surface is quiet, a primary edge
    and a tinted wash mark it as the page's primary object, and the filled
    button is unambiguously the loudest element.
  */
  return (
    <div
      className="grid items-center gap-[var(--space-7)] rounded-[var(--radius-xl)] border border-primary/40 p-[var(--space-6)] sm:p-[var(--space-8)] lg:col-span-2 sm:grid-cols-[1fr_auto]"
      style={{ background: "color-mix(in srgb, var(--color-primary) 7%, var(--color-surface))" }}
    >
      <div className="min-w-0">
        <p className="mb-[var(--space-2)] flex items-center gap-1.5 text-[length:var(--text-xs)] font-semibold tracking-[var(--tracking-wide)] text-primary uppercase">
          <Target size={13} strokeWidth={1.75} /> Այսօրվա պարապմունքը
        </p>
        <h2 className="text-[length:var(--text-xl)] font-semibold leading-[var(--leading-heading)] tracking-[var(--tracking-tight)] text-text sm:text-[length:var(--text-2xl)]">
          {mission.title}
        </h2>
        <p className="mt-[var(--space-2)] max-w-[var(--measure-base)] text-[length:var(--text-sm)] leading-[var(--leading-body)] text-text-muted">
          {mission.reason}
          {mission.estimated_minutes != null && ` · Մոտավոր տևողությունը՝ ${mission.estimated_minutes} րոպե`}
        </p>

        <ul className="mt-[var(--space-4)] space-y-1.5 text-[length:var(--text-sm)] text-text">
          {steps.map((item) => (
            <li key={item.key} className="flex items-center gap-[var(--space-2)]">
              {item.complete ? (
                <CheckCircle2 size={15} strokeWidth={1.75} className="shrink-0 text-correct" />
              ) : (
                <Circle size={15} strokeWidth={1.75} className="shrink-0 text-text-muted" />
              )}
              <span className={item.complete ? "text-text-muted line-through" : undefined}>
                {item.key === "daily_problem"
                  ? CHECKLIST_LABELS[item.key]
                  : `${item.done} / ${item.target} ${CHECKLIST_LABELS[item.key]}`}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-[var(--space-4)] flex flex-wrap items-center gap-[var(--space-2)]">
          {steps.map((item) => (
            <span
              key={item.key}
              className={`h-1.5 w-9 rounded-[var(--radius-full)] ${item.complete ? "bg-primary" : "bg-surface-muted"}`}
            />
          ))}
          <span className="ml-[var(--space-2)] text-[length:var(--text-xs)] text-text-muted">
            {checklist.completed_count}/{checklist.total_count} առաջադրանք ավարտված
          </span>
        </div>

        <Link
          to={missionHrefOrFallback(mission)}
          className="mt-[var(--space-6)] inline-flex items-center gap-[var(--space-2)] rounded-[var(--radius-full)] bg-primary px-[var(--space-7)] py-[var(--space-3)] font-semibold text-primary-contrast transition-colors hover:bg-primary-hover"
        >
          <Play size={16} strokeWidth={1.75} /> {missionCtaLabel(mission)}
        </Link>
      </div>

      {/*
        The ring is progress feedback, so it only earns its space once there is
        progress to show. At 0% it was a large circle whose entire message was
        "you have not started" — stated more kindly, and in less room, by the
        step list above.
      */}
      {percent > 0 && (
        <div
          className="hidden h-[120px] w-[120px] shrink-0 items-center justify-center rounded-[var(--radius-full)] sm:flex"
          style={{
            background: `conic-gradient(var(--color-primary) 0% ${percent}%, var(--color-surface-muted) ${percent}% 100%)`,
          }}
          role="img"
          aria-label={`Այսօրվա պարապմունքը ${Math.round(percent)} տոկոսով ավարտված է`}
        >
          <div className="flex h-24 w-24 flex-col items-center justify-center rounded-[var(--radius-full)] bg-surface">
            <span className="text-[length:var(--text-2xl)] font-semibold tabular-nums text-text">
              {Math.round(percent)}%
            </span>
            <span className="text-[length:var(--text-xs)] text-text-muted">ավարտված</span>
          </div>
        </div>
      )}
    </div>
  );
}
