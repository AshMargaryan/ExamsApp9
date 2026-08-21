import { useState } from "react";
import { Check, X } from "lucide-react";
import * as chatApi from "../../api/chat";
import type { ReportReason } from "../../api/chat";

const REASONS: { value: ReportReason; label: string }[] = [
  { value: "spam", label: "Սպամ" },
  { value: "harassment", label: "Ոտնձգություն/վիրավորանք" },
  { value: "inappropriate", label: "Անհարիր բովանդակություն" },
  { value: "other", label: "Այլ" },
];

export function ReportMessageModal({ messageId, onClose }: { messageId: number; onClose: () => void }) {
  const [reason, setReason] = useState<ReportReason>("spam");
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    setSending(true);
    try {
      await chatApi.reportMessage(messageId, reason, details);
      setSent(true);
      setTimeout(onClose, 1200);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-[var(--radius)] border border-border bg-surface p-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text">Բողոքել հաղորդագրությունից</h2>
          <button type="button" onClick={onClose} className="text-text-muted hover:text-text">
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        {sent ? (
          <p className="flex items-center justify-center gap-1.5 py-4 text-center text-sm text-correct">
            <Check size={16} strokeWidth={1.75} /> Բողոքն ուղարկվեց
          </p>
        ) : (
          <>
            <div className="mb-3 flex flex-col gap-1">
              {REASONS.map((r) => (
                <label key={r.value} className="flex items-center gap-2 text-sm text-text">
                  <input
                    type="radio"
                    name="reason"
                    checked={reason === r.value}
                    onChange={() => setReason(r.value)}
                  />
                  {r.label}
                </label>
              ))}
            </div>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Մանրամասներ (ոչ պարտադիր)"
              rows={2}
              className="mb-3 w-full resize-none rounded-md border border-border bg-bg px-2 py-1.5 text-sm text-text focus:border-primary"
            />
            <button
              type="button"
              onClick={handleSubmit}
              disabled={sending}
              className="w-full rounded-md bg-incorrect px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
            >
              {sending ? "..." : "Ուղարկել բողոքը"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
