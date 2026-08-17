import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ClipboardCheck, Sparkles, TrendingUp, Trophy } from "lucide-react";
import { Logo } from "../Logo";

/*
  The app's first screen when logged out — the native counterpart to the
  website's LandingPage. A 20-section marketing scroll is the wrong thing to
  open an installed app with: the user already downloaded it, so this sells
  the product in four swipes and gets out of the way of the two buttons that
  matter. RootRoute picks between the two by platform.
*/

interface Slide {
  icon: ReactNode;
  title: string;
  body: string;
}

const ICON_PROPS = { size: 30, strokeWidth: 1.75 } as const;

const SLIDES: Slide[] = [
  {
    icon: <Sparkles {...ICON_PROPS} />,
    title: "Հարցրու ցանկացած բան",
    body: "AI Tutor-ը բացատրում է բարդ թեմաները քայլ առ քայլ՝ քո տեմպով, օրվա ցանկացած ժամի։",
  },
  {
    icon: <ClipboardCheck {...ICON_PROPS} />,
    title: "Իրական քննական թեստեր",
    body: "Ամբողջական թեստեր՝ ժամանակաչափով, ավտոմատ ստուգմամբ և մանրամասն վերլուծությամբ։",
  },
  {
    icon: <TrendingUp {...ICON_PROPS} />,
    title: "Քո առաջընթացը՝ տեսանելի",
    body: "Սխալների տետր, անհատական ուսումնական պլան և օրական նպատակներ՝ մեկ տեղում։",
  },
  {
    icon: <Trophy {...ICON_PROPS} />,
    title: "Սովորիր ընկերների հետ",
    body: "Խաղասենյակներ, դասակարգում և XP՝ որպեսզի ամեն օր ուզենաս վերադառնալ։",
  },
];

const AUTO_ADVANCE_MS = 5000;

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function useCarousel(count: number) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [index, setIndex] = useState(0);
  // Mirrors `index` for the interval and the scroll handler, which both need
  // the current slide without re-subscribing on every change.
  const indexRef = useRef(0);
  // Once the user swipes themselves, the deck stops moving on its own —
  // a carousel that keeps stealing the slide back is worse than no carousel.
  const [autoplay, setAutoplay] = useState(!prefersReducedMotion());

  function setActive(next: number) {
    indexRef.current = next;
    setIndex(next);
  }

  /** Drives the dots directly rather than waiting for the scroll to echo back:
   *  a programmatic scrollTo isn't guaranteed to emit a scroll event, so a
   *  dot-driven jump would otherwise leave the dots pointing at the old slide. */
  function goTo(next: number) {
    setActive(next);
    const track = trackRef.current;
    track?.scrollTo({ left: next * track.clientWidth, behavior: "smooth" });
  }

  useEffect(() => {
    if (!autoplay) return;
    const timer = setInterval(() => goTo((indexRef.current + 1) % count), AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
    // goTo is stable in practice (it only touches refs and a setter) and
    // re-creating the interval on every slide change would reset the timer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoplay, count]);

  /** Manual swipes, where the scroll position is the source of truth. */
  function handleScroll() {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    const next = Math.round(track.scrollLeft / track.clientWidth);
    if (next !== indexRef.current) setActive(next);
  }

  return { trackRef, index, goTo, handleScroll, stopAutoplay: () => setAutoplay(false) };
}

export function MobileWelcome() {
  const { trackRef, index, goTo, handleScroll, stopAutoplay } = useCarousel(SLIDES.length);

  return (
    <div
      className="relative flex flex-col overflow-hidden bg-bg"
      style={{
        // dvh (not vh) so the layout doesn't sit under Safari's collapsing
        // toolbars when this same build is opened in a mobile browser.
        minHeight: "100dvh",
        paddingTop: "calc(var(--safe-top) + 1.5rem)",
        paddingBottom: "calc(var(--safe-bottom) + 1.25rem)",
        paddingLeft: "var(--safe-left)",
        paddingRight: "var(--safe-right)",
      }}
    >
      {/* Ambient brand glow — one soft light source, no competing blobs. */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-[-18%] left-1/2 h-[380px] w-[380px] -translate-x-1/2 rounded-full opacity-[0.18]"
        style={{ backgroundColor: "var(--color-primary)", filter: "blur(110px)" }}
      />

      <header className="relative flex flex-col items-center gap-3 px-6">
        <span className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-primary shadow-lg shadow-black/25">
          <Logo className="h-8 w-8 text-primary-contrast" />
        </span>
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-text">Gitus</h1>
          <p className="mt-1 text-sm text-text-muted">AI ուսումնական հարթակ</p>
        </div>
      </header>

      <div
        ref={trackRef}
        onScroll={handleScroll}
        onPointerDown={stopAutoplay}
        className="relative mt-8 flex flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {SLIDES.map((slide) => (
          <section
            key={slide.title}
            className="flex w-full flex-none snap-center flex-col items-center justify-center px-8 text-center"
          >
            <span className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-border bg-surface text-primary">
              {slide.icon}
            </span>
            <h2 className="text-balance text-[26px] leading-tight font-bold text-text">{slide.title}</h2>
            <p className="mt-3 max-w-xs text-[15px] leading-relaxed text-text-muted">{slide.body}</p>
          </section>
        ))}
      </div>

      <div className="relative mt-6 flex justify-center gap-2" role="tablist" aria-label="Ներկայացում">
        {SLIDES.map((slide, i) => (
          <button
            key={slide.title}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={slide.title}
            onClick={() => {
              stopAutoplay();
              goTo(i);
            }}
            // 44px tap target around a 2px-tall dot — the visible pill is the
            // child, so the control stays comfortably tappable.
            className="flex h-11 w-8 items-center justify-center"
          >
            <span
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === index ? "w-6 bg-primary" : "w-1.5 bg-border"
              }`}
            />
          </button>
        ))}
      </div>

      <div className="relative mt-2 flex flex-col gap-3 px-6">
        <Link
          to="/register"
          className="bg-primary btn-fx w-full rounded-2xl py-4 text-center text-[17px] font-semibold text-primary-contrast shadow-lg shadow-violet-600/25"
        >
          Ստեղծել հաշիվ
        </Link>
        <Link
          to="/login"
          className="w-full rounded-2xl border border-border bg-surface py-4 text-center text-[17px] font-semibold text-text"
        >
          Մուտք գործել
        </Link>
      </div>
    </div>
  );
}
