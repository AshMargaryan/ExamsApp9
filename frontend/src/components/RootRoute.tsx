import { useAuth } from "../auth/AuthContext";
import { useIsNativeApp } from "../lib/platform";
import { HomePage } from "../pages/HomePage";
import { LandingPage } from "../pages/LandingPage";
import { MobileWelcome } from "./mobile/MobileWelcome";
import { AppChrome } from "./ProtectedRoute";

/** "/" is the only route that differs by auth state: marketing page when logged out, dashboard when logged in.
 *  Inside the native shell the marketing page is replaced by MobileWelcome — the app's own first screen. */
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
