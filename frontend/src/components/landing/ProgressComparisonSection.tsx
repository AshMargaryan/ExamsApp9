import { useEffect, useRef, useState } from "react";
import { DemoNote, Section, SectionHeading } from "./Section";

/*
  Studying alone vs studying with a system, as two curves.

  The honesty problem this section has to solve: there is no measured cohort
  study behind Gitus, so any number on this chart would be invented — and a
  fabricated "+47% faster" is exactly the kind of claim the rest of the page
  refuses to make. The answer is to draw the *shape* of the difference and
  label nothing numerically. Both axes are qualitative: time runs from the
  first day to the exam, the vertical axis is "progress" with no scale, and
  the note underneath says in words that this is a diagram of an idea rather
  than a measurement.

  The shapes themselves are argued, not decorative. Studying alone is not flat
  — it rises, because effort does produce learning — it just rises slowly and
  unevenly, with the dips where a student loses a week to a topic they never
  diagnosed. The Gitus curve starts in the same place, because nobody begins
  ahead, and separates once the system starts removing the wasted motion.

  Drawn with stroke-dashoffset on first view: the two lines racing is the
  whole point, and a chart that is already finished when you arrive makes no
  argument at all.
*/

/* Both curves start at the same point (40, 252). Anything else would claim
   Gitus makes a student better before they have used it. */
const ALONE =
  "M40 252 C 110 244, 150 256, 210 242 S 300 238, 360 230 S 470 218, 560 208";
const WITH_GITUS =
  "M40 252 C 130 228, 180 188, 250 156 S 380 94, 470 72 S 532 60, 560 54";

const CLAIMS: Array<{ alone: string; gitus: string }> = [
  { alone: "«Ի՞նչ սովորեմ այսօր»", gitus: "Այսօրվա պլանը պատրաստ է" },
  { alone: "Սխալվում եմ և չգիտեմ ինչու", gitus: "Ամեն սխալ դասակարգվում է ըստ պատճառի" },
  { alone: "Ժամանակ՝ պատասխան փնտրելու վրա", gitus: "Բացատրությունը՝ տեղում" },
  { alone: "Չգիտեմ՝ առաջ եմ գնում, թե ոչ", gitus: "Առաջընթացը չափելի է" },
];

export function ProgressComparisonSection() {
  const ref = useRef<HTMLDivElement>(null);
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    /* Same fail-safe as Reveal: if the observer never fires the chart must
       still be readable, so anything already on screen draws immediately. */
    if (typeof IntersectionObserver === "undefined") {
      setDrawn(true);
      return;
    }
    const r = el.getBoundingClientRect();
    if (r.top < (window.innerHeight || 0) && r.bottom > 0) {
      const t = window.setTimeout(() => setDrawn(true), 60);
      return () => window.clearTimeout(t);
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setDrawn(true);
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Section id="difference" tone="night">
      <SectionHeading
        tone="night"
        kicker="Տարբերությունը"
        title="Նույն ջանքը։ Այլ արդյունք։"
        subtitle="Խնդիրը ջանք թափելը չէ։ Խնդիրը այն ժամանակն է, որ գնում է սխալ տեղը՝ ինչ սովորել որոշելու, սխալը հասկանալու, նորից սկսելու վրա։"
      />

      <div ref={ref} className="mx-auto mt-12 max-w-3xl">
        <svg
          viewBox="0 0 600 300"
          className="w-full"
          role="img"
          aria-label="Սխեմա՝ առանց Gitus-ի առաջընթացը դանդաղ է բարձրանում, Gitus-ով՝ զգալիորեն ավելի արագ և բարձր։"
        >
          {/* Baseline and the exam marker. No gridlines: there are no values
              to read off, and a grid would imply there are. */}
          <line x1="40" y1="262" x2="560" y2="262" stroke="var(--color-night-line)" strokeWidth="1" />
          <line
            x1="560"
            y1="40"
            x2="560"
            y2="262"
            stroke="var(--color-night-line)"
            strokeWidth="1"
            strokeDasharray="3 5"
          />

          <path
            d={ALONE}
            fill="none"
            stroke="var(--color-night-ink-dim)"
            strokeWidth="2.5"
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray={1}
            style={{
              strokeDashoffset: drawn ? 0 : 1,
              transition: "stroke-dashoffset 1.6s cubic-bezier(.3,.7,.4,1)",
            }}
          />
          <path
            d={WITH_GITUS}
            fill="none"
            stroke="var(--color-night-ink)"
            strokeWidth="3.5"
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray={1}
            style={{
              strokeDashoffset: drawn ? 0 : 1,
              /* Slightly slower and delayed, so the eye reads "alone" first
                 and then watches the other one leave it behind. */
              transition: "stroke-dashoffset 1.9s cubic-bezier(.3,.7,.4,1) .25s",
            }}
          />

          <g style={{ opacity: drawn ? 1 : 0, transition: "opacity .5s ease 1.6s" }}>
            <circle cx="560" cy="54" r="5" fill="var(--color-night-ink)" />
            <circle cx="560" cy="208" r="4" fill="var(--color-night-ink-dim)" />
          </g>

          <text x="40" y="284" fill="var(--color-night-ink-dim)" fontSize="13">
            Օր 1
          </text>
          <text x="560" y="284" textAnchor="end" fill="var(--color-night-ink-dim)" fontSize="13">
            Քննության օր
          </text>
          <text
            x="40"
            y="34"
            fill="var(--color-night-ink-dim)"
            fontSize="13"
            style={{ letterSpacing: "0.14em" }}
          >
            ԱՌԱՋԸՆԹԱՑ
          </text>
        </svg>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-7 gap-y-2">
          <span className="inline-flex items-center gap-2 text-[length:var(--text-sm)] text-night-ink">
            <span className="h-0.5 w-7 rounded-full bg-night-ink" aria-hidden />
            Gitus-ով
          </span>
          <span className="inline-flex items-center gap-2 text-[length:var(--text-sm)] text-night-ink-dim">
            <span className="h-0.5 w-7 rounded-full bg-night-ink-dim" aria-hidden />
            Առանց Gitus-ի
          </span>
        </div>
      </div>

      {/* Where the difference actually comes from. The chart shows that there
          is one; this says what it is made of. */}
      <ul className="mx-auto mt-12 grid max-w-3xl gap-px overflow-hidden rounded-[var(--radius-xl)] border border-night-line bg-night-line sm:grid-cols-2">
        <li className="bg-[var(--color-night)] px-5 py-3 text-[length:var(--text-xs)] font-semibold tracking-[0.18em] text-night-ink-dim uppercase sm:col-span-1">
          Առանց Gitus-ի
        </li>
        <li className="hidden bg-[var(--color-night)] px-5 py-3 text-[length:var(--text-xs)] font-semibold tracking-[0.18em] text-night-ink uppercase sm:block">
          Gitus-ով
        </li>
        {CLAIMS.map((c) => (
          <li key={c.alone} className="contents">
            <span className="bg-[var(--color-night)] px-5 py-4 text-[length:var(--text-sm)] text-night-ink-dim">
              {c.alone}
            </span>
            <span className="bg-[var(--color-night)] px-5 py-4 text-[length:var(--text-sm)] text-night-ink">
              {c.gitus}
            </span>
          </li>
        ))}
      </ul>

      <DemoNote tone="night" className="mt-6 text-center">
        Սխեմատիկ պատկեր՝ գաղափարը ցույց տալու համար։ Սրանք չափված տվյալներ չեն, և
        կոնկրետ արդյունքը կախված է քեզնից։
      </DemoNote>
    </Section>
  );
}
