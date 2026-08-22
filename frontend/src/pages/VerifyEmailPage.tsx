import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AxiosError } from "axios";
import { CircleCheck, MailCheck } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { resendVerificationCode, verifyEmail } from "../api/auth";
import { OtpInput } from "../components/OtpInput";
import { Button } from "../components/ui/Button";
import { FormAlert } from "../components/ui/Field";
import { MobileVerifyEmail } from "../components/mobile/auth/MobileVerifyEmail";
import { useIsNativeApp } from "../lib/platform";

/*
  The native shell already had a good version of this screen — informal
  register, a resend cooldown matching the backend's 3/min limit, auto-submit
  on the sixth digit, an announced error. The web had none of it, plus:

  - `navigate(home)` was called *during render* when the address was already
    verified, which is a side effect in a render body. `<Navigate replace>` is
    the router's own answer and does not leave the verification screen in the
    history for the back button to land on.
  - the resend/verify controls were hand-rolled buttons whose loading state
    was the string "...", and the code boxes had no label, no accessible name
    and no `autocomplete="one-time-code"`, so the browser would not offer the
    emailed code on the one screen where it can.
  - the resend button could be pressed repeatedly into a 429 that surfaced as
    "Չհաջողվեց ուղարկել կոդը" with no hint that waiting would fix it.
  - "Կոդը սխալ է" was a plain `<p>`, so nothing was announced; and the
    resend confirmation was painted in the *action* colour, which is the one
    colour on the page that means "press me".

  Deliberately *not* on `AuthScreen`: `/verify-email` sits inside
  `ProtectedRoute`, so the student is signed in and the app shell is already
  around them. The logged-out frame would put a second Gitus mark and a
  second statement of what the product is inside a page whose header already
  carries both.
*/

const RESEND_COOLDOWN_SECONDS = 60;

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
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const submit = useCallback(
    async (value: string) => {
      setError(null);
      setInfo(null);
      setSubmitting(true);
      try {
        await verifyEmail(value);
        await refreshUser();
        navigate("/subscription");
      } catch (err) {
        setCode("");
        if (err instanceof AxiosError && err.response?.data) {
          setError((err.response.data as { detail?: string }).detail ?? "Կոդը սխալ է։");
        } else {
          setError("Կոդը սխալ է։ Ստուգիր՝ արդյոք վերջին ուղարկված կոդն ես մուտքագրում։");
        }
      } finally {
        setSubmitting(false);
      }
    },
    [navigate, refreshUser],
  );

  // Verified already — nothing to do here, and the screen should not stay in
  // history behind the destination.
  if (user?.is_email_verified) {
    return <Navigate to={user.role === "parent" ? "/family" : "/"} replace />;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    submit(code);
  }

  async function handleResend() {
    setError(null);
    setInfo(null);
    // Set before the request, not after: the backend allows three a minute,
    // and the old button stayed live through the round trip so a second tap
    // spent one of them.
    setCooldown(RESEND_COOLDOWN_SECONDS);
    try {
      await resendVerificationCode();
      setInfo("Նոր կոդն ուղարկվեց։");
    } catch {
      setError("Չհաջողվեց ուղարկել կոդը։ Փորձիր փոքր-ինչ ուշ։");
      setCooldown(0);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-[var(--space-4)] py-[var(--space-10)]">
      <form
        onSubmit={handleSubmit}
        noValidate
        className="rounded-[var(--radius-lg)] border border-border bg-surface p-[var(--space-6)] shadow-[var(--shadow-sm)]"
      >
        <div className="mb-[var(--space-5)] flex flex-col items-center text-center">
          <span className="mb-[var(--space-4)] flex h-14 w-14 items-center justify-center rounded-[var(--radius-xl)] bg-primary-bg text-primary">
            <MailCheck size={26} strokeWidth={1.75} aria-hidden />
          </span>
          <h1 className="font-display text-[length:var(--text-2xl)] leading-[var(--leading-display)] font-semibold tracking-[var(--tracking-tight)] text-text">
            Ստուգիր փոստդ
          </h1>
          <p className="mt-[var(--space-2)] text-[length:var(--text-sm)] leading-[var(--leading-body)] text-text-muted">
            6 նիշանոց կոդն ուղարկեցինք{" "}
            <span className="wrap-anywhere font-medium text-text">{user?.email ?? "քո էլ. փոստին"}</span>։
          </p>
        </div>

        <OtpInput
          label="Հաստատման կոդ"
          value={code}
          onChange={(next) => {
            setCode(next);
            if (error) setError(null);
          }}
          onComplete={submit}
          invalid={Boolean(error)}
          autoFocus
          disabled={submitting}
        />

        {error && <FormAlert message={error} />}
        {info && (
          <p
            role="status"
            className="mb-[var(--space-4)] flex items-start gap-[var(--space-2)] text-[length:var(--text-sm)] text-correct"
          >
            <CircleCheck size={16} strokeWidth={2} aria-hidden className="mt-px shrink-0" />
            {info}
          </p>
        )}

        <Button type="submit" size="md" loading={submitting} disabled={code.length !== 6} className="w-full">
          Հաստատել
        </Button>

        <div className="mt-[var(--space-4)] text-center">
          {cooldown > 0 ? (
            /* A disabled control that says why, near itself. */
            <p className="text-[length:var(--text-sm)] text-text-muted">
              Նոր կոդ կարող ես խնդրել {cooldown} վրկ հետո
            </p>
          ) : (
            <Button type="button" variant="ghost" size="sm" onClick={handleResend}>
              Կրկին ուղարկել կոդը
            </Button>
          )}
        </div>

        <div className="mt-[var(--space-5)] border-t border-border pt-[var(--space-4)] text-center">
          <button
            type="button"
            onClick={() => navigate("/subscription")}
            className="rounded-[var(--radius-md)] text-[length:var(--text-sm)] font-medium text-text-muted transition-colors hover:text-primary"
          >
            Հետագայում
          </button>
          <p className="mt-1 text-[length:var(--text-xs)] text-text-muted">
            Առանց հաստատման որոշ հնարավորություններ փակ կմնան։
          </p>
        </div>
      </form>
    </div>
  );
}
