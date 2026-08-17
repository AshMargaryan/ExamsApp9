import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { ToolsDock } from "../ToolsDock";
import { MobileTabBar } from "./MobileTabBar";
import { MobileTopBar } from "./MobileTopBar";

/** Authenticated routes that are still part of a linear flow rather than a
 *  destination — they own the whole screen, and showing a tab bar under them
 *  would invite the user to wander off mid-task. */
const CHROMELESS_ROUTES = ["/verify-email"];

/*
  Chrome for every authenticated page inside the native shell — the counterpart
  to AppChrome's sidebar + header strip + floating widgets.

  What's deliberately dropped versus the web chrome:
   - the hamburger drawer, replaced by the bottom tab bar;
   - the floating AI-assistant and chat launchers, because AI Օգնական and Չաթ
     are tabs now and two bubbles parked over the tab bar would just cover it;
   - the reload button, which reads as a browser control inside an app.
  ToolsDock stays (calculator/notepad are needed mid-practice) but its launcher
  is lifted above the tab bar by the html[data-native] rule in theme.css.
*/
export function MobileShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const showStudyTools = user?.role !== "parent";

  if (CHROMELESS_ROUTES.includes(pathname)) return <>{children}</>;

  return (
    <>
      <MobileTopBar />
      <div
        style={{
          paddingTop: "calc(var(--safe-top) + var(--mobile-topbar-h))",
          paddingBottom: "calc(var(--safe-bottom) + var(--mobile-tabbar-h))",
        }}
      >
        {children}
      </div>
      {showStudyTools && <ToolsDock />}
      <MobileTabBar role={user!.role} />
    </>
  );
}
