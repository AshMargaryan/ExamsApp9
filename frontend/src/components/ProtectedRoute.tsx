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
import { MobileShell } from "./mobile/MobileShell";
import { ReloadButton } from "./ReloadButton";
import { ToolsDock } from "./ToolsDock";

/** Shared chrome for any authenticated page. On the web that's the persistent header
 * strip, sidebar drawer, and floating widgets — the theme toggle, notifications, and
 * profile menu need to be reachable from every page, not just "/". Inside the native
 * shell it's MobileShell (top bar + bottom tab bar) instead; the providers wrap both,
 * since pages consume them regardless of platform. */
export function AppChrome({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const isNative = useIsNativeApp();
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
              <HeaderStrip />
              <AppSidebar />
              {/* Clears the persistent top strip (h-16) and the desktop nav rail,
               * which is 0-width below lg (see --rail-w in theme.css).
               *
               * The bottom padding clears the two floating launchers pinned to
               * the bottom corners. Without it the last thing on a page sits
               * underneath one of them permanently — no amount of scrolling
               * moves a fixed element — so a page's final action could be
               * unreachable. Reserving the space here rather than in each page
               * keeps it correct for the ~45 routes at once, and it is the
               * only place that knows whether the launchers are mounted at
               * all (the native shell renders none of this). */}
              <div className="pb-[84px] pl-[var(--rail-w)] pt-16">{children}</div>
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
