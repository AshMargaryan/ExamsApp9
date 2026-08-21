import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, type Location } from "react-router-dom";
import { AlertCircle, KeyRound, User } from "lucide-react";
import { useAuth } from "../../../auth/AuthContext";
import type { User as AuthUser } from "../../../api/auth";
import { useToast } from "../../../context/ToastContext";
import { hapticError, hapticSuccess } from "../../../lib/haptics";
import { AuthShell, AuthPrimaryButton } from "./AuthShell";
import { MobileTextField } from "./MobileTextField";
import { OAuthRow, hasOAuthProvider } from "./OAuthRow";

/*
  Native sign-in. Same two credentials as the web form, but errors land inline
  under the fields instead of in a modal (a modal to say "wrong password" is a
  desktop habit), the submit button owns its own loading state, and the field
  attributes are set up so iOS offers the saved password in the QuickType bar.
*/
export function MobileLogin() {
  const { login } = useAuth();
  const { showSuccess } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function redirectPath(user: AuthUser): string {
    const redirectTo = (location.state as { from?: Location } | null)?.from;
    if (redirectTo) return `${redirectTo.pathname}${redirectTo.search}`;
    return user.role === "parent" ? "/family" : "/";
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { user, signedOutDevice } = await login(username, password);
      hapticSuccess();
      // Being signed out elsewhere with no explanation is alarming, so say it
      // plainly. A toast rather than a blocking dialog: the login succeeded,
      // and there is nothing for the user to decide.
      if (signedOutDevice) {
        showSuccess(
          `Դուրս եկար «${signedOutDevice.label}» սարքից — միաժամանակ թույլատրվում է ${signedOutDevice.device_limit} սարք։`,
        );
      }
      navigate(redirectPath(user));
    } catch {
      setError("Սխալ օգտանուն կամ գաղտնաբառ։");
      hapticError();
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = username.trim().length > 0 && password.length > 0;

  return (
    <form onSubmit={handleSubmit} noValidate className="contents">
      <AuthShell
        onBack={() => navigate("/")}
        showLogo
        title="Բարի վերադարձ"
        subtitle="Մուտք գործիր և շարունակիր այնտեղից, որտեղ կանգ առար։"
        footer={
          <div className="flex flex-col gap-3">
            <AuthPrimaryButton type="submit" loading={submitting} disabled={!canSubmit}>
              Մուտք գործել
            </AuthPrimaryButton>
            <p className="text-center text-[14px] text-text-muted">
              Դեռ հաշիվ չունե՞ս{" "}
              <Link to="/register" className="font-semibold text-primary">
                Գրանցվել
              </Link>
            </p>
          </div>
        }
      >
        {error && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-2.5 rounded-2xl border border-incorrect/40 bg-incorrect-bg px-4 py-3 text-[14px] text-incorrect"
          >
            <AlertCircle size={17} strokeWidth={2} className="mt-px flex-none" />
            {error}
          </div>
        )}

        <MobileTextField
          label="Օգտանուն"
          value={username}
          onValueChange={(v) => {
            setUsername(v);
            setError(null);
          }}
          icon={<User size={18} strokeWidth={1.75} />}
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="next"
          required
        />

        <MobileTextField
          label="Գաղտնաբառ"
          value={password}
          onValueChange={(v) => {
            setPassword(v);
            setError(null);
          }}
          icon={<KeyRound size={18} strokeWidth={1.75} />}
          revealable
          autoComplete="current-password"
          enterKeyHint="go"
          required
        />

        <Link to="/forgot-password" className="block py-2 text-[14px] font-medium text-primary">
          Մոռացե՞լ ես գաղտնաբառը
        </Link>

        {hasOAuthProvider && <OAuthRow getRedirectPath={redirectPath} />}
      </AuthShell>
    </form>
  );
}
