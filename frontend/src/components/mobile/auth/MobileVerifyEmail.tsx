import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AxiosError } from "axios";
import { AlertCircle, MailCheck } from "lucide-react";
import { useAuth } from "../../../auth/AuthContext";
import { resendVerificationCode, verifyEmail } from "../../../api/auth";
import { hapticError, hapticSuccess } from "../../../lib/haptics";
import { AuthShell, AuthPrimaryButton } from "./AuthShell";
import { NativeOtpInput } from "./NativeOtpInput";

/*
  Email verification, native.

  Differences from the web form that matter on a phone:
   - the code is one autofill-capable field (see NativeOtpInput), so iOS can
     offer the emailed code from the QuickType bar;
   - submitting happens automatically when the sixth digit lands — nobody
     types a code and then hunts for a button;
   - "resend" is rate-limited by the backend at 3/min, so it's behind a visible
     countdown rather than a button that fails after the second tap.
*/

const RESEND_COOLDOWN_SECONDS = 60;

export function MobileVerifyEmail() {
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
        hapticSuccess();
        navigate("/subscription");
      } catch (err) {
        hapticError();
        setCode("");
        if (err instanceof AxiosError && err.response?.data) {
          setError((err.response.data as { detail?: string }).detail ?? "Կոդը սխալ է։");
        } else {
          setError("Կոդը սխալ է։");
        }
      } finally {
        setSubmitting(false);
      }
    },
    [navigate, refreshUser],
  );

  async function handleResend() {
    setError(null);
    setInfo(null);
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
    <AuthShell
      title="Ստուգիր փոստդ"
      subtitle={`6 նիշանոց կոդն ուղարկեցինք ${user?.email ?? "քո էլ. փոստին"}։`}
      footer={
        <div className="flex flex-col gap-3">
          <AuthPrimaryButton onClick={() => submit(code)} loading={submitting} disabled={code.length !== 6}>
            Հաստատել
          </AuthPrimaryButton>
          <button
            type="button"
            onClick={() => navigate("/subscription")}
            className="py-1 text-center text-[14px] font-medium text-text-muted"
          >
            Հետագայում
          </button>
        </div>
      }
    >
      <span className="mb-7 flex h-16 w-16 items-center justify-center rounded-[var(--radius-2xl)] bg-primary/12 text-primary">
        <MailCheck size={30} strokeWidth={1.75} />
      </span>

      <NativeOtpInput
        value={code}
        onChange={(next) => {
          setCode(next);
          setError(null);
        }}
        onComplete={submit}
        disabled={submitting}
        invalid={Boolean(error)}
        autoFocus
      />

      {error && (
        <p role="alert" className="mt-4 flex items-start gap-2 text-[14px] text-incorrect">
          <AlertCircle size={16} strokeWidth={2} className="mt-px flex-none" />
          {error}
        </p>
      )}
      {info && <p className="mt-4 text-[14px] text-correct">{info}</p>}

      <div className="mt-8 text-center">
        {cooldown > 0 ? (
          <p className="text-[14px] text-text-muted">
            Նոր կոդ կարող ես խնդրել {cooldown} վրկ հետո
          </p>
        ) : (
          <button type="button" onClick={handleResend} className="text-[15px] font-semibold text-primary">
            Կրկին ուղարկել կոդը
          </button>
        )}
      </div>
    </AuthShell>
  );
}
