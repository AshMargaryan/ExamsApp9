import { Link } from "react-router-dom";
import type { Coach, NextMission } from "../api/profile";
import { Card } from "./ui/Card";

function missionCtaHref(mission: NextMission) {
  if (!mission.available) return null;
  return mission.cta.type === "practice_subtopic"
    ? `/practice/subtopic/${mission.cta.subtopic_id}/${mission.cta.tier}`
    : "/mock-exams";
}

export function HaygitInsightCard({
  coach,
  mission,
  personalizedMessage,
}: {
  coach: Coach;
  mission: NextMission;
  /** A richer, LLM-written message grounded in this student's real data (see
   * apps.study_plan.services._ai_narrate) — shown instead of the rule-based
   * situation/weakness/opportunity lines when the provider produced one that
   * day. Falls back to the rule-based text otherwise, so this is optional. */
  personalizedMessage?: string;
}) {
  if (!coach.available && !personalizedMessage) {
    return (
      <Card className="border-dashed">
        <h3 className="text-sm font-semibold text-text">🤖 Haygit-ը նկատեց</h3>
        <p className="mt-2 text-sm text-text-muted">{coach.reason}</p>
      </Card>
    );
  }

  const href = coach.available ? missionCtaHref(mission) : null;

  return (
    <div
      className="grid grid-cols-[auto_1fr] items-start gap-5 rounded-[calc(var(--radius)*1.15)] p-6 sm:p-7"
      style={{ background: "color-mix(in srgb, var(--color-purple) 8%, var(--color-surface))" }}
    >
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl text-white"
        style={{ background: "var(--gradient-hero)" }}
      >
        🤖
      </div>
      <div>
        <h3 className="text-base font-semibold" style={{ color: "var(--color-purple)" }}>
          Haygit-ը նկատեց
        </h3>
        <div className="mt-2 space-y-1.5 text-sm leading-relaxed text-text-muted">
          {personalizedMessage ? (
            <p>{personalizedMessage}</p>
          ) : coach.available ? (
            <>
              {coach.situation && <p>{coach.situation}</p>}
              <p>{coach.weakness}</p>
              <p>{coach.opportunity}</p>
            </>
          ) : null}
        </div>
        {coach.available && (
          <>
            <p className="mt-3 text-sm font-medium text-text">Հաջորդ քայլը</p>
            <p className="text-sm text-text-muted">{coach.recommendation}</p>
          </>
        )}
        {href && (
          <Link to={href} className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
            Սկսել →
          </Link>
        )}
      </div>
    </div>
  );
}
