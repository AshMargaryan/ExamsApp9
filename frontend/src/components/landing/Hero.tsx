import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Clock, ListChecks, Zap } from "lucide-react";
import { DemoNote } from "./Section";

/*
  MOVEMENT 1 — the question.

  What this replaces: a headline reading "Սովորիր ավելի խելացի։ Հասիր ավելի
  հեռու։" beside a mockup that ran on four hardcoded setTimeouts and whose
  payoff was a leaderboard rank moving from #7 to #4. Two things were wrong
  with that. The slogan fits any education product in any language, which is
  the one thing this page cannot afford; and the first idea the page taught a
  visitor was that Gitus is about beating classmates.

  What replaces it is the question a student preparing for the ընդունելության
  քննություններ actually asks at 9pm — "what do I study now?" — answered on
  screen, immediately, by the real thing.

  The card below is the shape `apps/profiles/analytics.py:next_mission()`
  returns: a title built from the weakest topic, a question count derived from
  the mistake count, an estimate, potential XP, and — the part that matters —
  a `reason` string. Nothing here is a picture of a feature. It is the output
  format of an engine that exists.

  The values are invented, because a visitor has no account; the note says so.
*/

const MISSION = {
  topic: "Քառակուսի հավասարումներ",
  questionCount: 10,
  minutes: 15,
  xp: 30,
  mistakes: 5,
};

export function Hero() {
  /* RESOLVE (see landing.css): the answer arrives out of focus and settles.
     One beat, not a sequence — the old hero's four-stage timeline made the
     reader wait 2.2 seconds to see a static card. */
  const [resolved, setResolved] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setResolved(true), 420);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div id="top" className="lp-night relative overflow-hidden">
      {/* A single soft lapis rise behind the question. The universe below is
          where this page spends its spectacle; the hero stays quiet so the
          transition into it reads as opening up rather than continuing. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px]"
        style={{
          background:
            "radial-gradient(ellipse 70% 100% at 50% 0%, color-mix(in srgb, var(--color-brand-1) 40%, transparent), transparent 70%)",
        }}
      />

      <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pt-28 pb-20 sm:gap-12 sm:px-6 sm:pt-40 sm:pb-32 lg:px-8 xl:grid-cols-[1fr_minmax(0,26rem)] xl:gap-16">
        <div>
          <h1 className="font-display text-balance text-[clamp(2.5rem,7vw,4.75rem)] leading-[var(--leading-display)] font-normal text-night-ink">
            Ի՞նչ սովորեմ հիմա։
          </h1>
          {/* Steps down on a phone. At `--text-xl` (22px) this ran to five
              lines at 360px and read as a second headline competing with the
              first, rather than as the sentence under it. */}
          <p className="mt-6 max-w-lg text-[length:var(--text-lg)] leading-[var(--leading-body)] text-night-ink-muted sm:text-[length:var(--text-xl)] sm:leading-[var(--leading-snug)]">
            Gitus-ը հետևում է, թե որ թեմաներում ես սխալվում, և ամեն օր ասում է՝ կոնկրետ ինչ պարապել
            հաջորդը։ Ոչ թե ցուցակ առաջարկում է։ Մեկ քայլ։
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Link
              to="/register"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-full)] bg-night-ink px-7 py-3.5 text-[length:var(--text-base)] font-semibold whitespace-nowrap text-night transition-opacity hover:opacity-90"
            >
              Կառուցել իմ ուղին
              <ArrowRight size={18} strokeWidth={2} aria-hidden />
            </Link>
            <a
              href="#subjects"
              className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-full)] border border-night-line px-7 py-3.5 text-[length:var(--text-base)] font-medium whitespace-nowrap text-night-ink-muted transition-colors hover:text-night-ink"
            >
              Տես՝ ինչպես է աշխատում
            </a>
          </div>

          <p className="mt-6 text-[length:var(--text-sm)] text-night-ink-dim">
            Անվճար՝ մինչ կառուցում ենք հարթակը։
          </p>
        </div>

        <div
          className="lp-resolve lp-night-panel rounded-[var(--radius-2xl)] p-6"
          data-resolved={resolved}
        >
          <p className="text-[length:var(--text-sm)] font-semibold text-night-ink-dim">
            Քո հաջորդ քայլը
          </p>
          <p className="mt-2 font-display text-[length:var(--text-2xl)] leading-[var(--leading-heading)] text-night-ink">
            Ուղղիր «{MISSION.topic}» թեմայի սխալները
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[length:var(--text-sm)] text-night-ink-muted">
            <span className="inline-flex items-center gap-1.5">
              <ListChecks size={16} strokeWidth={1.75} aria-hidden />
              <span className="tabular-nums">{MISSION.questionCount}</span> հարց
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock size={16} strokeWidth={1.75} aria-hidden />~
              <span className="tabular-nums">{MISSION.minutes}</span> րոպե
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Zap size={16} strokeWidth={1.75} aria-hidden />+
              <span className="tabular-nums">{MISSION.xp}</span> XP
            </span>
          </div>

          {/* The reason is the whole point. A recommendation without one is a
              guess the student has to trust; `next_mission()` returns this
              string precisely so it never has to be. */}
          <div className="mt-5 border-t border-night-line pt-5">
            <p className="text-[length:var(--text-sm)] leading-[var(--leading-body)] text-night-ink-muted">
              <span className="font-semibold text-night-ink">Ինչու՞ սա։</span> «{MISSION.topic}»
              թեմայում ունես <span className="tabular-nums">{MISSION.mistakes}</span> սխալ պատասխան։
            </p>
          </div>

          <DemoNote tone="night" className="mt-5">
            Ցուցադրական օրինակ։ Իրական հաշվում այս քարտը կառուցվում է քո սեփական սխալներից։
          </DemoNote>
        </div>
      </div>
    </div>
  );
}
