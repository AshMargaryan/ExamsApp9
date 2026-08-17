import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Gem, HelpCircle, MoreHorizontal, Settings, User, X } from "lucide-react";
import type { AccountRole } from "../../api/auth";
import { useNavItems, type NavItem } from "../nav/navItems";

/*
  The native shell's primary navigation: four role-appropriate destinations
  pinned to the bottom edge, plus a "More" sheet holding everything else the
  web sidebar offers. iOS users reach for the bottom of the screen, and a
  hamburger drawer is the single clearest tell that an app is a wrapped
  website — so the drawer is web-only and this replaces it.
*/

/** Which of the shared nav destinations get a permanent tab. Everything not
 *  listed here still exists — it moves into the More sheet. */
const PRIMARY_TAB_PATHS: Record<AccountRole, string[]> = {
  student: ["/", "/subjects", "/assistant", "/chat"],
  teacher: ["/", "/teacher-dashboard", "/notes", "/chat"],
  parent: ["/", "/notepad", "/notes", "/chat"],
};

/** Sidebar labels are written for a 300px-wide drawer; a tab is ~70px. */
const TAB_LABELS: Record<string, string> = {
  "/": "Գլխավոր",
  "/subjects": "Առարկաներ",
  "/assistant": "AI",
  "/chat": "Չաթ",
  "/notes": "Նշումներ",
  "/notepad": "Նշումներ",
  "/teacher-dashboard": "Վահանակ",
};

const ACCOUNT_LINKS = [
  { to: "/profile", icon: <User size={19} strokeWidth={1.75} />, label: "Պրոֆիլ" },
  { to: "/subscription", icon: <Gem size={19} strokeWidth={1.75} />, label: "Բաժանորդագրություն" },
  { to: "/settings", icon: <Settings size={19} strokeWidth={1.75} />, label: "Կարգավորումներ" },
  { to: "/help", icon: <HelpCircle size={19} strokeWidth={1.75} />, label: "Օգնություն" },
];

function isActive(pathname: string, to: string) {
  return to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(`${to}/`);
}

function Badge({ count }: { count: number }) {
  return (
    <span className="absolute -top-1 right-1/2 flex h-[18px] min-w-[18px] translate-x-[18px] items-center justify-center rounded-full bg-incorrect px-1 text-[10px] font-semibold text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}

function MoreSheet({ items, onClose }: { items: NavItem[]; onClose: () => void }) {
  const { pathname } = useLocation();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm" />
      <div
        role="dialog"
        aria-label="Ավելին"
        className="fixed inset-x-0 bottom-0 z-[85] max-h-[82vh] overflow-y-auto rounded-t-[22px] border-t border-border bg-surface"
        style={{ paddingBottom: "calc(var(--safe-bottom) + 1rem)" }}
      >
        {/* Grab handle — the affordance iOS users expect on a bottom sheet,
            even though this one is dismissed by tap rather than by drag. */}
        <div className="sticky top-0 flex items-center justify-between rounded-t-[22px] bg-surface px-4 pt-3 pb-2">
          <span className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-border" aria-hidden />
          <h2 className="mt-3 text-lg font-semibold text-text">Ավելին</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Փակել"
            className="mt-3 flex h-9 w-9 items-center justify-center rounded-full bg-surface-muted text-text"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 px-4 pt-2">
          {items.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={`relative flex items-center gap-2.5 rounded-2xl border p-3.5 text-[14px] font-medium ${
                isActive(pathname, item.to)
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-bg text-text"
              }`}
            >
              <span className="flex-none">{item.icon}</span>
              <span className="leading-tight">{item.label}</span>
              {!!item.badge && (
                <span className="ml-auto flex h-5 min-w-[1.25rem] flex-none items-center justify-center rounded-full bg-incorrect px-1 text-xs font-semibold text-white">
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              )}
            </Link>
          ))}
        </div>

        <div className="mt-5 border-t border-border px-4 pt-3">
          {ACCOUNT_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={onClose}
              className="flex items-center gap-3 rounded-xl px-2 py-3 text-[15px] text-text active:bg-surface-muted"
            >
              <span className="flex-none text-text-muted">{link.icon}</span>
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}

export function MobileTabBar({ role }: { role: AccountRole }) {
  const { pathname } = useLocation();
  const navItems = useNavItems(role);
  const [moreOpen, setMoreOpen] = useState(false);

  // Close the sheet whenever the route changes, including on back-swipe.
  useEffect(() => setMoreOpen(false), [pathname]);

  const primaryPaths = PRIMARY_TAB_PATHS[role];
  const tabs = primaryPaths
    .map((path) => navItems.find((item) => item.to === path))
    .filter((item): item is NavItem => Boolean(item));
  const overflow = navItems.filter((item) => !primaryPaths.includes(item.to));

  // Any unread count hidden inside "More" surfaces on the More tab itself,
  // so a message in an overflow destination isn't invisible.
  const overflowBadge = overflow.reduce((sum, item) => sum + (item.badge ?? 0), 0);

  return (
    <>
      <nav
        aria-label="Հիմնական"
        className="fixed inset-x-0 bottom-0 z-[75] flex border-t border-border bg-surface/95 backdrop-blur-md"
        style={{ paddingBottom: "var(--safe-bottom)" }}
      >
        {tabs.map((item) => {
          const active = isActive(pathname, item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active ? "page" : undefined}
              className={`relative flex flex-1 flex-col items-center justify-center gap-1 ${
                active ? "text-primary" : "text-text-muted"
              }`}
              style={{ height: "var(--mobile-tabbar-h)" }}
            >
              <span className="relative">
                {item.icon}
                {!!item.badge && <Badge count={item.badge} />}
              </span>
              <span className="text-[10px] leading-none font-medium">{TAB_LABELS[item.to] ?? item.label}</span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-expanded={moreOpen}
          className={`relative flex flex-1 flex-col items-center justify-center gap-1 ${
            moreOpen ? "text-primary" : "text-text-muted"
          }`}
          style={{ height: "var(--mobile-tabbar-h)" }}
        >
          <span className="relative">
            <MoreHorizontal size={19} strokeWidth={1.75} />
            {!!overflowBadge && <Badge count={overflowBadge} />}
          </span>
          <span className="text-[10px] leading-none font-medium">Ավելին</span>
        </button>
      </nav>

      {moreOpen && <MoreSheet items={overflow} onClose={() => setMoreOpen(false)} />}
    </>
  );
}
