import { useState } from "react";
import {
  AlarmClock,
  ClipboardCheck,
  GraduationCap,
  Lock,
  Sparkles,
  TrendingDown,
  Users,
} from "lucide-react";
import { DemoNote, Section, SectionHeading } from "./Section";
import { Reveal } from "./Reveal";

/*
  MOVEMENT 7 — the people around the student.

  The rebuild removed ParentsSection and never had a teacher one, which left
  the page silent about two audiences the product actually serves: a teacher
  who can assign and review work, and a parent who gets a weekly summary. Both
  are real, shipped surfaces (`backend/apps/teaching/`, `backend/apps/parents/`),
  and both are reasons an adult says yes to a platform a student found.

  It sits here, immediately before TrustSection, on purpose. The parent panel
  ends on the promise that tutor conversations stay private, and the trust
  cards pick that thread up directly. Showing what a parent sees and then
  immediately what they do *not* see is a stronger sequence than either half
  alone.

  Everything shown maps to something the backend already computes:

    teacher  students_needing_attention  → the three rows
             _weekly_accuracy_drops      → the "ճշգրտությունն ընկել է" reason
             class_weak_spots            → the bar chart
             pending_review_queue        → the review count
    parent   generate_weekly_report_text → the summary card (an LLM writes
                                           this today and emails it; it has
                                           never been visible in the product)
             predicted_exam_score        → the ring
             best_study_hour             → the histogram
             build_activity_calendar     → the 30-day strip

  The numbers are invented — a visitor has no roster and no child — and the
  DemoNote says so. The shapes, the labels and the reasons are not.

  Charts are hand-built SVG and divs. recharts is in the app and is 354 kB;
  the landing page is what a stranger downloads before they have an account,
  so it does not get a charting library for four small figures.
*/

type Audience = "teacher" | "parent";

const AUDIENCES: Array<{ id: Audience; label: string }> = [
  { id: "teacher", label: "Ուսուցչի համար" },
  { id: "parent", label: "Ծնողի համար" },
];

/* ------------------------------------------------------------------ teacher */

/** Mirrors students_needing_attention(): a student, and why they surfaced. */
const ATTENTION = [
  { name: "Անի Հ.", reason: "Ճշգրտությունն ընկել է 12%-ով", icon: TrendingDown },
  { name: "Գոռ Մ.", reason: "4 օր անգործ", icon: AlarmClock },
  { name: "Մարիամ Ս.", reason: "3 առաջադրանք ժամկետանց", icon: ClipboardCheck },
];

/** Mirrors class_weak_spots(): topic, and the share of the roster failing it. */
const WEAK_SPOTS = [
  { topic: "Քառակուսի հավասարումներ", share: 62 },
  { topic: "Երկրաչափություն", share: 48 },
  { topic: "Ֆունկցիաներ", share: 35 },
  { topic: "Կինեմատիկա", share: 21 },
];

