import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * ENTER — the first of the page's four motion verbs (see landing.css).
 * Rises 12px into place the first time it crosses into view.
 *
 * `prefers-reduced-motion` is neutralized globally (index.css sets
 * animation/transition durations to ~0), so this stays a no-op there.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    /*
      The resting state is `opacity-0`, so anything this wraps is invisible
      until the observer says otherwise — and an observer that never fires
      leaves the content permanently gone, with no error and nothing on
      screen. That is not hypothetical: IntersectionObserver callbacks are
      deferred in a backgrounded tab, and the subscription page's trust row
      was observed sitting at `opacity: 0` while fully inside the viewport.
      A marketing page whose entire body is wrapped in this cannot depend on
      a callback it has no fallback for.

      So there are three independent ways to become visible, in descending
      order of preference:

        1. the observer fires          — the scroll effect, the normal path
        2. already on screen at mount  — measured directly, one tick later
        3. the idle net                — an unconditional reveal once the
                                         browser is quiet, for the tab that
                                         was never foregrounded at all

      (3) is the one that makes this safe rather than merely careful. (2)
      only helps content that happens to be above the fold; a backgrounded
      tab scrolled halfway down the page satisfies neither (1) nor (2), and
      before the net that content stayed invisible until the reader scrolled
      it *out* and back in.

      The `setTimeout(0)` in (2) keeps the fade — setting state in the same
      tick as the first paint would skip the transition and snap it in.
    */
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const inViewport = () => {
      const r = el.getBoundingClientRect();
      return r.bottom > 0 && r.top < (window.innerHeight || 0);
    };

    const timer = window.setTimeout(() => {
      if (inViewport()) setVisible(true);
    }, 0);

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(el);

    /* Safari has no requestIdleCallback; a 2s timer is the same guarantee,
       just less polite about when it takes it. */
    const idle: { cancel: () => void } =
      typeof window.requestIdleCallback === "function"
        ? (() => {
            const id = window.requestIdleCallback(() => setVisible(true), { timeout: 2000 });
            return { cancel: () => window.cancelIdleCallback(id) };
          })()
        : (() => {
            const id = window.setTimeout(() => setVisible(true), 2000);
            return { cancel: () => window.clearTimeout(id) };
          })();

    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
      idle.cancel();
    };
  }, []);

  return (
    <div
      ref={ref}
      /* 320ms / 12px, not the 700ms / 24px this used to run. At three-quarters
         of a second the fade stopped reading as content arriving and started
         reading as an effect the reader had to wait out — on a page where
         nearly every block is wrapped in one. */
      className={`transition-all duration-[var(--motion-normal)] ease-[var(--ease-out)] ${
        visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
