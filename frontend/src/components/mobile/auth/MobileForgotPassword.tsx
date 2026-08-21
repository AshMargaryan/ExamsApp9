import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MailCheck, Mail } from "lucide-react";
import { requestPasswordReset } from "../../../api/auth";
import { hapticSuccess } from "../../../lib/haptics";
import { AuthShell, AuthPrimaryButton } from "./AuthShell";
import { MobileTextField } from "./MobileTextField";

/** Password reset request, native. The success state replaces the form rather
 *  than appearing above it — once the mail is sent there is nothing left to do
 *  on this screen, and leaving a live form under the confirmation invites a
 *  second submission that the backend rate-limits at 3/hour per mailbox. */
export function MobileForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await requestPasswordReset(email);
      hapticSuccess();
      setSent(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <AuthShell
        onBack={() => navigate("/login")}
        title="Ստուգիր փոստդ"
        subtitle="Եթե այս հասցեով հաշիվ կա, վերականգնման հղումն արդեն ճանապարհին է։"
        footer={
          <AuthPrimaryButton onClick={() => navigate("/login")}>Վերադառնալ մուտք</AuthPrimaryButton>
        }
      >
        <span className="mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-correct-bg text-correct">
          <MailCheck size={30} strokeWidth={1.75} />
        </span>
        <p className="text-[15px] leading-relaxed text-text-muted">
          Ուղարկեցինք <span className="font-semibold text-text">{email}</span> հասցեին։ Եթե նամակը չես տեսնում,
          նայիր նաև սպամի պանակը։
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      onBack={() => navigate("/login")}
      title="Վերականգնիր մուտքը"
      subtitle="Գրիր էլ. հասցեդ, և կուղարկենք գաղտնաբառը փոխելու հղում։"
      footer={
        <div className="flex flex-col gap-3">
          <AuthPrimaryButton onClick={handleSubmit} loading={submitting} disabled={!email.trim()}>
            Ուղարկել հղումը
          </AuthPrimaryButton>
          <p className="text-center text-[14px] text-text-muted">
            Հիշեցի՞ր{" "}
            <Link to="/login" className="font-semibold text-primary">
              Մուտք
            </Link>
          </p>
        </div>
      }
    >
      <MobileTextField
        label="Էլ. փոստ"
        value={email}
        onValueChange={setEmail}
        icon={<Mail size={18} strokeWidth={1.75} />}
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="send"
        showValid
      />
    </AuthShell>
  );
}
