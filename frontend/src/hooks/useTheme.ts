import { useCallback, useSyncExternalStore } from "react";

export type Theme = "light" | "dark";
/** What the student chose. `system` is a real, reachable state — not just the
 *  absence of a first choice. */
export type ThemePreference = Theme | "system";

const STORAGE_KEY = "theme";

/*
  Why this is a store and not `useState` in a hook.

  Two things read the theme at once on /settings: the toggle in the header
  strip and the appearance section on the page. With per-component state,
  changing the theme in one left the other rendering its old icon until
  something else re-rendered it. `useSyncExternalStore` over one module-level
  value keeps every consumer on the same answer.

  It also gives the OS media query a single listener instead of one per
  consumer, which matters because `system` is now a preference a student can
  actually sit on: if they do, the app has to follow the OS *live* (a phone
  flipping to dark at sunset), not only at boot.
*/

const listeners = new Set<() => void>();
const darkQuery = typeof window !== "undefined" ? window.matchMedia("(prefers-color-scheme: dark)") : null;

function readStoredPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    return "system";
  }
}

let preference: ThemePreference = readStoredPreference();

function resolve(pref: ThemePreference): Theme {
  if (pref !== "system") return pref;
  return darkQuery?.matches ? "dark" : "light";
}

/** Snapshot must be a stable primitive — `useSyncExternalStore` compares by
 *  identity, so returning a fresh `{theme, preference}` object each call would
 *  loop forever. Consumers get the pair by splitting this string. */
function getSnapshot(): string {
  return `${preference}|${resolve(preference)}`;
}

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1) darkQuery?.addEventListener("change", onSystemChange);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) darkQuery?.removeEventListener("change", onSystemChange);
  };
}

function onSystemChange() {
  if (preference === "system") {
    applyToDocument();
    emit();
  }
}

function applyToDocument() {
  const root = document.documentElement;
  // `system` removes the attribute rather than stamping the resolved value, so
  // the `prefers-color-scheme` media query in theme.css stays in charge — the
  // three-state setup the stylesheet was written for.
  if (preference === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", preference);
}

/**
 * Applies the saved theme choice to <html> as soon as the app boots, so a
 * stored preference holds on every page — not just once a toggle has mounted.
 */
export function applyStoredTheme() {
  preference = readStoredPreference();
  applyToDocument();
}

export function setThemePreference(next: ThemePreference) {
  preference = next;
  try {
    // `system` is stored as the *absence* of a value, which is also what a
    // brand-new visitor has. One representation for one state.
    if (next === "system") localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Storage unavailable — the choice still holds for this session.
  }
  applyToDocument();
  emit();
}

/**
 * Light/dark/system preference plus the theme it currently resolves to.
 *
 * Note what this deliberately no longer does: the previous version wrote
 * `localStorage.theme` from an effect on every mount, so merely rendering the
 * header once converted a student who was following their OS into a pinned
 * light or dark choice they could never get back out of. Persistence now
 * happens only when someone actually picks something.
 */
export function useTheme() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => "system|light");
  const [pref, resolved] = snapshot.split("|") as [ThemePreference, Theme];

  const setPreference = useCallback((next: ThemePreference) => setThemePreference(next), []);
  const toggleTheme = useCallback(() => setThemePreference(resolved === "dark" ? "light" : "dark"), [resolved]);

  return { theme: resolved, preference: pref, setPreference, toggleTheme };
}
