import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { AxiosError } from "axios";
import { useAuth } from "../auth/AuthContext";
import { resendVerificationCode, verifyEmail } from "../api/auth";
import { OtpInput } from "../components/OtpInput";
import { MobileVerifyEmail } from "../components/mobile/auth/MobileVerifyEmail";
import { useIsNativeApp } from "../lib/platform";

export function VerifyEmailPage() {
  // Native gets a single autofill-capable code field that submits itself; see
  // MobileVerifyEmail. The web keeps the six-box form below.
  if (useIsNativeApp()) return <MobileVerifyEmail />;
  return <WebVerifyEmailPage />;
}

function WebVerifyEmailPage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  const home = user?.role === "parent" ? "/family" : "/";

  if (user?.is_email_verified) {
    navigate(home);
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);
    try {
      await verifyEmail(code);
      await refreshUser();
      navigate("/subscription");
    } catch (err) {
      if (err instanceof AxiosError && err.response?.data) {
        setError((err.response.data as { detail?: string }).detail ?? "Կոդը սխալ է։");
      } else {
        setError("Կոդը սխալ է։");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setError(null);
    setInfo(null);
    setResending(true);
    try {
      await resendVerificationCode();
      setInfo("Կոդը կրկին ուղարկվեց ձեր էլ. փոստին։");
    } catch {
      setError("Չհաջողվեց ուղարկել կոդը։");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-[var(--radius)] border border-border bg-surface p-8 shadow-sm"
      >
        <h1 className="mb-2 text-2xl font-semibold text-text">Հաստատեք ձեր էլ. հասցեն</h1>
        <p className="mb-6 text-sm text-text-muted">
          Մենք ուղարկել ենք 6 նիշանոց կոդ {user?.email ?? "ձեր էլ. փոստին"}։ Մուտքագրեք այն ստորև։
        </p>

        <label className="mb-1 block text-sm text-text-muted">Հաստատման կոդ</label>
        <OtpInput value={code} onChange={setCode} autoFocus disabled={submitting} />

        {error && <p className="mb-4 text-sm text-incorrect">{error}</p>}
        {info && <p className="mb-4 text-sm text-primary">{info}</p>}

        <button
          type="submit"
          disabled={submitting || code.length !== 6}
          className="mb-3 w-full rounded-md bg-primary py-2 font-medium text-primary-contrast transition-colors hover:bg-primary-hover disabled:opacity-60"
        >
          {submitting ? "..." : "Հաստատել"}
        </button>

        <button
          type="button"
          onClick={handleResend}
          disabled={resending}
          className="w-full rounded-md border border-border py-2 font-medium text-text transition-colors hover:border-primary disabled:opacity-60"
        >
          {resending ? "..." : "Կրկին ուղարկել կոդը"}
        </button>

        <button
          type="button"
          onClick={() => navigate("/subscription")}
          className="mt-4 w-full text-center text-sm text-text-muted hover:text-primary"
        >
          Հետագայում
        </button>
      </form>
    </div>
  );
}
