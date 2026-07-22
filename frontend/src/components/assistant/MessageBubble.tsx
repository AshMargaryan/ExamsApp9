import { useState } from "react";
import type { Message } from "../../api/assistant";
import { AttachmentChip } from "./AttachmentChip";
import { MarkdownMessage } from "./MarkdownMessage";
import { TypingIndicator } from "./TypingIndicator";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function MessageBubble({
  message,
  pending,
  onEdit,
  onDelete,
  onRegenerate,
}: {
  message: Message;
  pending?: boolean;
  onEdit?: (content: string) => void;
  onDelete?: () => void;
  onRegenerate?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const [copied, setCopied] = useState(false);

  const isUser = message.role === "user";

  async function handleCopy() {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function handleSaveEdit() {
    if (draft.trim() && draft !== message.content) {
      onEdit?.(draft.trim());
    }
    setEditing(false);
  }

  return (
    <div className={`group flex flex-col ${isUser ? "items-end" : "items-start"}`}>
      <div
        className={`max-w-[80%] rounded-[var(--radius)] px-4 py-3 ${
          isUser ? "bg-primary text-primary-contrast" : "bg-surface-muted text-text"
        } ${message.status === "failed" ? "border border-incorrect" : ""}`}
      >
        {message.attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {message.attachments.map((a) => (
              <AttachmentChip key={a.id} attachment={a} />
            ))}
          </div>
        )}

        {editing ? (
          <div className="flex flex-col gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              className="min-w-[16rem] rounded-md border border-border bg-surface p-2 text-sm text-text"
              autoFocus
            />
            <div className="flex gap-2 text-sm">
              <button
                type="button"
                onClick={handleSaveEdit}
                className="rounded bg-primary px-3 py-1 text-primary-contrast"
              >
                Պահպանել
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraft(message.content);
                  setEditing(false);
                }}
                className="rounded border border-border px-3 py-1 text-text"
              >
                Չեղարկել
              </button>
            </div>
          </div>
        ) : pending && !isUser ? (
          <TypingIndicator />
        ) : message.status === "failed" ? (
          <p className="text-incorrect">
            ⚠️ Չհաջողվեց ստանալ պատասխան{message.error_message ? `. ${message.error_message}` : "։"}
          </p>
        ) : isUser ? (
          <p className="text-[15px] leading-relaxed break-words whitespace-pre-wrap">
            {message.content}
          </p>
        ) : (
          <MarkdownMessage content={message.content} />
        )}
      </div>

      <div
        className={`mt-1 flex items-center gap-2 text-xs text-text-muted opacity-0 transition-opacity group-hover:opacity-100 ${
          isUser ? "flex-row-reverse" : ""
        }`}
      >
        <span>{formatTime(message.created_at)}</span>
        {message.edited_at && <span>(խմբագրված)</span>}
        {!editing && !pending && message.status === "sent" && (
          <button type="button" onClick={handleCopy} className="hover:text-text">
            {copied ? "Պատճենվեց ✓" : "Պատճենել"}
          </button>
        )}
        {isUser && !editing && onEdit && (
          <button type="button" onClick={() => setEditing(true)} className="hover:text-text">
            Խմբագրել
          </button>
        )}
        {!isUser && !pending && message.status === "sent" && onRegenerate && (
          <button type="button" onClick={onRegenerate} className="hover:text-text">
            ↻ Կրկին փորձել
          </button>
        )}
        {onDelete && !pending && (
          <button type="button" onClick={onDelete} className="hover:text-incorrect">
            Ջնջել
          </button>
        )}
      </div>
    </div>
  );
}
