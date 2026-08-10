import { useEffect, useState } from "react";

/** JS-side read of the same `prefers-reduced-motion` query the global CSS rule in index.css
 * already respects for CSS transitions/animations — needed only for effects that decide
 * whether to run at all in JS (e.g. skipping a confetti burst, an XP count-up loop). */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return reduced;
}
