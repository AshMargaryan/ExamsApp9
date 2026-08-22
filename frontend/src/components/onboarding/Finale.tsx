import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { SUBJECTS, daysUntil } from "./scenes";
import type { Draft } from "./scenes";

/*
  The payoff. Two scenes.

  TransformScene — the student's current situation, drawn as scattered
  fragments, resolving into an ordered path. This is the landing page's
  signature #1 (chaos → structure) told about *this* student rather than a
  generic one, and it is the reason the questions came first: by now the
  fragments can be labelled with their own subjects.

  RevealScene — what Gitus will actually do, built from what they just typed.
  Not "account created". The plan below is assembled from the draft: the
  subjects are theirs, the countdown is theirs, the first day is drawn from the
  subjects they chose.

  What is NOT here, deliberately: any claim that the system has already
  analysed them. It has not. There is no diagnostic in the product
  (`grep -rn "diagnostic" backend/apps` finds nothing that assesses a student),
  so the reveal shows a *plan shaped by their answers*, which is true, rather
  than a *reading of their level*, which would be invented. The moment a
  diagnostic exists this scene is where it slots in — between the transform and
  this reveal.
*/

const CHAOS = [
  { t: "«Ի՞նչ սովորեմ»", fx: -190, fy: -70, fr: -8 },
  { t: "YouTube", fx: 170, fy: -110, fr: 6 },
  { t: "Դասագիրք", fx: -230, fy: 60, fr: 4 },
  { t: "Պատահական թեստ", fx: 210, fy: 40, fr: -5 },
  { t: "Սխալ պատասխան", fx: -120, fy: 140, fr: 7 },
  { t: "«Ինչու՞ սխալ էր»", fx: 140, fy: 150, fr: -6 },
  { t: "Ուրիշ թեմա", fx: -40, fy: -160, fr: 5 },
  { t: "Քննությունը մոտենում է", fx: 60, fy: 210, fr: -4 },
];

const PATH = [
  "Քո նպատակը",
  "Որտեղ ես հիմա",
  "Թույլ թեմաները",
  "Այսօրվա պլանը",
  "AI Tutor",
  "Ուղղորդված պարապմունք",
  "Սխալների վերլուծություն",
  "Առաջընթաց",
  "Հաջորդ քայլը",
];

