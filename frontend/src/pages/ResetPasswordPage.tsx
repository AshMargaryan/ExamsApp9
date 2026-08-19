import { useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AxiosError } from "axios";
import { CircleCheck } from "lucide-react";
import { confirmPasswordReset } from "../api/auth";
import { AuthScreen, AuthSubmitButton } from "../components/auth/AuthScreen";
import { Button } from "../components/ui/Button";
import { FormAlert, PasswordField } from "../components/ui/Field";
import { LinkButton } from "../components/ui/LinkButton";
import { MobileResetPassword } from "../components/mobile/auth/MobileResetPassword";
import { useIsNativeApp } from "../lib/platform";

export function ResetPasswordPage() {
  if (useIsNativeApp()) return <MobileResetPassword />;
  return <WebResetPasswordPage />;
}

function WebResetPasswordPage() {
  const { uid, token } = useParams<{ uid: string; token: string }>();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  if (!uid || !token) {
    // Was a bare grey line of text on an empty screen with no way forward.
    return (
      <AuthScreen title="Անվավեր հղում" subtitle="Այս վերականգնման հղումը սխալ է կամ արդեն օգտագործված։">
        <LinkButton to="/forgot-password">Ուղարկել նոր հղում</LinkButton>
      </AuthScreen>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    setPasswordError(null);
    setConfirmError(null);

    if (newPassword.length < 8 || !/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setPasswordError("Գաղտնաբառը պետք է լինի առնվազն 8 նիշ և պարունակի տառեր ու թվեր։");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setConfirmError("Գաղտնաբառերը չեն համընկնում։");
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

  if (done) {
    return (
      <AuthScreen title="Գաղտնաբառը փոխվեց">
        <div className="mb-[var(--space-5)] flex flex-col items-center gap-[var(--space-3)] rounded-[var(--radius)] border border-correct bg-correct-bg p-[var(--space-5)] text-center">
          <CircleCheck size={26} strokeWidth={1.75} className="text-correct" aria-hidden="true" />
          <p className="text-[length:var(--text-sm)] text-text">
            Ձեր գաղտնաբառը հաջողությամբ փոփոխվեց։
          </p>
        </div>
        <Button className="w-full" onClick={() => navigate("/login")}>
          Մուտք գործել
        </Button>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen title="Նոր գաղտնաբառ" onSubmit={handleSubmit}>
      {error && <FormAlert message={error} />}

      <PasswordField
        label="Նոր գաղտնաբառ"
        hint="Առնվազն 8 նիշ, պետք է պարունակի տառեր և թվեր։"
        error={passwordError}
        value={newPassword}
        onChange={(v) => {
          setNewPassword(v);
          if (passwordError) setPasswordError(null);
        }}
        autoComplete="new-password"
        name="new-password"
        minLength={8}
        autoFocus
        required
      />

      <PasswordField
        label="Կրկնել նոր գաղտնաբառը"
        error={confirmError}
        value={confirmNewPassword}
        onChange={(v) => {
          setConfirmNewPassword(v);
          if (confirmError) setConfirmError(null);
        }}
        autoComplete="new-password"
        name="confirm-new-password"
        minLength={8}
        required
      />

      <AuthSubmitButton loading={submitting}>Փոխել գաղտնաբառը</AuthSubmitButton>

      <p className="mt-[var(--space-4)] flex justify-center">
        <LinkButton to="/login">Վերադառնալ մուտք էջ</LinkButton>
      </p>
    </AuthScreen>
  );
}
