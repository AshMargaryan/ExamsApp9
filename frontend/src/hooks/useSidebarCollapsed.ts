import { useEffect, useState } from "react";

const STORAGE_KEY = "sidebarCollapsed";

function getInitialCollapsed(): boolean {
  return localStorage.getItem(STORAGE_KEY) === "true";
}

/**
 * Applies the saved rail-collapsed choice to <html> as soon as the app boots,
 * mirroring applyStoredTheme — so the desktop rail renders at its stored
 * width on first paint rather than flashing open before AppSidebar mounts.
 */
export function applyStoredSidebarCollapsed() {
  if (getInitialCollapsed()) {
    document.documentElement.setAttribute("data-rail-collapsed", "true");
  }
}

/** Desktop nav rail collapse (icon-only) state, persisted in localStorage. */
export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState<boolean>(getInitialCollapsed);

  useEffect(() => {
    if (collapsed) {
      document.documentElement.setAttribute("data-rail-collapsed", "true");
    } else {
      document.documentElement.removeAttribute("data-rail-collapsed");
    }
    localStorage.setItem(STORAGE_KEY, String(collapsed));
  }, [collapsed]);

  return { collapsed, toggleCollapsed: () => setCollapsed((c) => !c) };
}
