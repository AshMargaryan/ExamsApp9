import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, type Location } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { MessageModal } from "../components/MessageModal";
import { AuthScreen, AuthSubmitButton } from "../components/auth/AuthScreen";
import { OAuthButtons } from "../components/auth/OAuthButtons";
import { LinkButton } from "../components/ui/LinkButton";
import { MobileLogin } from "../components/mobile/auth/MobileLogin";
import { useIsNativeApp } from "../lib/platform";
import type { User } from "../api/auth";
import { useToast } from "../context/ToastContext";

export function LoginPage() {
  // The native screen is a different composition, not a restyle of this one —
  // inline errors, a pinned footer, and its own field primitives.
  if (useIsNativeApp()) return <MobileLogin />;
  return <WebLoginPage />;
}

function WebLoginPage() {
  const { login } = useAuth();
  const { showSuccess } = useToast();
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
      const { user, signedOutDevice } = await login(username, password);
      // The device cap now evicts the oldest device instead of blocking this
      // login, so the only thing left to do is tell the user it happened.
      if (signedOutDevice) {
        showSuccess(
          `Դուրս եկաք «${signedOutDevice.label}» սարքից — միաժամանակ թույլատրվում է ${signedOutDevice.device_limit} սարք։`,
        );
      }
      navigate(redirectPath(user));
    } catch {
      setError("Սխալ օգտանուն կամ գաղտնաբառ։");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthScreen
      title="Մուտք"
      onSubmit={handleSubmit}
      overlay={error ? <MessageModal message={error} onClose={() => setError(null)} /> : null}
    >
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

      <AuthSubmitButton disabled={submitting}>{submitting ? "..." : "Մուտք գործել"}</AuthSubmitButton>

      <p className="mt-3 flex justify-center">
        <LinkButton to="/forgot-password">Մոռացե՞լ եք գաղտնաբառը</LinkButton>
      </p>

      <p className="mt-4 text-center text-sm text-text-muted">
        Դեռ հաշիվ չունե՞ք։{" "}
        <Link to="/register" className="text-primary hover:underline">
          Գրանցվել
        </Link>
      </p>

      <OAuthButtons getRedirectPath={redirectPath} />
    </AuthScreen>
  );
}
