import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function getInitialTheme(): Theme {
  const stored = localStorage.getItem("theme");
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * Applies the saved theme choice to <html> as soon as the app boots, so a
 * stored preference holds on every page — not just once the toggle button
 * (currently only rendered on the home page) has mounted at least once.
 */
export function applyStoredTheme() {
  const stored = localStorage.getItem("theme");
  if (stored === "light" || stored === "dark") {
    document.documentElement.setAttribute("data-theme", stored);
  }
}

/** Manual light/dark override, persisted in localStorage; falls back to OS preference. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }

  return { theme, toggleTheme };
}
