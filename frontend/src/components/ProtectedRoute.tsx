import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { FloatingAssistantWidget } from "./assistant/FloatingAssistantWidget";
import { NotificationBell } from "./notifications/NotificationBell";
import { ReloadButton } from "./ReloadButton";
import { AssignmentSidebar } from "./teaching/AssignmentSidebar";

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
    <>
      <Outlet />
      <ReloadButton />
      <NotificationBell />
      {user.role === "student" && <AssignmentSidebar />}
      <FloatingAssistantWidget />
    </>
  );
}