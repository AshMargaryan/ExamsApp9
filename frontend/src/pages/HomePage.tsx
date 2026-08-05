import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useAssignmentNotifications } from "../hooks/useAssignmentNotifications";
import { useChatUnreadCount } from "../hooks/useChatUnreadCount";

export function HomePage() {
  const { user, logout } = useAuth();
  const notifications = useAssignmentNotifications();
  const hasUnseenAssignments = (notifications?.length ?? 0) > 0;
  const unreadChatCount = useChatUnreadCount();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-bg px-4">
      <div className="absolute top-4 right-20 flex items-center gap-3 text-sm text-text-muted">
        <Link to="/profile" className="text-primary hover:underline">
          {user?.username}
        </Link>
        <button onClick={logout} className="text-primary hover:underline">
          Ելք
        </button>
      </div>

      <h1 className="text-3xl font-semibold text-text">Բարի գալուստ</h1>

      <div className="flex flex-wrap justify-center gap-4">
        {user?.role === "teacher" ? (
          <Link
            to="/teacher-dashboard"
            className="relative rounded-md bg-primary px-8 py-3 text-lg font-medium text-primary-contrast transition-colors hover:bg-primary-hover"
          >
            🧑‍🏫 Ուսուցչի վահանակ
            {hasUnseenAssignments && (
              <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-incorrect" />
            )}
          </Link>
        ) : (
          <>
            <Link
              to="/practice"
              className="rounded-md bg-primary px-8 py-3 text-lg font-medium text-primary-contrast transition-colors hover:bg-primary-hover"
            >
              Պարապել
            </Link>
            <Link
              to="/mock-exams"
              className="rounded-md border border-primary px-8 py-3 text-lg font-medium text-primary transition-colors hover:bg-surface-muted"
            >
              📝 Ամբողջական թեստեր
            </Link>
            <Link
              to="/assistant"
              className="rounded-md border border-primary px-8 py-3 text-lg font-medium text-primary transition-colors hover:bg-surface-muted"
            >
              🤖 AI Օգնական
            </Link>
            <Link
              to="/games"
              className="rounded-md border border-primary px-8 py-3 text-lg font-medium text-primary transition-colors hover:bg-surface-muted"
            >
              🏆 Խաղասենյակներ
            </Link>
            <Link
              to="/student-dashboard"
              className="relative rounded-md border border-primary px-8 py-3 text-lg font-medium text-primary transition-colors hover:bg-surface-muted"
            >
              📋 Առաջադրանքներ
              {hasUnseenAssignments && (
                <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-incorrect" />
              )}
            </Link>
          </>
        )}
        <Link
          to="/chat"
          className="relative rounded-md border border-primary px-8 py-3 text-lg font-medium text-primary transition-colors hover:bg-surface-muted"
        >
          💬 Հաղորդագրություններ
          {unreadChatCount > 0 && (
            <span className="absolute -right-2 -top-2 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-incorrect px-1 text-xs font-semibold text-white">
              {unreadChatCount > 99 ? "99+" : unreadChatCount}
            </span>
          )}
        </Link>
        <Link
          to="/profile"
          className="rounded-md border border-primary px-8 py-3 text-lg font-medium text-primary transition-colors hover:bg-surface-muted"
        >
          👤 Իմ պրոֆիլը
        </Link>
      </div>
    </div>
  );
}