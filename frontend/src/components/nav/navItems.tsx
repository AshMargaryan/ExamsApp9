import type { ReactNode } from "react";
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
}

const ICON_SIZE = 19;
const ICON_STROKE = 1.75;

export function dashboardPathFor(role: AccountRole) {
  if (role === "teacher") return "/teacher-dashboard";
  if (role === "parent") return "/family";
  return "/student-dashboard";
}

function buildNavItems(role: AccountRole, assignmentBadge: number, chatBadge: number): NavItem[] {
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

/** Every navigable destination for this role, live badge counts included. */
export function useNavItems(role: AccountRole): NavItem[] {
  const assignmentNotifications = useAssignmentNotifications();
  const chatUnreadCount = useChatUnreadCount();
  return buildNavItems(role, assignmentNotifications?.length ?? 0, chatUnreadCount);
}
