import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useNavItems } from "./nav/navItems";

export function AppSidebar() {
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const navItems = useNavItems(user!.role);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => setOpen(false), [location.pathname]);

  return (
    <>
      <button
        type="button"
        aria-label="Ցույց տալ/թաքցնել ցանկը"
        onClick={() => setOpen((o) => !o)}
        className="fixed left-4 top-4 z-[70] flex h-11 w-11 flex-col items-center justify-center gap-[5px] rounded-full border border-border bg-surface shadow-lg transition-colors hover:border-primary"
      >
        <span
          className="h-0.5 w-5 rounded-full bg-text transition-transform duration-300"
          style={{ transform: open ? "translateY(7px) rotate(45deg)" : "none" }}
        />
        <span className={`h-0.5 w-5 rounded-full bg-text transition-opacity duration-150 ${open ? "opacity-0" : "opacity-100"}`} />
        <span
          className="h-0.5 w-5 rounded-full bg-text transition-transform duration-300"
          style={{ transform: open ? "translateY(-7px) rotate(-45deg)" : "none" }}
        />
      </button>

      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-[50] bg-black/45 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <nav
        aria-label="Հիմնական"
        className={`fixed left-0 top-0 z-[60] flex h-full w-[min(300px,86vw)] flex-col gap-1 border-r border-border bg-surface px-3 pb-4 pt-20 shadow-xl transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-[105%]"
        }`}
      >
        <div className="flex flex-1 flex-col gap-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`relative flex items-center gap-3 rounded-[var(--radius)] px-3.5 py-2.5 text-[15px] font-medium transition-colors ${
                  active ? "bg-primary/10 text-primary" : "text-text hover:bg-surface-muted"
                }`}
              >
                <span className="flex-none">{item.icon}</span>
                <span>{item.label}</span>
                {!!item.badge && (
                  <span className="ml-auto flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-incorrect px-1 text-xs font-semibold text-white">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
        {/* Profile/Subscription/Settings/Help/Logout moved to HeaderStrip's ProfileDropdown,
         * which also gates logout behind a confirmation modal (previously this was a bare
         * button that logged out on a single accidental click). */}
      </nav>
    </>
  );
}
