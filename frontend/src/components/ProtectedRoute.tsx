import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { AssistantLaunchProvider } from "../contexts/AssistantLaunchContext";
import { ChatWidgetProvider } from "../context/ChatWidgetContext";
import { NotepadProvider } from "../context/NotepadContext";
import { AppSidebar } from "./AppSidebar";
import { FloatingAssistantWidget } from "./assistant/FloatingAssistantWidget";
import { FloatingChatWidget } from "./chat/FloatingChatWidget";
import { HeaderStrip } from "./HeaderStrip";
import { ReloadButton } from "./ReloadButton";
import { ToolsDock } from "./ToolsDock";

/** Shared chrome (header strip, sidebar, notifications, assistant widget, floating
 * tools) for any authenticated page. */
export function AppChrome({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  // AI assistant, calculator, and notepad are study tools for students — parents
  // have no use for them on their read-only family dashboard.
  const showStudyTools = user?.role !== "parent";

  return (
    <AssistantLaunchProvider>
      <NotepadProvider>
        <ChatWidgetProvider>
          <HeaderStrip />
          <AppSidebar />
          {/* Clears the persistent top strip (h-16) at every viewport width, not just mobile —
           * the strip used to be just a mobile-only hamburger offset before HeaderStrip shipped. */}
          <div className="pt-16">{children}</div>
          <ReloadButton />
          {showStudyTools && <FloatingAssistantWidget />}
          {showStudyTools && <ToolsDock />}
          <FloatingChatWidget />
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
