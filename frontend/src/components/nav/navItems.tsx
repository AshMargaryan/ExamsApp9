import type { ReactNode } from "react";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  Gamepad2,
  Gem,
  HelpCircle,
  Home,
  Layers,
  ListTodo,
  MessageCircle,
  NotebookPen,
  NotebookText,
  Settings,
  Sparkles,
  StickyNote,
  Target,
  Trophy,
  User,
  Users,
} from "lucide-react";
import type { AccountRole } from "../../api/auth";
import { useAssignmentNotifications } from "../../hooks/useAssignmentNotifications";
import { useChatUnreadCount } from "../../hooks/useChatUnreadCount";

/*
  One source of truth for the app's primary navigation, shared by the web
  sidebar (AppSidebar) and the native bottom tab bar + "More" sheet
  (mobile/MobileShell). Adding a destination here lights it up on both
  platforms instead of only the one you remembered to edit.
*/

export interface NavItem {
  to: string;
  icon: ReactNode;
  label: string;
  badge?: number;
  /** Section header this item renders under in AppSidebar. Items sharing a
   *  group are rendered together (even if built non-contiguously) under one
   *  label; items with no group render with no header, for short per-role
   *  lists where grouping would just be noise. */
  group?: string;
}

const ICON_SIZE = 19;
const ICON_STROKE = 1.75;

const GROUP_STUDY = "Ուսում";
const GROUP_COMMUNITY = "Համայնք";
const GROUP_TOOLS = "Գործիքներ";

export function dashboardPathFor(role: AccountRole) {
  if (role === "teacher") return "/teacher-dashboard";
  if (role === "parent") return "/family";
  return "/student-dashboard";
}

/** Shared by AppSidebar (desktop rail + mobile drawer) and MobileTabBar, so
 *  a nested route (e.g. /subjects/math) lights up its section's link/tab the
 *  same way on both platforms. */
export function isNavItemActive(pathname: string, to: string) {
  return to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(`${to}/`);
}

function buildNavItems(role: AccountRole, assignmentBadge: number, chatBadge: number): NavItem[] {
  const items: NavItem[] = [{ to: "/", icon: <Home size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: "Գլխավոր" }];

  if (role === "student") {
    items.push(
      { to: "/todo", icon: <ListTodo size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: "Իմ խնդիրները", group: GROUP_STUDY },
      {
        to: "/learning-profile",
        icon: <Target size={ICON_SIZE} strokeWidth={ICON_STROKE} />,
        label: "Իմ ուսումնական պրոֆիլը",
        group: GROUP_STUDY,
      },
      {
        to: "/study-plan",
        icon: <CalendarDays size={ICON_SIZE} strokeWidth={ICON_STROKE} />,
        label: "Ուսումնական պլան",
        group: GROUP_STUDY,
      },
      { to: "/subjects", icon: <BookOpen size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: "Առարկաներ", group: GROUP_STUDY },
      {
        to: "/mock-exams",
        icon: <ClipboardCheck size={ICON_SIZE} strokeWidth={ICON_STROKE} />,
        label: "Ամբողջական թեստեր",
        group: GROUP_STUDY,
      },
      { to: "/flashcards", icon: <Layers size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: "Բառաքարտեր", group: GROUP_STUDY },
      {
        to: "/mistake-notebook",
        icon: <NotebookText size={ICON_SIZE} strokeWidth={ICON_STROKE} />,
        label: "Սխալների տետր",
        group: GROUP_STUDY,
      },
      { to: "/assistant", icon: <Sparkles size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: "AI Օգնական", group: GROUP_STUDY },
      {
        to: dashboardPathFor(role),
        icon: <BarChart3 size={ICON_SIZE} strokeWidth={ICON_STROKE} />,
        label: "Առաջադրանքներ",
        badge: assignmentBadge,
        group: GROUP_STUDY,
      },
      {
        to: "/games",
        icon: <Gamepad2 size={ICON_SIZE} strokeWidth={ICON_STROKE} />,
        label: "Խաղասենյակներ",
        group: GROUP_COMMUNITY,
      },
      { to: "/rankings", icon: <Trophy size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: "Դասակարգում", group: GROUP_COMMUNITY },
      {
        to: "/groups",
        icon: <Users size={ICON_SIZE} strokeWidth={ICON_STROKE} />,
        label: "Ուսումնական խմբեր",
        group: GROUP_COMMUNITY,
      },
    );
  } else if (role === "teacher") {
    // A teacher used to get exactly one destination, which left the class
    // leaderboard unreachable from navigation even though the page works for
    // them. Anything added here must be a route that actually exists — the
    // teacher-scoped mistakes notebook joins this list when its page ships.
    items.push(
      {
        to: dashboardPathFor(role),
        icon: <BarChart3 size={ICON_SIZE} strokeWidth={ICON_STROKE} />,
        label: "Վահանակ",
      },
      { to: "/practice", icon: <BookOpen size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: "Առարկաներ" },
      { to: "/rankings", icon: <Trophy size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: "Դասակարգում" },
    );
  }

  items.push(
    { to: "/notepad", icon: <StickyNote size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: "Նշումներ", group: GROUP_TOOLS },
    {
      to: "/notes",
      icon: <NotebookPen size={ICON_SIZE} strokeWidth={ICON_STROKE} />,
      label: "Նշումների տարածք",
      group: GROUP_TOOLS,
    },
    {
      to: "/chat",
      icon: <MessageCircle size={ICON_SIZE} strokeWidth={ICON_STROKE} />,
      label: "Հաղորդագրություններ",
      badge: chatBadge,
      group: GROUP_TOOLS,
    },
  );
  return items;
}

/** Every navigable destination for this role, live badge counts included. */
export function useNavItems(role: AccountRole): NavItem[] {
  const assignmentNotifications = useAssignmentNotifications();
  const chatUnreadCount = useChatUnreadCount();
  return buildNavItems(role, assignmentNotifications?.length ?? 0, chatUnreadCount);
}

/** Account-level destinations, shared by ProfileDropdown (web) and
 *  MobileTabBar's "More" sheet (native) so there's one list to update
 *  instead of two that can drift. Logout isn't here — it's an action (opens
 *  a confirm modal), not a navigable route, so each consumer adds it itself. */
export const accountNavLinks: NavItem[] = [
  { to: "/profile", icon: <User size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: "Պրոֆիլ" },
  { to: "/subscription", icon: <Gem size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: "Բաժանորդագրություն" },
  { to: "/settings", icon: <Settings size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: "Կարգավորումներ" },
  { to: "/help", icon: <HelpCircle size={ICON_SIZE} strokeWidth={ICON_STROKE} />, label: "Օգնություն" },
];
