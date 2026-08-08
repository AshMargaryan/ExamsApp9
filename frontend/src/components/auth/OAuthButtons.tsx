import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { MessageModal } from "../MessageModal";
import { GoogleSignInButton } from "./GoogleSignInButton";
import type { User } from "../../api/auth";

interface Props {
  getRedirectPath: (user: User) => string;
}

type OAuthLoginResult =
  | { status: "logged_in"; user: User }
  | { status: "needs_registration"; ticket: string; email: string; first_name: string; last_name: string };

export function OAuthButtons({ getRedirectPath }: Props) {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleResult(result: OAuthLoginResult) {
    if (result.status === "needs_registration") {
      navigate("/complete-registration", {
        state: {
          ticket: result.ticket,
          email: result.email,
          first_name: result.first_name,
          last_name: result.last_name,
        },
      });
    } else {
      navigate(getRedirectPath(result.user));
    }
  }

  async function handleGoogleCredential(idToken: string) {
    setError(null);
    setLoading(true);
    try {
      handleResult(await loginWithGoogle(idToken));
    } catch {
      setError("Google մուտքը ձախողվեց։ Փորձեք կրկին։");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6">
      <div className="mb-4 flex items-center gap-3 text-xs text-text-muted">
        <div className="h-px flex-1 bg-border" />
        կամ
        <div className="h-px flex-1 bg-border" />
      </div>
      <div className="flex flex-col items-center gap-3">
        <GoogleSignInButton onCredential={handleGoogleCredential} disabled={loading} />
      </div>
      {error && <MessageModal message={error} onClose={() => setError(null)} />}
    </div>
  );
}
