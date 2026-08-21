import { useEffect, useState } from "react";

declare global {
  interface Window {
    AppleID?: {
      auth: {
        init: (config: {
          clientId: string;
          scope: string;
          redirectURI: string;
          usePopup: boolean;
        }) => void;
        signIn: () => Promise<{
          authorization: { id_token: string };
          user?: { name?: { firstName?: string; lastName?: string } };
        }>;
      };
    };
  }
}

const APPLE_CLIENT_ID = import.meta.env.VITE_APPLE_CLIENT_ID as string | undefined;
const APPLE_REDIRECT_URI = import.meta.env.VITE_APPLE_REDIRECT_URI as string | undefined;
const APPLE_SDK_SRC =
  "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";

let scriptLoadPromise: Promise<void> | null = null;

function loadAppleScript(): Promise<void> {
  if (window.AppleID?.auth) return Promise.resolve();
  scriptLoadPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = APPLE_SDK_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Apple Sign In script"));
    document.head.appendChild(script);
  });
  return scriptLoadPromise;
}

interface Props {
  onCredential: (idToken: string, firstName: string, lastName: string) => void;
  onError: () => void;
  disabled?: boolean;
}

// Not end-to-end testable until a real HTTPS domain is registered with Apple
// (see backend/.env.example) — implemented and wired, awaiting credentials.
export function AppleSignInButton({ onCredential, onError, disabled }: Props) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!APPLE_CLIENT_ID || !APPLE_REDIRECT_URI) return;
    let cancelled = false;
    loadAppleScript()
      .then(() => {
        if (cancelled || !window.AppleID) return;
        window.AppleID.auth.init({
          clientId: APPLE_CLIENT_ID,
          scope: "name email",
          redirectURI: APPLE_REDIRECT_URI,
          usePopup: true,
        });
        setReady(true);
      })
      .catch(() => {
        // SDK failed to load — button stays hidden below, no crash.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleClick() {
    if (!window.AppleID) return;
    try {
      const result = await window.AppleID.auth.signIn();
      const firstName = result.user?.name?.firstName ?? "";
      const lastName = result.user?.name?.lastName ?? "";
      onCredential(result.authorization.id_token, firstName, lastName);
    } catch (err) {
      const code = (err as { error?: string } | undefined)?.error;
      // User closed the popup — not a real failure, no error needed.
      if (code === "popup_closed_by_user" || code === "user_cancelled_authorize") return;
      onError();
    }
  }

  if (!APPLE_CLIENT_ID || !APPLE_REDIRECT_URI) return null;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || !ready}
      className="flex w-full items-center justify-center gap-2 rounded-[var(--radius)] border border-border bg-bg py-2.5 font-medium text-text transition-colors hover:border-primary disabled:opacity-60"
    >
      <span aria-hidden></span>
      Շարունակել Apple-ով
    </button>
  );
}
