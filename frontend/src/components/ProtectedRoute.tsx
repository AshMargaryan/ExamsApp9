import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { AssistantLaunchProvider } from "../contexts/AssistantLaunchContext";
import { ChatWidgetProvider } from "../context/ChatWidgetContext";
import { NotepadProvider } from "../context/NotepadContext";
import { useIsNativeApp } from "../lib/platform";
import { AppSidebar } from "./AppSidebar";
import { FloatingAssistantWidget } from "./assistant/FloatingAssistantWidget";
import { FloatingChatWidget } from "./chat/FloatingChatWidget";
import { HeaderStrip } from "./HeaderStrip";
import { HomeLogoButton } from "./HomeLogoButton";
import { MobileShell } from "./mobile/MobileShell";
import { ReloadButton } from "./ReloadButton";
import { ToolsDock } from "./ToolsDock";

/** Shared chrome for any authenticated page. On the web that's the header strip,
 * sidebar drawer, and floating widgets — the full header strip only renders on "/",
 * every other page gets a single small logo button back to home instead. Inside the
 * native shell it's MobileShell (top bar + bottom tab bar) instead; the providers
 * wrap both, since pages consume them regardless of platform. */
export function AppChrome({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const isNative = useIsNativeApp();
  const isHome = pathname === "/";
  // AI assistant, calculator, and notepad are study tools for students — parents
  // have no use for them on their read-only family dashboard.
  const showStudyTools = user?.role !== "parent";

  return (
    <AssistantLaunchProvider>
      <NotepadProvider>
        <ChatWidgetProvider>
          {isNative ? (
            <MobileShell>{children}</MobileShell>
          ) : (
            <>
              {isHome ? <HeaderStrip /> : <HomeLogoButton />}
              <AppSidebar />
              {/* Clears the persistent top strip (h-16) only where it's actually rendered —
               * non-home pages have no header strip to clear. */}
              <div className={isHome ? "pt-16" : undefined}>{children}</div>
              <ReloadButton />
              {showStudyTools && <FloatingAssistantWidget />}
              {showStudyTools && <ToolsDock />}
              <FloatingChatWidget />
            </>
          )}
        </ChatWidgetProvider>
      </NotepadProvider>
    </AssistantLaunchProvider>
  );
}

export function ProtectedRoute() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[var(--color-text-muted)]">
        Բեռնվում է...
      </div>
    );
  }

  // Preserve the originally requested page (e.g. an invite link) so login
  // can send the user back there instead of always landing on "/".
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  return (
    <AppChrome>
      <Outlet />
    </AppChrome>
  );
}
