import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { SubjectStage } from "./SubjectStage";
import { SUBJECTS, TOTAL_EXAMS, TOTAL_QUESTIONS } from "./subjectUniverseData";

/**
 * "Սովորիր՝ ինչ ուզես։"
 *
 * The positioning this heading has to get right, and the reason it is worded
 * exactly this way: the AI tutor genuinely has no subject restriction — it is
 * an LLM, and `ai_assistant/prompts.py` states its rules "hold in every
 * subject, not only math". So "ask it anything" is true and worth saying.
 *
 * What is NOT true is that the platform has practice banks, mock exams and
 * mastery tracking for every subject. It has them for five, and every count
 * on this page comes from those five. Collapsing the two into a vague "every
 * subject" would be the one fabricated capability claim on a page that
 * otherwise refuses to make any.
 *
 * So the heading promises the unlimited half and the subheading immediately
 * says where the depth is. That is both honest and a stronger claim than
 * "everything", because "everything" from a small platform reads as a bluff.
 *
 * A pass through Haygit's subjects staged as travel through a knowledge
 * universe: each subject is an orbital system that approaches, grows past the
 * reader, and hands over to the next one entering from the opposite side.
 *
 * Notes for anyone editing this:
 *
 * • Scroll drives everything. A single rAF-throttled handler writes four
 *   custom properties per section; React re-renders only when the *active*
 *   subject changes, which happens nine times across the whole section.
 *
 * • Stages mount lazily. Nine systems is roughly sixty orbiting elements plus
 *   nine displacement-mapped SVG fields — mounting them all at once is the one
 *   thing here that would genuinely cost frames. A stage is created when it is
 *   within ~1.6 viewports and never destroyed after that.
 *
 * • The universe is deliberately near-black in both themes. Like
 *   `--gradient-brand` and `--color-paper` in theme.css, it is a fixed ground
 *   because a fixed palette is painted on it — nine subject accents that were
 *   chosen against it and cannot follow a theme switch. The ground and its
 *   ink now live in theme.css as `--color-night*`, shared with the rest of
 *   the marketing page's night movements; the literals inside SubjectStage
 *   stay literals on purpose, because those are artwork (SVG strokes, clock
 *   hands, glyph fills), not text, and they belong to the fixed art palette
 *   rather than to a semantic text scale.
 *
 * • Nine sections at 92vh is about nine phone screens. A reader who does not
 *   want the tour must be able to leave at the top of it, not only at the
 *   bottom — hence the skip link beside the scroll hint.
 *
 * • Four of the nine subjects have no question bank yet. They are labelled
 *   with the label «Շուտով», the line «Հարցաշարը պատրաստվում է։», and — in
 *   place of the exam/question counts the live subjects show — «Հարցաշարը դեռ
 *   հասանելի չէ». They carry no numbers. Do not give them invented ones.
 */

/* Examples of what the tutor will discuss, not a catalogue of courses. The
   distinction is carried by the copy above them. */
const TUTOR_TOPICS = [
  "Ծրագրավորում",
  "Պատմություն",
  "Գրականություն",
  "Հոգեբանություն",
  "Տնտեսագիտություն",
  "Արվեստ",
  "Երաժշտություն",
  "Բժշկություն",
];

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const smooth = (n: number) => n * n * (3 - 2 * n);

const STAGE_W = 640;

