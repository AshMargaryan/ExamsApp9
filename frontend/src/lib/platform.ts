/*
  Hybrid platform detection — the single place that answers "are we running
  inside the Capacitor iOS shell, or in a normal web browser?"

  Everything mobile-specific (the in-app welcome screen, the native auth
  layout, the bottom tab bar) branches on `isNativeApp()`, so the web build
  keeps its existing marketing page and sidebar untouched.
*/
import { Capacitor } from "@capacitor/core";

export type AppPlatform = "ios" | "android" | "web";

/** Lets the native shell be previewed in a desktop browser during development:
 *  append `?native=1` to any URL (and `?native=0` to go back). The choice is
 *  remembered so client-side navigation doesn't drop it. Ignored in production
 *  builds — a real user on the website must never get the app-only chrome. */
const OVERRIDE_KEY = "gitus.nativeShellPreview";

function readOverride(): boolean | null {
  if (!import.meta.env.DEV || typeof window === "undefined") return null;

  const param = new URLSearchParams(window.location.search).get("native");
  if (param === "1" || param === "0") {
    const forced = param === "1";
    try {
      window.localStorage.setItem(OVERRIDE_KEY, String(forced));
    } catch {
      /* private mode — the query param still covers this page load */
    }
    return forced;
  }

  try {
    const stored = window.localStorage.getItem(OVERRIDE_KEY);
    if (stored === "true") return true;
    if (stored === "false") return false;
  } catch {
    /* storage unavailable — fall through to real platform detection */
  }
  return null;
}

// Resolved once: the platform cannot change mid-session, and re-reading
// localStorage on every render of every screen would be wasteful.
let cached: { native: boolean; platform: AppPlatform } | null = null;

function resolve() {
  if (cached) return cached;

  const override = readOverride();
  const real = Capacitor.getPlatform() as AppPlatform;
  const native = override ?? Capacitor.isNativePlatform();
  // Under the dev override there is no real device, so present as iOS —
  // that's the platform this shell is designed against.
  const platform: AppPlatform = native && real === "web" ? "ios" : real;

  cached = { native, platform };
  return cached;
}

/** True when the app is running inside the native shell (or the dev preview override). */
export function isNativeApp(): boolean {
  return resolve().native;
}

export function getPlatform(): AppPlatform {
  return resolve().platform;
}

export function isIos(): boolean {
  return getPlatform() === "ios";
}

/** Stamps `data-native="ios"` on <html> so CSS can gate app-only rules
 *  (safe-area padding, no overscroll bounce, no tap highlight) without every
 *  component having to thread a prop down. Called once from main.tsx. */
export function applyPlatformAttributes(): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (isNativeApp()) root.dataset.native = getPlatform();
  else delete root.dataset.native;
}

/** Hook form for components. The value is constant for the session, so this
 *  is deliberately not stateful — it just keeps call sites idiomatic. */
export function useIsNativeApp(): boolean {
  return isNativeApp();
}

/** Test-only: clears the memoized result so a spec can re-resolve. */
export function resetPlatformCache(): void {
  cached = null;
}
