import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Fades/slides children into place the first time they cross into view.
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

      So anything already on screen at mount is revealed directly. The
      `setTimeout(0)` keeps the fade — setting state in the same tick as the
      first paint would skip the transition and snap it in — and the
      observer still handles everything below the fold, which is where the
      scroll effect is actually wanted.
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
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
