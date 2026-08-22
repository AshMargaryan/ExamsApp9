import { useState } from "react";
import { Check, Copy } from "lucide-react";
import type { AcademicPower, Profile } from "../../api/profile";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";

/*
  The shareable summary of a profile.

  Was a hand-rolled `fixed inset-0` overlay with a "✕" text glyph for a close
  button: no role="dialog", no focus trap, no Escape, no focus restoration.
  It is on ui/Modal now, whose own footer action is the way out — which is
  also how every other dialog in the product closes.

  The emoji in `lines` stay. They are not iconography here: this array *is*
  the text the student copies to their clipboard and pastes into a chat or a
  story, where the emoji are the content and carry the formatting. The
  preview renders the same strings precisely so that what is shown is what
  gets copied.
*/
export function ShareProfileCard({
  profile,
  academicPower,
  onClose,
}: {
  profile: Profile;
  academicPower: AcademicPower | null;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.username;

  const lines = [
    fullName,
    profile.target_major ? `🎓 ${profile.target_major}` : null,
    profile.streak && profile.streak.current_streak > 0 ? `🔥 ${profile.streak.current_streak}-օրյա շարք` : null,
    `🏆 Մակարդակ ${profile.level}`,
    `📚 ${profile.stats?.questions_solved ?? 0} լուծված հարց`,
    profile.stats ? `🎯 ${profile.stats.accuracy_percentage}% ճշգրտություն` : null,
    academicPower?.available ? `⚡ ${academicPower.power}/1000 ակադեմիական հզորություն` : null,
    "Gitus",
  ].filter(Boolean) as string[];

  async function handleCopy() {
    // The clipboard write can reject — denied permission, or any non-secure
    // context. It used to be unawaited-optimistic, so a rejection left the
    // button sitting on its old label with nothing copied and nothing said.
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopyFailed(false);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
      setCopyFailed(true);
    }
  }

  return (
    <Modal
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title="Կիսվել պրոֆիլով"
      footer={
        <Button
          type="button"
          className="w-full"
          onClick={handleCopy}
          iconLeft={
            copied ? (
              <Check size={15} strokeWidth={2.25} aria-hidden />
            ) : (
              <Copy size={15} strokeWidth={1.75} aria-hidden />
            )
          }
        >
          {copied ? "Պատճենվեց" : "Պատճենել որպես տեքստ"}
        </Button>
      }
    >
      <div className="rounded-[var(--radius)] border border-border bg-bg p-[var(--space-5)] text-center">
        <p className="text-[length:var(--text-lg)] font-bold text-text">{fullName}</p>
        <div className="mt-[var(--space-3)] flex flex-col gap-[var(--space-1)] text-[length:var(--text-sm)] text-text-muted">
          {lines.slice(1, -1).map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        <p className="mt-[var(--space-4)] text-[length:var(--text-xs)] font-semibold tracking-wide text-primary">
          GITUS
        </p>
      </div>

      {copyFailed && (
        <p role="status" className="mt-[var(--space-3)] text-[length:var(--text-xs)] text-incorrect">
          Չհաջողվեց պատճենել։ Ընտրիր տեքստը և պատճենիր ձեռքով։
        </p>
      )}
    </Modal>
  );
}
