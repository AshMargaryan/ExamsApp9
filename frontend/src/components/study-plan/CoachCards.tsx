import { ArrowRight, CalendarClock, Compass, GraduationCap, History, TriangleAlert } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import type { Profile } from "../../api/profile";
import type { Coach } from "../../api/profile";
import type { CoachReview, CoachStrategy, CoachWeek, WeeklyReport } from "../../api/studyPlan";
import type { MasteryScore } from "../../api/knowledge";
import { SUBJECTS } from "../../lib/subjects";
import { MASTERY_BAND_COLOR, masteryBand } from "../../lib/mastery";
export { missionHrefOrFallback as missionHrefFor } from "../../lib/missionHref";
import { Button } from "../ui/Button";
import { Metric } from "../ui/Metric";
import { formatMinutes } from "./planFormat";

/*
  The supporting cards around today's plan.

  Each one exists to answer a different question — what's going wrong, how far
  behind am I, what am I aiming at, how did the week go — and each ends in
  either a number the student can act on or a link to the place they'd act.
  None of them restate the plan itself.
*/

function CardShell({
  icon,
  title,
  children,
  tone = "default",
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  tone?: "default" | "alert";
}) {
  return (
    <section
      className={`rounded-[var(--radius)] border p-5 ${
        tone === "alert"
          ? "border-[color-mix(in_srgb,var(--color-incorrect)_35%,transparent)] bg-[color-mix(in_srgb,var(--color-incorrect)_6%,var(--color-surface))]"
          : "border-border bg-surface"
      }`}
    >
      <h3
        className={`mb-3 flex items-center gap-2 text-sm font-semibold ${
          tone === "alert" ? "text-incorrect" : "text-text"
        }`}
      >
        {icon}
        {title}
      </h3>
      {children}
    </section>
  );
}

/**
 * The mistake pattern, framed as an intervention rather than a statistic —
 * observation, then scale, then one thing to do about it. Every number comes
 * from the coach payload; nothing here is inferred.
 */
export function MistakePatternCard({ coach, missionHref }: { coach: Coach; missionHref: string }) {
  const navigate = useNavigate();
  if (!coach.available) return null;
  const e = coach.evidence;

  return (
    <CardShell tone="alert" icon={<TriangleAlert size={15} strokeWidth={2} />} title="Haygit-ը օրինաչափություն նկատեց">
      <p className="text-[14.5px] leading-relaxed text-text">
        Վերջերս <span className="font-semibold">{e.incorrect_count} անգամ</span> սխալվել ես «{e.topic}» թեմայում։
      </p>
      <p className="mt-1.5 text-[13px] leading-relaxed text-text-muted">
        Դա քո վերջին սխալների {e.mistake_share_percent}%-ն է։ Մեկ թեմա, որ քաշում է մնացած ամեն ինչը ցած։
      </p>
      <Button
        variant="secondary"
        size="sm"
        className="mt-4"
        onClick={() => navigate(missionHref)}
        iconRight={<ArrowRight size={14} strokeWidth={2} />}
      >
        Ուղղել այս օրինաչափությունը
      </Button>
    </CardShell>
  );
}

/** What the student is ultimately aiming at. Reads Profile's academic-identity
 *  fields (edited on /profile), and links on to the goals that live on the
 *  learning profile — the two used to be unreachable from each other. */
export function TargetCard({ profile }: { profile: Profile }) {
  const hasGoal = Boolean(profile.university || profile.target_major || profile.target_exam_date);
  const applicationYear = profile.target_exam_date ? new Date(profile.target_exam_date).getFullYear() : null;

  return (
    <CardShell icon={<GraduationCap size={15} strokeWidth={2} className="text-text-muted" />} title="Քո նպատակը">
      {hasGoal ? (
        <>
          <dl className="flex flex-col gap-2.5 text-[14px]">
            {profile.target_major && (
              <div className="flex justify-between gap-3">
                <dt className="text-text-muted">Մասնագիտություն</dt>
                <dd className="text-right font-semibold text-text">{profile.target_major}</dd>
              </div>
            )}
            {profile.university && (
              <div className="flex justify-between gap-3">
                <dt className="text-text-muted">Համալսարան</dt>
                <dd className="text-right font-semibold text-text">{profile.university.name}</dd>
              </div>
            )}
            {applicationYear && (
              <div className="flex justify-between gap-3">
                <dt className="text-text-muted">Ընդունելության տարի</dt>
                <dd className="text-right font-semibold text-text">{applicationYear}</dd>
              </div>
            )}
          </dl>
          <Link
            to="/learning-profile"
            className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Իմ նպատակներն ու առարկաները
            <ArrowRight size={13} strokeWidth={2} />
          </Link>
        </>
      ) : (
        <>
          <p className="text-[14px] leading-relaxed text-text-muted">
            Ասա Haygit-ին, թե ուր ես գնում՝ և պլանը կդասավորվի այդ ուղղությամբ։
          </p>
          <Link
            to="/profile"
            className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-[var(--radius)] border border-border bg-surface px-3.5 text-sm font-medium text-text transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Սահմանել նպատակ
            <ArrowRight size={14} strokeWidth={2} />
          </Link>
        </>
      )}
    </CardShell>
  );
}

/** Pace vs. the exam. States the gap plainly in both directions — a coach that
 *  only ever says "great job" is worth nothing when you're actually behind. */
