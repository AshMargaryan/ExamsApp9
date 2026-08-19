import { useState, type FormEvent } from "react";
import { MailCheck } from "lucide-react";
import { requestPasswordReset } from "../api/auth";
import { AuthScreen, AuthSubmitButton } from "../components/auth/AuthScreen";
import { Field, FormAlert } from "../components/ui/Field";
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
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch {
      // The request used to have no catch at all: a network failure left the
      // button un-pressed with nothing said, and the person retried forever.
      setError("Չհաջողվեց ուղարկել հղումը։ Ստուգեք կապը և փորձեք կրկին։");
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <AuthScreen title="Ստուգեք ձեր փոստը">
        <div className="flex flex-col items-center gap-[var(--space-3)] rounded-[var(--radius)] border border-correct bg-correct-bg p-[var(--space-5)] text-center">
          <MailCheck size={26} strokeWidth={1.75} className="text-correct" aria-hidden="true" />
          <p className="text-[length:var(--text-sm)] leading-[var(--leading-body)] text-text">
            Եթե <span className="font-medium">{email}</span> հասցեով հաշիվ գոյություն ունի, մենք ուղարկել
            ենք գաղտնաբառի վերականգնման հղում։
          </p>
        </div>
        <p className="mt-[var(--space-4)] text-center text-[length:var(--text-xs)] text-text-muted">
          Նամակը չհասա՞վ։ Ստուգեք սպամի թղթապանակը, կամ{" "}
          <button
            type="button"
            onClick={() => setSent(false)}
            className="font-medium text-primary hover:underline"
          >
            փորձեք այլ հասցեով
          </button>
          ։
        </p>
        <p className="mt-[var(--space-4)] flex justify-center">
          <LinkButton to="/login">Վերադառնալ մուտք էջ</LinkButton>
        </p>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen
      title="Մոռացե՞լ եք գաղտնաբառը"
      subtitle="Մուտքագրեք ձեր էլ. հասցեն, և մենք կուղարկենք վերականգնման հղում։"
      onSubmit={handleSubmit}
    >
      {error && <FormAlert message={error} />}
      <Field
        label="Էլ. փոստ"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        name="email"
        autoFocus
        required
      />
      <AuthSubmitButton loading={submitting}>Ուղարկել հղումը</AuthSubmitButton>

      <p className="mt-[var(--space-4)] flex justify-center">
        <LinkButton to="/login">Վերադառնալ մուտք էջ</LinkButton>
      </p>
    </AuthScreen>
  );
}
