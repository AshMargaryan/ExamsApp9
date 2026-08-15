import { Link } from "react-router-dom";
import { Circle, CheckCircle2, Flame, Play, Target } from "lucide-react";
import type { HomeInsight } from "../api/profile";
import type { LearningStreak } from "../api/streaks";
import { Card } from "./ui/Card";

const CHECKLIST_LABELS: Record<string, string> = {
  practice: "պարապողական հարց",
  mistakes: "սխալի վերանայում",
  daily_problem: "Օրվա խնդիրը",
};

function missionCtaHref(cta: { type: "practice_subtopic"; subtopic_id: number; tier: string } | { type: "mock_exams" }) {
  return cta.type === "practice_subtopic" ? `/practice/subtopic/${cta.subtopic_id}/${cta.tier}` : "/mock-exams";
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

  return (
    <div
      className="grid items-center gap-8 rounded-[calc(var(--radius)*1.15)] p-7 sm:p-9 lg:col-span-2 sm:grid-cols-[1fr_auto]"
      style={{ background: "var(--gradient-hero)", boxShadow: "0 12px 30px rgba(0,0,0,0.18)" }}
    >
      <div>
        <p className="mb-2 flex items-center gap-1.5 text-xs font-medium tracking-[0.1em] text-white/70 uppercase">
          <Target size={13} strokeWidth={1.75} /> Այսօրվա պարապմունքը
        </p>
        <h2 className="text-xl font-semibold text-white sm:text-2xl">{mission.title}</h2>
        <p className="mt-1.5 text-sm text-white/80">
          {mission.reason}
          {mission.estimated_minutes != null && ` · Մոտավոր տևողությունը՝ ${mission.estimated_minutes} րոպե`}
        </p>

        <ul className="mt-4 space-y-1.5 text-sm text-white/90">
          {checklist.items
            .filter((item) => item.target > 0)
            .map((item) => (
              <li key={item.key} className="flex items-center gap-2">
                {item.complete ? (
                  <CheckCircle2 size={15} strokeWidth={1.75} />
                ) : (
                  <Circle size={15} strokeWidth={1.75} />
                )}
                {item.key === "daily_problem"
                  ? CHECKLIST_LABELS[item.key]
                  : `${item.done} / ${item.target} ${CHECKLIST_LABELS[item.key]}`}
              </li>
            ))}
        </ul>

        <div className="mt-4 flex items-center gap-2">
          {checklist.items
            .filter((item) => item.target > 0)
            .map((item) => (
              <span
                key={item.key}
                className="h-1.5 w-9 rounded-full"
                style={{ background: item.complete ? "#fff" : "rgba(255,255,255,0.3)" }}
              />
            ))}
          <span className="ml-2 text-xs text-white/80">
            {checklist.completed_count}/{checklist.total_count} առաջադրանք ավարտված
          </span>
        </div>

        <Link
          to={missionCtaHref(mission.cta)}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 font-semibold text-[var(--color-primary)] transition-opacity hover:opacity-90"
        >
          <Play size={16} strokeWidth={1.75} /> Սկսել այսօրվա պարապմունքը
        </Link>
      </div>

      <div
        className="hidden h-[120px] w-[120px] shrink-0 items-center justify-center rounded-full sm:flex"
        style={{ background: `conic-gradient(#fff 0% ${percent}%, rgba(255,255,255,0.25) ${percent}% 100%)` }}
      >
        <div
          className="flex h-24 w-24 flex-col items-center justify-center rounded-full"
          style={{ background: "var(--color-purple)" }}
        >
          <span className="text-2xl font-semibold text-white">{Math.round(percent)}%</span>
          <span className="text-[10px] text-white/75">ավարտված</span>
        </div>
      </div>
    </div>
  );
}