export function SubjectJourney() {
  const [active, setActive] = useState(0);
  const [mounted, setMounted] = useState<boolean[]>(() => SUBJECTS.map((_, i) => i === 0));
  const [calm, setCalm] = useState(false);
  const sectionsRef = useRef<Array<HTMLDivElement | null>>([]);
  /* Mount state is also kept in a ref so the scroll handler can read it
     without the effect re-subscribing on every mount flip. */
  const mountedRef = useRef(mounted);
  mountedRef.current = mounted;

  const stars = useMemo(buildStars, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setCalm(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    let frame = 0;

    const apply = () => {
      frame = 0;
      const vh = window.innerHeight || 1;
      /*
        One shared fit factor: the stage is drawn at a fixed 640px and scaled
        to whatever the viewport can give it, so the composition never reflows
        — it only ever gets smaller as a whole.

        Narrow screens measure against a wider nominal box than the stage
        itself. Items orbit at radii up to 260 and carry their own width on
        top, so they legitimately overhang the 640px frame; on a desktop that
        overhang falls into the section's margins, but on a phone it ran off
        the screen edge and cut the headline formula in half.
      */
      const side = window.innerWidth >= 1280;
      const fit = side
        ? /* Side-by-side: the stage gets the row's width minus the copy column
             and the gap. Measuring against the viewport instead put a 640px
             stage next to a 205px copy column at 1024px, which crushed the
             subject name to three wrapped lines. */
          clamp((Math.min(window.innerWidth * 0.88, 1280) - 470 - 56) / STAGE_W, 0.6, 1)
        : /* Stacked: measure against a wider nominal box than the stage. Items
             orbit at radii up to 260 and carry their own width on top, so they
             overhang the 640px frame — harmless inside desktop margins, but on
             a phone it ran off the edge and cut the headline formula in half. */
          clamp(Math.min(1, (window.innerWidth - 32) / 720), 0.42, 1);

      let nearest = 0;
      let nearestGap = Infinity;
      const pending: number[] = [];

      sectionsRef.current.forEach((el, i) => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        /* Signed distance of this section's centre from the viewport's, in
           viewports: positive below the fold, negative above it. */
        const delta = (rect.top + rect.height / 2 - vh / 2) / vh;
        const gap = Math.abs(delta);

        if (gap < nearestGap) {
          nearestGap = gap;
          nearest = i;
        }

        if (gap < 1.6 && !mountedRef.current[i]) {
          pending.push(i);
        }

        el.style.setProperty("--fit", fit.toFixed(3));
        if (calm) return;

        el.style.setProperty("--enter", smooth(clamp(1 - gap / 0.9, 0, 1)).toFixed(3));
        /* Scale climbs straight through the pass instead of peaking in the
           middle: the system keeps growing as it goes by, which is what reads
           as travelling past rather than a card zooming in and out. */
        el.style.setProperty("--grow", (0.8 + 0.32 * clamp((0.9 - delta) / 1.8, 0, 1)).toFixed(3));
        el.style.setProperty("--lift", `${(delta * 46).toFixed(1)}px`);
        /* Alternating sides push opposite ways, so consecutive subjects cross
           the centre from opposite corners. */
        el.style.setProperty("--drift", `${(delta * (i % 2 === 0 ? -34 : 34)).toFixed(1)}px`);
      });

      setActive((cur) => (cur === nearest ? cur : nearest));
      if (pending.length) {
        setMounted((cur) => {
          const next = [...cur];
          pending.forEach((i) => {
            next[i] = true;
          });
          return next;
        });
      }
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [calm]);

  return (
    <section id="subjects" className="su-sky relative scroll-mt-20" aria-labelledby="subjects-title">
      {/* 260 stars as one element's box-shadow — a starfield that costs a
          single node and no images. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="su-stars absolute h-0.5 w-0.5 rounded-full" style={{ boxShadow: stars }} />
      </div>

      <div className="relative z-[1] flex flex-col items-center gap-5 px-6 pt-24 pb-10 text-center sm:pt-32">
        <h2
          id="subjects-title"
          className="font-display text-balance leading-[1.02] text-[clamp(2.75rem,8vw,6.5rem)] font-normal"
          style={{ color: "var(--color-night-ink)" }}
        >
          Սովորիր՝ ինչ ուզես։
        </h2>
        <p className="max-w-xl text-[length:var(--text-lg)] leading-[var(--leading-body)]" style={{ color: "var(--color-night-ink-muted)", opacity: 0.82 }}>
          AI Tutor-ին կարող ես հարցնել ցանկացած թեմայի մասին՝ ծրագրավորումից մինչև
          պատմություն։ Իսկ ահա այս առարկաներում պատրաստել ենք ամբողջական
          հարցաշարը՝ քննությանը լուրջ պատրաստվելու համար։
        </p>
        <div
          className="su-chevron mt-3 w-px"
          style={{ height: 44, background: "linear-gradient(#d98a6f,transparent)" }}
          aria-hidden="true"
        />
        {/* The escape hatch. Guided scrolling is comfortable right up until
            the moment someone wants to be somewhere else, and this tour is
            nine full screens long — the reader must be able to opt out at the
            start of it rather than only by outlasting it. */}
        <a
          href="#mistakes"
          className="inline-flex min-h-11 items-center rounded-[var(--radius-full)] border border-night-line px-5 text-[length:var(--text-sm)] font-medium text-night-ink-dim transition-colors hover:text-night-ink"
        >
          Բաց թողնել շրջագայությունը
        </a>
      </div>

      <div className="relative z-[1]">
        {SUBJECTS.map((subject, i) => (
          <div
            key={subject.id}
            ref={(el) => {
              sectionsRef.current[i] = el;
            }}
            className={`su-section relative flex min-h-[92vh] items-center overflow-hidden px-6 py-16 xl:px-[6%] ${
              active === i ? "is-active" : ""
            }`}
            style={{ background: `radial-gradient(ellipse at 50% 50%, ${subject.accent}14, var(--color-night) 62%)` }}
          >
            <div
              className={`mx-auto flex w-full max-w-7xl flex-col items-center gap-8 xl:gap-14 ${
                i % 2 === 0 ? "xl:flex-row" : "xl:flex-row-reverse"
              }`}
            >
              {/* The stage is drawn at a fixed size and scaled by --fit, so the
                  box it occupies has to be reserved rather than measured. */}
              <div className="su-stage-wrap shrink-0">
                {mounted[i] ? <SubjectStage subject={subject} /> : null}
              </div>

              <SubjectCopy subject={subject} />
            </div>
          </div>
        ))}
      </div>

      {/*
        The other half of the promise. Above this, nine subjects with a real
        question bank behind them; here, the tutor, which has none of that
        restriction because it is a language model and not a bank. The chips
        are labelled as examples in the sentence itself — the claim is "ask it
        anything", not "we have courses in all of these", and those are very
        different promises.
      */}
      <div className="relative z-[1] mx-auto max-w-3xl px-6 pt-4 text-center">
        <p className="text-[length:var(--text-base)]" style={{ color: "var(--color-night-ink-muted)" }}>
          Իսկ AI Tutor-ին կարող ես հարցնել ամեն ինչի մասին։ Օրինակ՝
        </p>
        <ul className="mt-4 flex flex-wrap justify-center gap-2">
          {TUTOR_TOPICS.map((t) => (
            <li
              key={t}
              className="rounded-[var(--radius-full)] border px-3.5 py-1.5 text-[length:var(--text-sm)]"
              style={{
                borderColor: "var(--color-night-line)",
                color: "var(--color-night-ink-muted)",
              }}
            >
              {t}
            </li>
          ))}
          <li
            className="rounded-[var(--radius-full)] px-3.5 py-1.5 text-[length:var(--text-sm)] italic"
            style={{ color: "var(--color-night-ink-dim)" }}
          >
            …և ինչ էլ որ հարցնես
          </li>
        </ul>
      </div>

      <div className="relative z-[1] px-6 pt-12 pb-24 text-center sm:pb-32">
        <p className="text-[length:var(--text-lg)]" style={{ color: "var(--color-night-ink)" }}>
          <b className="font-semibold tabular-nums">{TOTAL_EXAMS}</b> փորձնական քննություն,{" "}
          <b className="font-semibold tabular-nums">{TOTAL_QUESTIONS.toLocaleString("hy-AM")}</b> հարց՝
          արդեն հարթակում։
        </p>
        <Link
          to="/register"
          className="mt-7 inline-flex items-center justify-center rounded-[var(--radius-full)] px-8 py-3 font-semibold transition-opacity hover:opacity-90"
          style={{ background: "var(--color-night-ink)", color: "var(--color-night)" }}
        >
          Սկսել սովորել →
        </Link>
      </div>
    </section>
  );
}

/** The readable half: index, name, promise, and what Haygit does in it. */
function SubjectCopy({ subject }: { subject: (typeof SUBJECTS)[number] }) {
  return (
    <div className="su-copy min-w-0 max-w-lg text-center xl:text-left">
      <p
        className="text-[length:var(--text-xs)] font-semibold tracking-[0.3em] uppercase"
        style={{ color: subject.accent }}
      >
        {subject.index}
      </p>
      <h3
        className="mt-3 font-display text-[clamp(2.125rem,4.5vw,3.625rem)] leading-[1.03] font-medium"
        style={{ color: "var(--color-night-ink)" }}
      >
        {subject.name}
      </h3>
      <p className="mt-4 text-[length:var(--text-xl)] leading-[var(--leading-snug)]" style={{ color: "var(--color-night-ink-muted)" }}>
        {subject.promise}
      </p>

      <div
        className="mt-7 inline-block rounded-[var(--radius-xl)] px-5 py-4 text-left"
        style={{ border: `1px solid ${subject.accent}44`, background: "var(--color-night-fill)" }}
      >
        <p className="text-[length:var(--text-xs)] font-semibold tracking-[0.18em] uppercase" style={{ color: subject.accent }}>
          {subject.moment.label}
        </p>
        <p className="mt-1.5 max-w-xs text-[length:var(--text-sm)] leading-[var(--leading-snug)]" style={{ color: "var(--color-night-ink)" }}>
          {subject.moment.body}
        </p>
        {subject.live ? (
          <p
            className="mt-3 border-t pt-2.5 text-[length:var(--text-xs)]"
            style={{ borderColor: `${subject.accent}33`, color: "var(--color-night-ink-dim)" }}
          >
            <span className="tabular-nums">{subject.exams}</span> փորձնական քննություն ·{" "}
            <span className="tabular-nums">{subject.questions?.toLocaleString("hy-AM")}</span> հարց
          </p>
        ) : (
          /* No bank yet, so no numbers. Saying so outright is the only honest
             option on a page that shows real counts everywhere else. */
          <p
            className="mt-3 border-t pt-2.5 text-[length:var(--text-xs)]"
            style={{ borderColor: `${subject.accent}33`, color: "var(--color-night-ink-dim)" }}
          >
            Հարցաշարը դեռ հասանելի չէ
          </p>
        )}
      </div>
    </div>
  );
}

/** Deterministic starfield — a seeded PRNG so the sky is identical on every
    render and never shifts under the reader. */
function buildStars() {
  let seed = 42;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  return Array.from({ length: 260 }, () => {
    const x = (rand() * 100).toFixed(2);
    const y = (rand() * 100).toFixed(2);
    const op = (0.25 + rand() * 0.75).toFixed(2);
    return `${x}vw ${y}vh 0 rgba(255,255,255,${op})`;
  }).join(",");
}