function TeacherPanel() {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <article className="rounded-[var(--radius-xl)] border border-border bg-surface p-6">
        <h3 className="flex items-center gap-2 text-[length:var(--text-sm)] font-semibold text-text">
          <Users size={16} strokeWidth={1.75} className="text-primary" aria-hidden />
          Ուշադրության կարիք ունեն
        </h3>
        <p className="mt-1 text-[length:var(--text-xs)] text-text-muted">
          Դասավանդողը բացում է վահանակը և անմիջապես տեսնում՝ ում հետ խոսել այսօր։
        </p>

        <ul className="mt-4 flex flex-col gap-2.5">
          {ATTENTION.map(({ name, reason, icon: Icon }) => (
            <li
              key={name}
              className="flex items-center gap-3 rounded-[var(--radius-md)] border border-border bg-bg px-3 py-2.5"
            >
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-incorrect-bg text-incorrect"
                aria-hidden
              >
                <Icon size={15} strokeWidth={1.75} />
              </span>
              <span className="min-w-0">
                <span className="block text-[length:var(--text-sm)] font-medium text-text">{name}</span>
                {/* The reason is the point. A list of names is a roster; a
                    list of names with causes is a plan for the next hour. */}
                <span className="block text-[length:var(--text-xs)] text-text-muted">{reason}</span>
              </span>
            </li>
          ))}
        </ul>

        <p className="mt-4 border-t border-border pt-3 text-[length:var(--text-xs)] text-text-muted">
          <ClipboardCheck size={13} strokeWidth={1.75} className="mr-1 inline text-primary" aria-hidden />
          <span className="font-semibold tabular-nums text-text">7</span> առաջադրանք սպասում է ստուգման
        </p>
      </article>

      <article className="rounded-[var(--radius-xl)] border border-border bg-surface p-6">
        <h3 className="flex items-center gap-2 text-[length:var(--text-sm)] font-semibold text-text">
          <GraduationCap size={16} strokeWidth={1.75} className="text-primary" aria-hidden />
          Ո՞ր թեման է դժվարանում բոլորին
        </h3>
        <p className="mt-1 text-[length:var(--text-xs)] text-text-muted">
          Այստեղից է որոշվում՝ ինչ բացատրել վաղը դասին։
        </p>

        {/* A horizontal bar per topic. Percentages are also written out, so
            the chart is never the only way to read the number — and the bars
            are ordered, so rank survives without colour. */}
        <ul className="mt-5 flex flex-col gap-3.5">
          {WEAK_SPOTS.map(({ topic, share }) => (
            <li key={topic}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[length:var(--text-sm)] text-text">{topic}</span>
                <span className="text-[length:var(--text-xs)] font-semibold tabular-nums text-text-muted">
                  {share}%
                </span>
              </div>
              <div
                className="mt-1.5 h-2 overflow-hidden rounded-[var(--radius-full)] bg-surface-muted"
                role="img"
                aria-label={`${topic}՝ դասարանի ${share} տոկոսը դժվարանում է`}
              >
                <div
                  className="h-full rounded-[var(--radius-full)] bg-primary"
                  style={{ width: `${share}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </article>
    </div>
  );
}

/* ------------------------------------------------------------------- parent */

/* Hour buckets, mirroring best_study_hour(). Values are relative minutes. */
const HOURS = [
  { label: "9", value: 12 },
  { label: "11", value: 22 },
  { label: "13", value: 18 },
  { label: "15", value: 41 },
  { label: "17", value: 68 },
  { label: "19", value: 54 },
  { label: "21", value: 27 },
];
const PEAK = HOURS.reduce((a, b) => (b.value > a.value ? b : a));

/* 30 days, 0–3 intensity. Mirrors build_activity_calendar(child, days=30). */
const CALENDAR = [
  2, 3, 1, 0, 2, 3, 3, 1, 0, 0, 2, 3, 2, 1, 3, 3, 2, 0, 1, 2, 3, 3, 1, 2, 0, 2, 3, 3, 2, 3,
];

const PREDICTED = 68;

function ScoreRing({ value }: { value: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <svg width="88" height="88" viewBox="0 0 88 88" role="img" aria-label={`Կանխատեսվող միավոր՝ ${value} հարյուրից`}>
      <circle cx="44" cy="44" r={r} fill="none" stroke="var(--color-surface-muted)" strokeWidth="8" />
      <circle
        cx="44"
        cy="44"
        r={r}
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - value / 100)}
        transform="rotate(-90 44 44)"
      />
      <text
        x="44"
        y="44"
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-text font-semibold tabular-nums"
        style={{ fontSize: 22 }}
      >
        {value}
      </text>
    </svg>
  );
}

function ParentPanel() {
  const max = Math.max(...HOURS.map((h) => h.value));
  return (
    <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
      <article className="flex flex-col rounded-[var(--radius-xl)] border border-border bg-surface p-6">
        <h3 className="flex items-center gap-2 text-[length:var(--text-sm)] font-semibold text-text">
          <Sparkles size={16} strokeWidth={1.75} className="text-primary" aria-hidden />
          Շաբաթվա ամփոփում
        </h3>
        <p className="mt-1 text-[length:var(--text-xs)] text-text-muted">
          Ամեն կիրակի՝ մարդկային լեզվով, ոչ թե գրաֆիկներով։
        </p>

        {/* The weekly report is written by the AI today and delivered only by
            email (generate_weekly_report_text → email_weekly_report). Putting
            it on the page is the whole point of this panel. */}
        <blockquote className="mt-4 rounded-[var(--radius-md)] border border-primary-line bg-primary-bg p-4 text-[length:var(--text-sm)] leading-[var(--leading-body)] text-text">
          «Այս շաբաթ Անին պարապել է 4 օր՝ հիմնականում մաթեմատիկա։ Քառակուսի
          հավասարումներում ճշգրտությունը 54%-ից բարձրացել է 71%։ Ֆիզիկան այս
          շաբաթ չի բացել — արժե հարցնել՝ ինչու։»
        </blockquote>

        <div className="mt-5 border-t border-border pt-4">
          <p className="text-[length:var(--text-xs)] font-semibold text-text">Ամենաարդյունավետ ժամը</p>
          <div className="mt-3 flex items-end gap-1.5" role="img" aria-label={`Ամենաարդյունավետ ժամը՝ ժամը ${PEAK.label}։00`}>
            {HOURS.map((h) => (
              <div key={h.label} className="flex flex-1 flex-col items-center gap-1.5">
                <div
                  className={`w-full rounded-t-[var(--radius-xs)] ${h === PEAK ? "bg-primary" : "bg-surface-muted"}`}
                  style={{ height: Math.round((h.value / max) * 56) }}
                />
                <span className="text-[length:var(--text-xs)] tabular-nums text-text-muted">{h.label}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[length:var(--text-xs)] text-text-muted">
            Անին ամենալավն աշխատում է ժամը{" "}
            <span className="font-semibold tabular-nums text-text">{PEAK.label}:00</span>-ին։
          </p>
        </div>
      </article>

      <div className="flex flex-col gap-5">
        <article className="flex items-center gap-4 rounded-[var(--radius-xl)] border border-border bg-surface p-6">
          <ScoreRing value={PREDICTED} />
          <div className="min-w-0">
            <p className="text-[length:var(--text-sm)] font-semibold text-text">Կանխատեսվող միավոր</p>
            {/* An estimate has to look like one. predicted_exam_score() is a
                projection from current mastery, not a promise. */}
            <p className="mt-1 text-[length:var(--text-xs)] leading-[var(--leading-body)] text-text-muted">
              Ընթացիկ արդյունքների հիման վրա։ Փոխվում է ամեն շաբաթ։
            </p>
          </div>
        </article>

        <article className="rounded-[var(--radius-xl)] border border-border bg-surface p-6">
          <p className="text-[length:var(--text-sm)] font-semibold text-text">Վերջին 30 օրը</p>
          <div className="mt-3 grid grid-cols-10 gap-1" role="img" aria-label="Վերջին 30 օրվա ակտիվությունը">
            {CALENDAR.map((level, i) => (
              <span
                key={i}
                className="aspect-square rounded-[var(--radius-xs)]"
                style={{
                  backgroundColor:
                    level === 0
                      ? "var(--color-surface-muted)"
                      : `color-mix(in srgb, var(--color-primary) ${level * 30}%, var(--color-surface-muted))`,
                }}
              />
            ))}
          </div>
        </article>

        {/*
          The promise, stated where the parent actually is rather than only in
          marketing. A student who believes their tutor chat is read at home
          stops asking honest questions, and the tutor is the product's best
          feature — so this constraint protects the thing it appears to limit.
        */}
        <p className="flex items-start gap-2 rounded-[var(--radius-md)] border border-border bg-surface-muted px-4 py-3 text-[length:var(--text-xs)] leading-[var(--leading-body)] text-text-muted">
          <Lock size={14} strokeWidth={1.75} className="mt-0.5 shrink-0 text-text" aria-hidden />
          <span>
            Ծնողը տեսնում է առաջընթացը, բայց ոչ AI Tutor-ի զրույցները։ Դրանք մնում են
            միայն աշակերտի մոտ։
          </span>
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ section */

export function SupportSection() {
  const [audience, setAudience] = useState<Audience>("teacher");

  return (
    <Section id="support">
      <SectionHeading
        kicker="Ուսուցիչներ և ծնողներ"
        title="Դու մենակ չես սովորում։"
        subtitle="Ուսուցիչը տեսնում է՝ ում հետ խոսել այսօր։ Ծնողը՝ արդյոք ամեն ինչ կարգին է։ Երկուսն էլ՝ առանց քեզ վերահսկելու։"
      />

      <Reveal className="mt-10 flex justify-center">
        <div
          className="inline-flex rounded-[var(--radius-full)] border border-border p-1"
          role="group"
          aria-label="Ընտրիր տեսակետը"
        >
          {AUDIENCES.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setAudience(a.id)}
              aria-pressed={audience === a.id}
              className={`min-h-11 rounded-[var(--radius-full)] px-5 text-[length:var(--text-sm)] font-semibold transition-colors ${
                audience === a.id
                  ? "bg-primary text-primary-contrast"
                  : "text-text-muted hover:text-text"
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
      </Reveal>

      <Reveal className="mt-8">
        {audience === "teacher" ? <TeacherPanel /> : <ParentPanel />}
        <DemoNote className="mt-6 text-center" />
      </Reveal>
    </Section>
  );
}
