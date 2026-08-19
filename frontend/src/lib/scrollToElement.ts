/*
  Scroll an element into view, honouring reduced-motion.

  Why this exists
  ---------------
  The codebase called `scrollIntoView({ behavior: "smooth" })` directly in
  several places (the exam question navigator, the subtopic lesson stepper,
  the "jump to exercises" button). Two problems with that:

  1. It ignores `prefers-reduced-motion`. A scripted smooth scroll is exactly
     the kind of vestibular trigger that setting exists to suppress, and CSS
     cannot override the behavior passed explicitly in JS.
  2. More practically, it was observed **not scrolling at all** under reduced
     motion in Chromium: `scrollIntoView({behavior:"smooth"})` left scrollTop
     at 0, while the same call without the option scrolled correctly. So the
     exam's jump-to-question navigation silently did nothing for exactly the
     users who had asked for less animation.

  Reading the media query at call time (rather than through a hook) keeps this
  usable from plain event handlers and always reflects the current setting.
*/

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/*
  Smooth scrolling is requested, never depended on.

  Observed while verifying the exam question navigator: in some Chromium
  configurations `behavior: "smooth"` is not merely instant, it is a complete
  no-op — `window.scrollTo({top: 5000, behavior: "smooth"})` left scrollY at 0
  while the identical call with `behavior: "auto"` moved to 5000. Automated
  and accessibility-hardened browsers are the common cases. A navigator that
  silently does nothing is a functional failure, not a missing flourish, so
  the animated scroll is attempted and then *verified*: if the position has
  not changed by the next frames, it is applied instantly instead.
*/
const SETTLE_CHECK_MS = 120;

function scrollWithFallback(target: number): void {
  const start = window.scrollY;
  const wanted = Math.max(0, Math.round(target));
  if (Math.abs(wanted - start) < 2) return;

  if (prefersReducedMotion()) {
    window.scrollTo({ top: wanted, behavior: "auto" });
    return;
  }

  window.scrollTo({ top: wanted, behavior: "smooth" });
  window.setTimeout(() => {
    // Nothing moved at all — the browser ignored the animated scroll.
    if (Math.abs(window.scrollY - start) < 2) {
      window.scrollTo({ top: wanted, behavior: "auto" });
    }
  }, SETTLE_CHECK_MS);
}

export function scrollToElement(
  element: HTMLElement | null | undefined,
  offset = 0,
): void {
  if (!element) return;
  scrollWithFallback(element.getBoundingClientRect().top + window.scrollY - offset);
}

/** Scroll the window to the top, with the same contract. */
export function scrollWindowToTop(): void {
  scrollWithFallback(0);
}
