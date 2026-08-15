import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  Gamepad2,
  Home,
  Layers,
  ListTodo,
  MessageCircle,
  NotebookPen,
  NotebookText,
  Sparkles,
  StickyNote,
  Target,
  Trophy,
  Users,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import type { AccountRole } from "../api/auth";
import { useAssignmentNotifications } from "../hooks/useAssignmentNotifications";
import { useChatUnreadCount } from "../hooks/useChatUnreadCount";

interface NavItem {
  to: string;
  icon: ReactNode;
  label: string;
  badge?: number;
}

const ICON_SIZE = 19;
const ICON_STROKE = 1.75;

function dashboardPathFor(role: AccountRole) {
  if (role === "teacher") return "/teacher-dashboard";
  if (role === "parent") return "/family";
  return "/student-dashboard";
}

function useNavItems(role: AccountRole, assignmentBadge: number, chatBadge: number): NavItem[] {
  const items: NavItem[] = [{ to: "/", icon: <Home size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: "Գլխավոր" }];

  if (role === "student") {
    items.push(
      { to: "/todo", icon: <ListTodo size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: "Իմ խնդիրները" },
      { to: "/learning-profile", icon: <Target size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: "Իմ ուսումնական պրոֆիլը" },
      { to: "/study-plan", icon: <CalendarDays size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: "Ուսումնական պլան" },
      { to: "/subjects", icon: <BookOpen size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: "Առարկաներ" },
      { to: "/mock-exams", icon: <ClipboardCheck size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: "Ամբողջական թեստեր" },
      { to: "/flashcards", icon: <Layers size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: "Բառաքարտեր" },
      { to: "/mistake-notebook", icon: <NotebookText size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: "Սխալների տետր" },
      { to: "/assistant", icon: <Sparkles size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: "AI Օգնական" },
      { to: "/games", icon: <Gamepad2 size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: "Խաղասենյակներ" },
      { to: "/rankings", icon: <Trophy size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: "Դասակարգում" },
      { to: "/groups", icon: <Users size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: "Ուսումնական խմբեր" },
      {
        to: dashboardPathFor(role),
        icon: <BarChart3 size={ICON_SIZE} strokeWidth={ICON_STROKE} />,
        label: "Առաջադրանքներ",
        badge: assignmentBadge,
      },
    );
  } else if (role === "teacher") {
    items.push({ to: dashboardPathFor(role), icon: <BarChart3 size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: "Վահանակ" });
  }

  items.push({ to: "/notepad", icon: <StickyNote size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: "Նշումներ" });
  items.push({ to: "/notes", icon: <NotebookPen size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: "Նշումների տարածք" });
  items.push({
    to: "/chat",
    icon: <MessageCircle size={ICON_SIZE} strokeWidth={ICON_STROKE} />,
    label: "Հաղորդագրություններ",
    badge: chatBadge,
  });
  return items;
}

export function AppSidebar() {
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const assignmentNotifications = useAssignmentNotifications();
  const chatUnreadCount = useChatUnreadCount();
  const navItems = useNavItems(
    user!.role,
    assignmentNotifications?.length ?? 0,
    chatUnreadCount,
  );

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
