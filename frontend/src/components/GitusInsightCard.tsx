import { Sparkles } from "lucide-react";
import type { Coach, NextMission } from "../api/profile";
import { missionHref } from "../lib/missionHref";
import { Card } from "./ui/Card";
import { LinkButton } from "./ui/LinkButton";

export function GitusInsightCard({
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
        <h3 className="flex items-center gap-[var(--space-2)] text-sm font-semibold text-text">
          <Sparkles size={15} strokeWidth={1.75} aria-hidden className="text-primary" /> Gitus-ը նկատեց
        </h3>
        <p className="mt-2 text-sm text-text-muted">{coach.reason}</p>
      </Card>
    );
  }

  const href = coach.available ? missionHref(mission) : null;

  return (
    <div
      className="grid grid-cols-[auto_1fr] items-start gap-5 rounded-[calc(var(--radius)*1.15)] p-6 sm:p-7"
      style={{ background: "color-mix(in srgb, var(--color-purple) 8%, var(--color-surface))" }}
    >
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-on-brand"
        style={{ background: "var(--gradient-brand)" }}
      >
        <Sparkles size={20} strokeWidth={1.75} aria-hidden />
      </div>
      <div>
        <h3 className="text-base font-semibold" style={{ color: "var(--color-purple)" }}>
          Gitus-ը նկատեց
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
          <LinkButton to={href} className="mt-3">
            Սկսել →
          </LinkButton>
        )}
      </div>
    </div>
  );
}
