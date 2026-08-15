import { useAuth } from "../auth/AuthContext";
import { HomePage } from "../pages/HomePage";
import { LandingPage } from "../pages/LandingPage";
import { AppChrome } from "./ProtectedRoute";

/** "/" is the only route that differs by auth state: marketing page when logged out, dashboard when logged in. */
export function RootRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[var(--color-text-muted)]">
        Բեռնվում է...
      </div>
    );
  }

  if (!user) return <LandingPage />;

  return (
    <AppChrome>
      <HomePage />
    </AppChrome>
  );
}
