import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, type Location } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { MessageModal } from "../components/MessageModal";
import { OAuthButtons } from "../components/auth/OAuthButtons";
import type { User } from "../api/auth";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function redirectPath(user: User): string {
    const redirectTo = (location.state as { from?: Location } | null)?.from;
    if (redirectTo) return `${redirectTo.pathname}${redirectTo.search}`;
    return user.role === "parent" ? "/family" : "/";
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const user = await login(username, password);
      navigate(redirectPath(user));
    } catch {
      setError("Սխալ օգտանուն կամ գաղտնաբառ։");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <form
        onSubmit={handleSubmit}
        noValidate
        className="w-full max-w-sm rounded-[var(--radius)] border border-border bg-surface p-8 shadow-sm"
      >
        <h1 className="mb-6 text-2xl font-semibold text-text">Մուտք</h1>

        <label className="mb-1 block text-sm text-text-muted">Օգտանուն</label>
        <input
          className="mb-4 w-full rounded-md border border-border bg-bg px-3 py-2 text-text outline-none focus:border-primary"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
          required
        />

        <label className="mb-1 block text-sm text-text-muted">Գաղտնաբառ</label>
        <input
          type="password"
          className="mb-4 w-full rounded-md border border-border bg-bg px-3 py-2 text-text outline-none focus:border-primary"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-primary py-2 font-medium text-primary-contrast transition-colors hover:bg-primary-hover disabled:opacity-60"
        >
          {submitting ? "..." : "Մուտք գործել"}
        </button>

        <p className="mt-3 text-center text-sm">
          <Link to="/forgot-password" className="text-primary hover:underline">
            Մոռացե՞լ եք գաղտնաբառը
          </Link>
        </p>

        <p className="mt-4 text-center text-sm text-text-muted">
          Դեռ հաշիվ չունե՞ք։{" "}
          <Link to="/register" className="text-primary hover:underline">
            Գրանցվել
          </Link>
        </p>

        <OAuthButtons getRedirectPath={redirectPath} />
      </form>
      {error && <MessageModal message={error} onClose={() => setError(null)} />}
    </div>
  );
}
