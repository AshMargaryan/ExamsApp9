import { lazy } from "react";
import { useAuth } from "../auth/AuthContext";
import { useIsNativeApp } from "../lib/platform";
import { AppChrome } from "./ProtectedRoute";

/*
  "/" is the only route that differs by auth state: marketing page when logged
  out, dashboard when logged in. Inside the native shell the marketing page is
  replaced by MobileWelcome — the app's own first screen.

  All three branches are lazy, and that matters more than it looks. This
  component was imported statically by App.tsx, and it in turn imported
  LandingPage and HomePage statically — so the entry chunk every route
  downloaded contained the whole marketing page AND the logged-in dashboard.
  A student opening /login was paying for both, which is precisely what the
  comment above App.tsx's lazy block claims does not happen ("the initial
  bundle is just the auth screens"). Measured before this change: 720 kB raw,
  200 kB gzip, containing strings from SubjectJourney, HomePage and Hero.

  Only one of these ever resolves per render, so the cost moves to the branch
  that is actually taken. App.tsx already wraps the routes in a Suspense
  boundary whose fallback is the same "Բեռնվում է..." screen this component
  used to render itself, so the loading state is unchanged for the viewer.
*/
const LandingPage = lazy(() =>
  import("../pages/LandingPage").then((m) => ({ default: m.LandingPage })),
);
const HomePage = lazy(() => import("../pages/HomePage").then((m) => ({ default: m.HomePage })));
const MobileWelcome = lazy(() =>
  import("./mobile/MobileWelcome").then((m) => ({ default: m.MobileWelcome })),
);

export function RootRoute() {
  const { user, isLoading } = useAuth();
  const isNative = useIsNativeApp();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[var(--color-text-muted)]">
        Բեռնվում է...
      </div>
    );
  }

  if (!user) return isNative ? <MobileWelcome /> : <LandingPage />;

  return (
    <AppChrome>
      <HomePage />
    </AppChrome>
  );
}
