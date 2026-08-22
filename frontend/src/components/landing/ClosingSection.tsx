import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { TOTAL_EXAMS, TOTAL_QUESTIONS, LIVE_SUBJECTS } from "./subjectUniverseData";

/*
  MOVEMENT 7d — the payoff, and the page's only remaining call to action.

  The page opens on the night ground with one unanswered question and closes there
  with five of them answered. That bookend is the argument; everything between
  is the evidence.

  This is the idea the old page rendered as a four-row HTML table
  (`BeforeAfterSection`) — the most emotionally loaded content it had, set as
  a two-column grid of grey text. Here the rows arrive scattered, unaligned
  and rotated, and *assemble* as the reader scrolls: the visual language of
  the product is literally "this gets organised".

  Mechanically this is the same technique as `subjectJourney.css` and for the
  same reason: one rAF-throttled handler writes a single custom property,
  `--t`, and every transform below is CSS. React re-renders zero times during
  the scroll.
*/

const ROWS = [
  {
    q: "Ի՞նչ սովորեմ հիմա։",
    a: "Օրվա պլան՝ երեք առաջադրանք, մոտ 55 րոպե։",
    dx: "-180px",
    dy: "-40px",
    rot: "-7deg",
  },
  {
    q: "Ինչու՞ սխալվեցի։",
    a: "Սխալի պատճառը՝ հասկացողության բաց, ոչ թե անուշադրություն։",
    dx: "150px",
    dy: "-70px",
    rot: "5deg",
  },
  {
    q: "Առաջ գնու՞մ եմ։",
    a: "Տիրապետում՝ ըստ թեմաների, վերջին 30 օրվա կրկնակի կշռով։",
    dx: "-130px",
    dy: "60px",
    rot: "6deg",
  },
  {
    q: "Ի՞նչ անեմ վաղը։",
    a: "Վաղվա պլանն արդեն վերադասավորվել է քո երեկվա սխալներից։",
    dx: "170px",
    dy: "50px",
    rot: "-5deg",
  },
  {
    q: "Ո՞ւմ հարցնեմ գիշերվա մեկին։",
    a: "AI Tutor՝ ակնարկ, ամբողջական բացատրություն կամ նմանատիպ խնդիր։",
    dx: "-90px",
    dy: "100px",
    rot: "4deg",
  },
];

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export function ClosingSection() {
  const outerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  /*
    Two independent reasons to skip the choreography and render the finished
    composition directly.

    `reduce` is the obvious one. The other two are about whether the
    choreography can physically work:

    * Below 768 a row displaced far enough to read as "scattered" on a 1440px
      stage is simply off-screen on a 360px one, and unreadable on the way.
    * A `sticky` element taller than its scrollport does not pin — it scrolls,
      jams at its own bottom edge, and the composition slides while --t keeps
      advancing. Measured at 800x640 the assembled column is 1058px against a
      640px viewport, so this is not hypothetical: it is any short window, and
      a media query cannot express it because it depends on the content.

    In all three cases the transformation is not scaled down, it is dropped,
    and the section becomes what it is for: five answers and a button.
  */
  const [statik, setStatik] = useState(
    /* Resolved during the first render, not after it. Defaulting to `true`
       and correcting in an effect would paint the assembled column once and
       then yank it apart, which looks like a bug rather than an entrance.
       Defaulting to `false` would do the reverse on a phone: a flash of
       scattered, illegible cards. */
    () =>
      typeof window === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      window.matchMedia("(max-width: 767px)").matches,
  );

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const narrow = window.matchMedia("(max-width: 767px)");
    /* The content div's own height is the same in both modes — only the
       wrapper's runway and stickiness change — so this measurement is stable
       and cannot oscillate between the two states. */
    const sync = () =>
      setStatik(
        reduce.matches ||
          narrow.matches ||
          (contentRef.current?.offsetHeight ?? 0) > window.innerHeight,
      );
    sync();
    reduce.addEventListener("change", sync);
    narrow.addEventListener("change", sync);
    window.addEventListener("resize", sync);
    return () => {
      reduce.removeEventListener("change", sync);
      narrow.removeEventListener("change", sync);
      window.removeEventListener("resize", sync);
    };
  }, []);

  useEffect(() => {
    if (statik) return;
    const el = outerRef.current;
    if (!el) return;

    let frame = 0;
    const apply = () => {
      frame = 0;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      /* The sticky stage is pinned for (outer height - vh) of scrolling; --t
         is how far through that range the reader is. Finishing at 0.75 leaves
         a beat of the assembled state on screen before the section releases,
         so the payoff is read rather than glimpsed. */
      const travel = Math.max(1, rect.height - vh);
      const scrolled = clamp(-rect.top / travel, 0, 1);
      el.style.setProperty("--t", clamp(scrolled / 0.75, 0, 1).toFixed(3));
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
  }, [statik]);

  return (
    /* `overflow-hidden`: a fragment displaced by 180px at t=0 is wider than a
       375px viewport, and a transform *does* extend the scrollable area. */
    <section className="lp-night overflow-hidden" aria-labelledby="closing-title">
      {/*
        The static path gets no scroll runway at all. Keeping 220vh of height
        while pinning the transforms would leave a reader who cannot see the
        animation — or whose phone never ran it — scrolling through two blank
        viewports to reach the button.
      */}
      <div
        ref={outerRef}
        style={{ "--t": statik ? 1 : 0 } as React.CSSProperties}
        className={statik ? "" : "relative h-[220vh]"}
      >
        <div className={`flex items-center ${statik ? "" : "sticky top-0 min-h-screen"}`}>
          <div ref={contentRef} className="mx-auto w-full max-w-3xl px-4 py-24 sm:px-6 lg:px-8">
            <h2
              id="closing-title"
              className="font-display text-balance text-center text-[clamp(2rem,5vw,3.25rem)] leading-[var(--leading-display)] font-normal text-night-ink"
            >
              Նույն հարցերը։ Ուրիշ պատասխաններ։
            </h2>

            <ul className="mt-12 flex flex-col gap-3">
              {ROWS.map((row) => (
                <li
                  key={row.q}
                  className="lp-fragment lp-night-panel grid gap-2 rounded-[var(--radius-lg)] px-5 py-4 sm:grid-cols-2 sm:items-baseline sm:gap-6"
                  style={
                    {
                      "--dx": row.dx,
                      "--dy": row.dy,
                      "--rot": row.rot,
                    } as React.CSSProperties
                  }
                >
                  <span className="text-[length:var(--text-base)] leading-[var(--leading-snug)] text-night-ink-dim">
                    {row.q}
                  </span>
                  <span className="lp-assembled text-[length:var(--text-base)] leading-[var(--leading-snug)] font-medium text-night-ink">
                    {row.a}
                  </span>
                </li>
              ))}
            </ul>

            {/*
              Deliberately NOT `lp-assembled`. The capability strip and the
              page's single call to action are the two things that must be
              readable and reachable at every value of --t: an opacity-0
              button is still in the tab order, so tying the primary CTA to
              scroll progress would hand a keyboard user an invisible target.
              Only the answers fade in.
            */}
            <div className="mt-12 text-center">
              {/* The only unfakeable proof on the page, and it was previously
                  stated once, in a footer line inside another section. */}
              <p className="text-[length:var(--text-base)] text-night-ink-muted">
                <b className="font-semibold tabular-nums text-night-ink">{LIVE_SUBJECTS.length}</b>{" "}
                առարկա հարցաշարով ·{" "}
                <b className="font-semibold tabular-nums text-night-ink">{TOTAL_EXAMS}</b> փորձնական
                քննություն ·{" "}
                <b className="font-semibold tabular-nums text-night-ink">
                  {TOTAL_QUESTIONS.toLocaleString("hy-AM")}
                </b>{" "}
                հարց
              </p>

              <Link
                to="/register"
                className="mt-8 inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-full)] bg-night-ink px-8 py-3.5 text-[length:var(--text-base)] font-semibold text-night transition-opacity hover:opacity-90"
              >
                Կառուցել իմ ուղին
                <ArrowRight size={18} strokeWidth={2} aria-hidden />
              </Link>

              <p className="mt-4 text-[length:var(--text-sm)] text-night-ink-dim">
                Անվճար։ Մի քանի հարց, և առաջին քայլդ պատրաստ է։
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
