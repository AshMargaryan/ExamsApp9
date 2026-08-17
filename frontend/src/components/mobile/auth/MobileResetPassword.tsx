import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AxiosError } from "axios";
import { AlertCircle, CheckCircle2, KeyRound } from "lucide-react";
import { confirmPasswordReset } from "../../../api/auth";
import { hapticError, hapticSuccess } from "../../../lib/haptics";
import { AuthShell, AuthPrimaryButton } from "./AuthShell";
import { MobileTextField } from "./MobileTextField";
import { PasswordStrength, isPasswordValid } from "./PasswordStrength";

/** Setting a new password from an emailed link, native. Shares the strength
 *  meter with signup so the same rules are shown the same way in both places. */
export function MobileResetPassword() {
  const { uid, token } = useParams<{ uid: string; token: string }>();
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  if (!uid || !token) {
    return (
      <AuthShell
        onBack={() => navigate("/login")}
        title="Անվավեր հղում"
        subtitle="Այս հղումը թերի է։ Խնդրիր նորը մուտքի էջից։"
        footer={<AuthPrimaryButton onClick={() => navigate("/forgot-password")}>Խնդրել նոր հղում</AuthPrimaryButton>}
      >
        <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-incorrect/15 text-incorrect">
          <AlertCircle size={30} strokeWidth={1.75} />
        </span>
      </AuthShell>
    );
  }

  async function handleSubmit() {
    setError(null);

    if (!isPasswordValid(newPassword)) {
      setError("Գաղտնաբառը չի բավարարում պահանջներին։");
      hapticError();
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError("Գաղտնաբառերը չեն համընկնում։");
      hapticError();
      return;
    }

    setSubmitting(true);
    try {
      await confirmPasswordReset(uid!, token!, newPassword, confirmNewPassword);
      hapticSuccess();
      setDone(true);
    } catch (err) {
      hapticError();
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
      <AuthShell
        title="Պատրաստ է"
        subtitle="Գաղտնաբառդ թարմացվեց։ Կարող ես մուտք գործել նորով։"
        footer={<AuthPrimaryButton onClick={() => navigate("/login")}>Մուտք գործել</AuthPrimaryButton>}
      >
        <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-correct/15 text-correct">
          <CheckCircle2 size={30} strokeWidth={1.75} />
        </span>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      onBack={() => navigate("/login")}
      title="Նոր գաղտնաբառ"
      subtitle="Ընտրիր գաղտնաբառ, որը հեշտ կհիշես, բայց ուրիշները չեն գուշակի։"
      footer={
        <AuthPrimaryButton
          onClick={handleSubmit}
          loading={submitting}
          disabled={!isPasswordValid(newPassword) || confirmNewPassword.length === 0}
        >
          Պահպանել
        </AuthPrimaryButton>
      }
    >
      {error && (
        <div
          role="alert"
          className="mb-5 flex items-start gap-2.5 rounded-2xl border border-incorrect/40 bg-incorrect/10 px-4 py-3 text-[14px] text-incorrect"
        >
          <AlertCircle size={17} strokeWidth={2} className="mt-px flex-none" />
          {error}
        </div>
      )}

      <MobileTextField
        label="Նոր գաղտնաբառ"
        value={newPassword}
        onValueChange={(v) => {
          setNewPassword(v);
          setError(null);
        }}
        icon={<KeyRound size={18} strokeWidth={1.75} />}
        revealable
        autoComplete="new-password"
        enterKeyHint="next"
      />
      <PasswordStrength password={newPassword} />
      <MobileTextField
        label="Կրկնիր գաղտնաբառը"
        value={confirmNewPassword}
        onValueChange={(v) => {
          setConfirmNewPassword(v);
          setError(null);
        }}
        icon={<KeyRound size={18} strokeWidth={1.75} />}
        revealable
        autoComplete="new-password"
        enterKeyHint="done"
        showValid={newPassword.length > 0 && confirmNewPassword === newPassword}
      />
    </AuthShell>
  );
}
