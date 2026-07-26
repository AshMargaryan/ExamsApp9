import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AxiosError } from "axios";
import { confirmPasswordReset } from "../api/auth";
import { MessageModal } from "../components/MessageModal";

export function ResetPasswordPage() {
  const { uid, token } = useParams<{ uid: string; token: string }>();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  if (!uid || !token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg px-4">
        <p className="text-text-muted">Անվավեր հղում։</p>
      </div>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8 || !/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setError("Գաղտնաբառը պետք է լինի առնվազն 8 նիշ և պարունակի տառեր ու թվեր։");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError("Գաղտնաբառերը չեն համընկնում։");
      return;
    }

    setSubmitting(true);
    try {
      await confirmPasswordReset(uid!, token!, newPassword, confirmNewPassword);
      setDone(true);
    } catch (err) {
      if (err instanceof AxiosError && err.response?.data) {
        setError((err.response.data as { detail?: string }).detail ?? "Հղումն անվավեր է կամ ժամկետանց։");
      } else {
        setError("Հղումն անվավեր է կամ ժամկետանց։");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm rounded-[var(--radius)] border border-border bg-surface p-8 shadow-sm">
        <h1 className="mb-6 text-2xl font-semibold text-text">Նոր գաղտնաբառ</h1>

        {done ? (
          <>
            <p className="mb-4 text-sm text-text-muted">Ձեր գաղտնաբառը հաջողությամբ փոփոխվեց։</p>
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="w-full rounded-md bg-primary py-2 font-medium text-primary-contrast transition-colors hover:bg-primary-hover"
            >
              Մուտք գործել
            </button>
          </>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <label className="mb-1 block text-sm text-text-muted">Նոր գաղտնաբառ</label>
            <input
              type="password"
              minLength={8}
              className="mb-4 w-full rounded-md border border-border bg-bg px-3 py-2 text-text outline-none focus:border-primary"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoFocus
              required
            />
            <p className="-mt-3 mb-4 text-xs text-text-muted">
              Առնվազն 8 նիշ, պետք է պարունակի տառեր և թվեր։
            </p>

            <label className="mb-1 block text-sm text-text-muted">Կրկնել նոր գաղտնաբառը</label>
            <input
              type="password"
              minLength={8}
              className="mb-4 w-full rounded-md border border-border bg-bg px-3 py-2 text-text outline-none focus:border-primary"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              required
            />

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-primary py-2 font-medium text-primary-contrast transition-colors hover:bg-primary-hover disabled:opacity-60"
            >
              {submitting ? "..." : "Փոխել գաղտնաբառը"}
            </button>
          </form>
        )}

        <p className="mt-4 text-center text-sm text-text-muted">
          <Link to="/login" className="text-primary hover:underline">
            Վերադառնալ մուտք էջ
          </Link>
        </p>
      </div>
      {error && <MessageModal message={error} onClose={() => setError(null)} />}
    </div>
  );
}
