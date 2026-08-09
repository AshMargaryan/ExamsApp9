import { useEffect, useRef } from "react";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const GSI_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

let scriptLoadPromise: Promise<void> | null = null;

function loadGoogleScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  scriptLoadPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = GSI_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Identity Services script"));
    document.head.appendChild(script);
  });
  return scriptLoadPromise;
}

interface Props {
  onCredential: (idToken: string) => void;
  disabled?: boolean;
}

export function GoogleSignInButton({ onCredential, disabled }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onCredentialRef = useRef(onCredential);
  onCredentialRef.current = onCredential;

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let cancelled = false;
    loadGoogleScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => onCredentialRef.current(response.credential),
        });
        window.google.accounts.id.renderButton(containerRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          width: 320,
          text: "continue_with",
          locale: "hy",
        });
      })
      .catch(() => {
        // Script failed to load (offline, blocked, ...) — the button simply
        // won't render; OAuthButtons' divider still shows the email form.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!GOOGLE_CLIENT_ID) return null;

  return <div ref={containerRef} className={disabled ? "pointer-events-none opacity-60" : undefined} />;
}
