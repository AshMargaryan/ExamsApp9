import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function HomePage() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-bg px-4">
      <div className="absolute top-4 right-4 flex items-center gap-3 text-sm text-text-muted">
        <Link to="/profile" className="text-primary hover:underline">
          {user?.username}
        </Link>
        <button onClick={logout} className="text-primary hover:underline">
          Ելք
        </button>
      </div>

      <h1 className="text-3xl font-semibold text-text">Բարի գալուստ</h1>

      <div className="flex gap-4">
        <Link
          to="/practice"
          className="rounded-md bg-primary px-8 py-3 text-lg font-medium text-primary-contrast transition-colors hover:bg-primary-hover"
        >
          Պարապել
        </Link>
        <Link
          to="/assistant"
          className="rounded-md border border-primary px-8 py-3 text-lg font-medium text-primary transition-colors hover:bg-surface-muted"
        >
          🤖 AI Օգնական
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