import { useState, type FormEvent } from "react";
import { requestPasswordReset } from "../api/auth";
import { LinkButton } from "../components/ui/LinkButton";
import { MobileForgotPassword } from "../components/mobile/auth/MobileForgotPassword";
import { useIsNativeApp } from "../lib/platform";

export function ForgotPasswordPage() {
  if (useIsNativeApp()) return <MobileForgotPassword />;
  return <WebForgotPasswordPage />;
}

function WebForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm rounded-[var(--radius)] border border-border bg-surface p-8 shadow-sm">
        <h1 className="mb-2 text-2xl font-semibold text-text">Մոռացե՞լ եք գաղտնաբառը</h1>

        {sent ? (
          <p className="mb-4 text-sm text-text-muted">
            Եթե այս էլ. հասցեով հաշիվ գոյություն ունի, մենք ուղարկել ենք գաղտնաբառի վերականգնման հղում։
            Ստուգեք ձեր փոստարկղը։
          </p>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <p className="mb-4 text-sm text-text-muted">
              Մուտքագրեք ձեր էլ. հասցեն, և մենք կուղարկենք գաղտնաբառի վերականգնման հղում։
            </p>
            <label className="mb-1 block text-sm text-text-muted">Էլ. փոստ</label>
            <input
              type="email"
              className="mb-4 w-full rounded-md border border-border bg-bg px-3 py-2 text-text outline-none focus:border-primary"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              required
            />
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-primary py-2 font-medium text-primary-contrast transition-colors hover:bg-primary-hover disabled:opacity-60"
            >
              {submitting ? "..." : "Ուղարկել հղումը"}
            </button>
          </form>
        )}

        <p className="mt-4 flex justify-center">
          <LinkButton to="/login">Վերադառնալ մուտք էջ</LinkButton>
        </p>
      </div>
    </div>
  );
}
