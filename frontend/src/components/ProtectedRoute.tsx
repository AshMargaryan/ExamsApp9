import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { FloatingAssistantWidget } from "./assistant/FloatingAssistantWidget";
import { NotificationBell } from "./notifications/NotificationBell";
import { ReloadButton } from "./ReloadButton";
import { AssignmentSidebar } from "./teaching/AssignmentSidebar";

export function ProtectedRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[var(--color-text-muted)]">
        Բեռնվում է...
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

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