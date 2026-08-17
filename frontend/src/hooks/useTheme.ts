import { useEffect, useState } from "react";

type Theme = "light" | "dark";

/*
  Violet-on-black (#7C3AED on #000000) is the brand, not a dark-mode variant of
  it, so the app opens dark for everyone. Light remains available as an explicit
  choice.

  The key is deliberately not the old "theme": the previous implementation wrote
  the OS preference to storage on mount, so almost every existing visitor has a
  "light"/"dark" value they never actually chose. Honouring those would mean the
  brand default never reaches them. Reading a fresh key ignores the auto-written
  values, and only a real toggle writes to it.
*/
const THEME_KEY = "theme.choice";

function storedChoice(): Theme | null {
  const stored = localStorage.getItem(THEME_KEY);
  return stored === "light" || stored === "dark" ? stored : null;
}

/**
 * Applies the saved theme choice to <html> as soon as the app boots, so a
 * stored preference holds on every page — not just once the toggle button
 * (currently only rendered on the home page) has mounted at least once.
 */
export function applyStoredTheme() {
  document.documentElement.setAttribute("data-theme", storedChoice() ?? "dark");
}

/** Manual light/dark override; defaults to the brand dark theme. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => storedChoice() ?? "dark");

  // Reflects the current theme onto <html>. Deliberately does NOT persist —
  // writing here is what turned a passive default into a stored "choice".
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      localStorage.setItem(THEME_KEY, next);
      return next;
    });
  }

  return { theme, toggleTheme };
}