export function TransformScene({ onNext }: { onNext: () => void }) {
  /* Three beats: fragments scattered, fragments dissolving, path assembled.
     Driven by timers rather than scroll because this is a linear moment in a
     flow, not a page someone browses. */
  const [beat, setBeat] = useState(0);

  useEffect(() => {
    const calm = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (calm) {
      setBeat(2);
      return;
    }
    const a = window.setTimeout(() => setBeat(1), 1400);
    const b = window.setTimeout(() => setBeat(2), 2500);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
  }, []);

  return (
    <div className="mx-auto w-full max-w-3xl text-center">
      <p className="text-[length:var(--text-sm)] tracking-[0.28em] text-night-ink-dim uppercase">
        {beat < 2 ? "Առանց Gitus-ի" : "Gitus-ով"}
      </p>

      <div className="relative mt-8 min-h-[22rem]">
        {/* Chaos. Positioned by transform from a common centre so nothing here
            participates in layout — the fragments can overlap freely and their
            collapse costs no reflow. */}
        <div className="absolute inset-0 flex items-center justify-center" aria-hidden={beat === 2}>
          {CHAOS.map((c) => (
            <span
              key={c.t}
              className="ob-fragment absolute rounded-[var(--radius-full)] border border-night-line bg-night-fill px-4 py-2 text-[length:var(--text-sm)] whitespace-nowrap text-night-ink-muted"
              data-settled={beat >= 1}
              style={{
                ["--fx" as string]: `${c.fx}px`,
                ["--fy" as string]: `${c.fy}px`,
                ["--fr" as string]: `${c.fr}deg`,
              }}
            >
              {c.t}
            </span>
          ))}
        </div>

        {/* Order. The same space, now a single column. */}
        <ol className="relative flex flex-col items-center gap-1.5" aria-hidden={beat < 2}>
          {PATH.map((p, i) => (
            <li
              key={p}
              className="ob-step-in"
              data-shown={beat === 2}
              style={{ ["--i" as string]: i }}
            >
              <span className="inline-block rounded-[var(--radius-full)] border border-night-line bg-night-fill px-5 py-2 text-[length:var(--text-sm)]">
                {p}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <button
        type="button"
        onClick={onNext}
        className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-full)] bg-night-ink px-7 font-semibold text-[var(--color-night)] transition-opacity disabled:opacity-35"
        disabled={beat < 2}
      >
        Շարունակել <ArrowRight size={17} strokeWidth={2} aria-hidden />
      </button>
    </div>
  );
}

/** A first day built from the subjects they actually chose. Minutes are a
    sensible default, not a claim about them — the real plan comes from
    study_plan/services.py once there are answers to rank. */
function firstDay(draft: Draft) {
  const picked = draft.subjects
    .map((k) => SUBJECTS.find((s) => s.key === k))
    .filter((s): s is (typeof SUBJECTS)[number] => Boolean(s))
    .slice(0, 2);
  return [
    ...picked.map((s, i) => ({ label: s.label, minutes: i === 0 ? 20 : 25 })),
    { label: "AI Tutor", minutes: 10 },
  ];
}

export function RevealScene({ draft, onStart, busy }: { draft: Draft; onStart: () => void; busy: boolean }) {
  const days = daysUntil(draft.exam_date);
  const plan = firstDay(draft);

  return (
    <div className="ob-scene mx-auto w-full max-w-xl text-center">
      <p className="text-[length:var(--text-sm)] tracking-[0.28em] text-night-ink-dim uppercase" style={{ ["--i" as string]: 0 }}>
        Պատրաստ է
      </p>

      <h1
        className="mt-4 font-display text-[clamp(2rem,6vw,3.25rem)] leading-[1.08] font-semibold tracking-[var(--tracking-tight)]"
        style={{ ["--i" as string]: 1 }}
      >
        {draft.first_name}, քո ճանապարհը<br />պատրաստ է։
      </h1>

      <p className="mt-4 text-[length:var(--text-base)] text-night-ink-muted" style={{ ["--i" as string]: 2 }}>
        Գիտենք՝ ուր ես ուզում հասնել։ Հիմա սկսենք հասկանալ՝ ինչպես հասնել այնտեղ։
      </p>

      <div
        className="mt-8 rounded-[var(--radius-xl)] border border-night-line bg-night-fill p-6 text-left"
        style={{ ["--i" as string]: 3 }}
      >
        <p className="text-[length:var(--text-xs)] tracking-[0.18em] text-night-ink-dim uppercase">
          Քո առաջին օրը
        </p>
        <ul className="mt-4 flex flex-col gap-2.5">
          {plan.map((t) => (
            <li
              key={t.label}
              className="flex items-center justify-between rounded-[var(--radius-md)] border border-night-line px-4 py-3"
            >
              <span className="text-[length:var(--text-sm)]">{t.label}</span>
              <span className="text-[length:var(--text-xs)] tabular-nums text-night-ink-dim">
                {t.minutes} րոպե
              </span>
            </li>
          ))}
        </ul>

        {days !== null && (
          <p className="mt-4 border-t border-night-line pt-3 text-[length:var(--text-xs)] text-night-ink-dim">
            Քննությանը մնացել է <span className="tabular-nums text-night-ink">{days}</span> օր։
            Պլանը փոխվում է ամեն օր՝ ըստ քո պատասխանների։
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onStart}
        disabled={busy}
        className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-[var(--radius-full)] bg-night-ink px-8 font-semibold text-[var(--color-night)] transition-opacity disabled:opacity-50"
        style={{ ["--i" as string]: 4 }}
      >
        {busy ? "Կառուցում ենք…" : "Սկսել իմ ճանապարհը"}
        {!busy && <ArrowRight size={18} strokeWidth={2} aria-hidden />}
      </button>
    </div>
  );
}
