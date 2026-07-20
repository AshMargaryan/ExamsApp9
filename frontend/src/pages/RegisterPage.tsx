import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { AxiosError } from "axios";

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register(username, email, password);
      navigate("/");
    } catch (err) {
      if (err instanceof AxiosError && err.response?.data) {
        const data = err.response.data as Record<string, string[]>;
        const firstError = Object.values(data).flat()[0];
        setError(firstError ?? "Գրանցումը ձախողվեց։");
      } else {
        setError("Գրանցումը ձախողվեց։");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-[var(--radius)] border border-border bg-surface p-8 shadow-sm"
      >
        <h1 className="mb-6 text-2xl font-semibold text-text">Գրանցում</h1>

        <label className="mb-1 block text-sm text-text-muted">Օգտանուն</label>
        <input
          className="mb-4 w-full rounded-md border border-border bg-bg px-3 py-2 text-text outline-none focus:border-primary"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
          required
        />

        <label className="mb-1 block text-sm text-text-muted">Էլ. փոստ</label>
        <input
          type="email"
          className="mb-4 w-full rounded-md border border-border bg-bg px-3 py-2 text-text outline-none focus:border-primary"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label className="mb-1 block text-sm text-text-muted">Գաղտնաբառ</label>
        <input
          type="password"
          minLength={8}
          className="mb-4 w-full rounded-md border border-border bg-bg px-3 py-2 text-text outline-none focus:border-primary"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && <p className="mb-4 text-sm text-incorrect">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-primary py-2 font-medium text-primary-contrast transition-colors hover:bg-primary-hover disabled:opacity-60"
        >
          {submitting ? "..." : "Գրանցվել"}
        </button>

        <p className="mt-4 text-center text-sm text-text-muted">
          Արդեն հաշիվ ունե՞ք։{" "}
          <Link to="/login" className="text-primary hover:underline">
            Մուտք
          </Link>
        </p>
      </form>
    </div>
  );
}