export function ExamStrategyCard({ strategy }: { strategy: CoachStrategy }) {
  return (
    <CardShell icon={<CalendarClock size={15} strokeWidth={2} className="text-text-muted" />} title="Քննական տեմպ">
      <div className="flex items-baseline gap-2">
        <span className="text-[32px] leading-none font-semibold tabular-nums text-text">{strategy.days_left}</span>
        <span className="text-sm text-text-muted">օր մնաց</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-[var(--radius)] bg-surface-muted px-3 py-2.5">
          <p className="text-[10.5px] font-semibold tracking-[0.08em] text-text-muted">ՔՈ ՏԵՄՊԸ</p>
          <p className="mt-1 text-sm font-bold text-text">{strategy.current_pace_days} օր / շաբաթ</p>
        </div>
        <div className="rounded-[var(--radius)] bg-surface-muted px-3 py-2.5">
          <p className="text-[10.5px] font-semibold tracking-[0.08em] text-text-muted">ԱՌԱՋԱՐԿՎՈՂ</p>
          <p className="mt-1 text-sm font-bold text-text">{strategy.recommended_days_per_week} օր / շաբաթ</p>
        </div>
      </div>

      <p
        className={`mt-3.5 text-[13px] leading-relaxed ${strategy.is_behind ? "text-incorrect" : "text-correct"}`}
      >
        {strategy.is_behind
          ? `Դու հետ ես տեմպից։ Օրական ${strategy.recommended_minutes_per_day} րոպեն կփակի տարբերությունը։`
          : `Լավ տեմպի վրա ես։ Պահիր օրական ${strategy.recommended_minutes_per_day} րոպեն։`}
      </p>
    </CardShell>
  );
}

/**
 * The learning map: every subject with data, split by band.
 *
 * The old card listed the three weakest subjects with no counterweight, which
 * reads as a report card rather than a map. Seeing what's already strong is
 * what makes the weak column feel actionable instead of demoralising.
 */
export function LearningMapCard({ scores }: { scores: MasteryScore[] }) {
  const withData = scores.filter((s) => s.mastery_score != null);
  if (withData.length === 0) return null;

  const labelFor = (key: string) => SUBJECTS.find((s) => s.key === key)?.label ?? key;
  const strong = withData
    .filter((s) => masteryBand(s.mastery_score) === "strong")
    .sort((a, b) => (b.mastery_score ?? 0) - (a.mastery_score ?? 0));
  const focus = withData
    .filter((s) => masteryBand(s.mastery_score) !== "strong")
    .sort((a, b) => (a.mastery_score ?? 0) - (b.mastery_score ?? 0));

  const row = (s: MasteryScore) => {
    const band = masteryBand(s.mastery_score);
    return (
      <li key={s.subject_key} className="flex items-center gap-3">
        <span className="min-w-0 flex-1 truncate text-[13px] text-text">{labelFor(s.subject_key)}</span>
        <span className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-surface-muted">
          <span
            className="block h-full rounded-full"
            style={{ width: `${s.mastery_score}%`, background: MASTERY_BAND_COLOR[band] }}
          />
        </span>
        <span className="w-9 shrink-0 text-right text-[13px] font-semibold tabular-nums text-text">
          {s.mastery_score}%
        </span>
      </li>
    );
  };

  return (
    <CardShell icon={<Compass size={15} strokeWidth={2} className="text-text-muted" />} title="Ուսումնական քարտեզ">
      <div className="flex flex-col gap-4">
        {focus.length > 0 && (
          <div>
            <p className="mb-2 text-[10.5px] font-semibold tracking-[0.1em] text-incorrect">ՖՈԿՈՒՍ</p>
            <ul className="flex flex-col gap-2">{focus.map(row)}</ul>
          </div>
        )}
        {strong.length > 0 && (
          <div>
            <p className="mb-2 text-[10.5px] font-semibold tracking-[0.1em] text-correct">ՈՒԺԵՂ</p>
            <ul className="flex flex-col gap-2">{strong.map(row)}</ul>
          </div>
        )}
      </div>
      <Link
        to="/learning-profile"
        className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        Տեսնել թեմա առ թեմա
        <ArrowRight size={13} strokeWidth={2} />
      </Link>
    </CardShell>
  );
}

/** Spaced-repetition nudge — only appears when the coach has a topic that has
 *  actually gone stale (≥2 days since the last mistake on it). */
export function ReviewNudgeCard({ review }: { review: CoachReview }) {
  const navigate = useNavigate();
  return (
    <CardShell icon={<History size={15} strokeWidth={2} className="text-text-muted" />} title="Ժամանակն է վերանայել">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold text-text">{review.topic_label}</p>
          <p className="mt-0.5 text-xs text-text-muted">Վերջին սխալը՝ {review.days_since} օր առաջ</p>
        </div>
        {review.link_path && (
          <Button variant="secondary" size="sm" onClick={() => navigate(review.link_path!)}>
            Վերանայել
          </Button>
        )}
      </div>
    </CardShell>
  );
}

/** The week as numbers first, narrative second — and the narrative visually
 *  separated so a long AI paragraph can't swallow the metrics. */
export function WeekStoryCard({ week, report }: { week: CoachWeek; report: WeeklyReport | null }) {
  return (
    <CardShell icon={<CalendarClock size={15} strokeWidth={2} className="text-text-muted" />} title="Այս շաբաթ">
      <div className="grid grid-cols-2 gap-4">
        <Metric label="ուսումնական օր" value={`${week.days_studied} / 7`} size="sm" />
        <Metric label="ուսումնական ժամանակ" value={formatMinutes(week.minutes)} size="sm" />
        <Metric label="հարց" value={week.questions} size="sm" />
        <Metric label="ճշտություն" value={week.accuracy !== null ? `${week.accuracy}%` : "—"} size="sm" />
      </div>
      <p className="mt-4 border-t border-border pt-3.5 text-[13px] leading-relaxed text-text-muted">
        {report ? report.text : week.narrative}
      </p>
    </CardShell>
  );
}


