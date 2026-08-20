import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { useSidebarCollapsed } from "../hooks/useSidebarCollapsed";
import { Logo } from "./Logo";
import { isNavItemActive, useNavItems, type NavItem } from "./nav/navItems";

/*
  Primary web navigation, in two forms driven by one item list:

  - lg and up: a persistent rail. Navigation on a desktop-class screen should
    be visible, not hidden a click deep behind a hamburger — every colliding
    fixed element clears it via the shared --rail-w token.
  - below lg: the original drawer, unchanged in behaviour.

  The native shell doesn't render this at all; it has its own bottom tab bar
  (see mobile/MobileShell).
*/

/** Buckets items by their `group`, preserving each group's first-appearance
 *  order (not requiring the source list to be contiguous). Ungrouped items
 *  stay standalone — no header renders for a role whose list is short enough
 *  not to need one. */
function groupNavItems(items: NavItem[]) {
  const sections: { group?: string; items: NavItem[] }[] = [];
  const indexByGroup = new Map<string, number>();
  for (const item of items) {
    if (!item.group) {
      sections.push({ items: [item] });
      continue;
    }
    const existingIndex = indexByGroup.get(item.group);
    if (existingIndex === undefined) {
      indexByGroup.set(item.group, sections.length);
      sections.push({ group: item.group, items: [item] });
    } else {
      sections[existingIndex].items.push(item);
    }
  }
  return sections;
}

function NavLink({ item, active, collapsed }: { item: NavItem; active: boolean; collapsed: boolean }) {
  return (
    <Link
      to={item.to}
      aria-current={active ? "page" : undefined}
      title={collapsed ? item.label : undefined}
      className={`relative flex items-center gap-3 rounded-[var(--radius)] py-2.5 text-[15px] font-medium transition-colors duration-[var(--motion-fast)] ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
        active ? "bg-primary/10 text-primary" : "text-text hover:bg-surface-muted"
      } ${collapsed ? "justify-center px-0" : "px-3.5"}`}
    >
      {/* Active marker — reads at a glance on a always-visible rail, where
       * a tint alone is easy to miss. */}
      <span
        aria-hidden="true"
        className={`absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary transition-opacity duration-[var(--motion-fast)] ${
          active ? "opacity-100" : "opacity-0"
        }`}
      />
      <span className="relative flex-none">
        {item.icon}
        {collapsed && !!item.badge && (
          <span
            aria-hidden="true"
            className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-incorrect ring-2 ring-surface"
          />
        )}
      </span>
      {!collapsed && <span className="truncate">{item.label}</span>}
      {!collapsed && !!item.badge && (
        <span className="ml-auto flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-incorrect px-1 text-xs font-semibold text-white">
          {item.badge > 99 ? "99+" : item.badge}
        </span>
      )}
    </Link>
  );
}

function NavLinks({ items, pathname, collapsed }: { items: NavItem[]; pathname: string; collapsed: boolean }) {
  const sections = groupNavItems(items);
  return (
    <>
      {sections.map((section, i) => (
        <div key={section.group ?? section.items[0].to} className={i > 0 ? "mt-4" : undefined}>
          {section.group && (
            <div
              className={
                collapsed
                  ? i > 0
                    ? "mx-2 mb-2 border-t border-border"
                    : "hidden"
                  : "px-3.5 pb-1 text-xs font-semibold tracking-wide text-text-muted"
              }
              aria-hidden={collapsed || undefined}
            >
              {!collapsed && section.group}
            </div>
          )}
          <div className="flex flex-col gap-1">
            {section.items.map((item) => (
              <NavLink key={item.to} item={item} active={isNavItemActive(pathname, item.to)} collapsed={collapsed} />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

export function AppSidebar() {
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const { collapsed, toggleCollapsed } = useSidebarCollapsed();
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
      {/* ---- Desktop rail ---- */}
      <nav
        aria-label="Հիմնական"
        className="fixed inset-y-0 left-0 z-[45] hidden w-[var(--rail-w)] flex-col overflow-hidden border-r border-border bg-surface px-3 py-4 transition-[width] duration-[var(--motion-fast)] ease-[var(--ease-out)] lg:flex"
      >
        <Link
          to="/"
          className={`mb-4 flex items-center gap-2 px-2 py-1 transition-[filter] duration-[var(--motion-fast)] hover:brightness-110 ${
            collapsed ? "justify-center px-0" : ""
          }`}
        >
          <Logo className="h-6 w-6 flex-none" />
          {!collapsed && (
            <span
              className="truncate text-lg font-bold tracking-tight"
              style={{
                background: "var(--gradient-hero)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              Gitus
            </span>
          )}
        </Link>
        <div className="no-scrollbar flex flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden">
          <NavLinks items={navItems} pathname={location.pathname} collapsed={collapsed} />
        </div>
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Ընդարձակել ցանկը" : "Կրճատել ցանկը"}
          title={collapsed ? "Ընդարձակել ցանկը" : "Կրճատել ցանկը"}
          className={`mt-2 flex h-9 flex-none items-center gap-2 rounded-[var(--radius)] text-sm text-text-muted transition-colors hover:bg-surface-muted hover:text-text ${
            collapsed ? "justify-center px-0" : "px-3.5"
          }`}
        >
          {collapsed ? (
            <ChevronsRight size={17} strokeWidth={1.75} className="flex-none" />
          ) : (
            <>
              <ChevronsLeft size={17} strokeWidth={1.75} className="flex-none" />
              <span className="truncate">Կրճատել</span>
            </>
          )}
        </button>
      </nav>

      {/* ---- Mobile drawer ---- */}
      <button
        type="button"
        aria-label="Ցույց տալ/թաքցնել ցանկը"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="fixed left-4 top-4 z-[70] flex h-11 w-11 flex-col items-center justify-center gap-[5px] rounded-full border border-border bg-surface shadow-lg transition-colors hover:border-primary lg:hidden"
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
        className={`fixed inset-0 z-[50] bg-black/45 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <nav
        aria-label="Հիմնական"
        /* Closed, the drawer is only translated off-screen, so without this its
         * links stay in the tab order and reachable by screen readers. */
        inert={!open}
        className={`fixed left-0 top-0 z-[60] flex h-full w-[min(300px,86vw)] flex-col gap-1 border-r border-border bg-surface px-3 pb-4 pt-20 shadow-xl transition-transform duration-300 lg:hidden ${
          open ? "translate-x-0" : "-translate-x-[105%]"
        }`}
      >
        <div className="no-scrollbar flex flex-1 flex-col gap-1 overflow-y-auto">
          {/* The drawer always shows full labels — collapsing is a desktop-rail
           * affordance only, so it is never in the collapsed presentation. */}
          <NavLinks items={navItems} pathname={location.pathname} collapsed={false} />
        </div>
        {/* Profile/Subscription/Settings/Help/Logout moved to HeaderStrip's ProfileDropdown,
         * which also gates logout behind a confirmation modal (previously this was a bare
         * button that logged out on a single accidental click). */}
      </nav>
    </>
  );
}
