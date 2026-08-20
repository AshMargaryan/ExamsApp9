import { memo, useRef, useState } from "react";
import { StopCircle, Check, TriangleAlert, Volume2 } from "lucide-react";
import { synthesizeVoice, type Message } from "../../api/assistant";
import { AttachmentChip } from "./AttachmentChip";
import { AssistantContent } from "./content/AssistantContent";
import { TypingIndicator } from "./TypingIndicator";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function MessageBubbleImpl({
  message,
  pending,
  activityLabel,
  onEdit,
  onDelete,
  onRegenerate,
}: {
  message: Message;
  pending?: boolean;
  /** Shown next to the thinking-dots while a tool call is in flight and no
   * answer text has arrived yet — irrelevant once content starts streaming. */
  activityLabel?: string | null;
  onEdit?: (content: string) => void;
  onDelete?: () => void;
  onRegenerate?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [speakError, setSpeakError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const isUser = message.role === "user";

  async function handleCopy() {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleListen() {
    if (audioRef.current) {
      // Toggle: a second click while already-generated audio is loaded just
      // replays it, no need to hit OpenAI TTS again for the same text.
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
      return;
    }
    setSpeakError(false);
    setSpeaking(true);
    try {
      const blob = await synthesizeVoice(message.content, "nova");
      const audio = new Audio(URL.createObjectURL(blob));
      audioRef.current = audio;
      audio.play().catch(() => {});
    } catch {
      setSpeakError(true);
    } finally {
      setSpeaking(false);
    }
  }

  function handleSaveEdit() {
    if (draft.trim() && draft !== message.content) {
      onEdit?.(draft.trim());
    }
    setEditing(false);
  }

  return (
    <div className={`group flex flex-col ${isUser ? "items-end" : "w-full items-start"}`}>
      <div
        className={
          isUser
            ? "max-w-[80%] rounded-[var(--radius)] bg-primary px-4 py-3 text-primary-contrast"
            // ChatGPT-style assistant reply: plain flowing text, no bubble
            // chrome (no background/border/padding) — just a readable
            // line-length cap so it doesn't stretch edge-to-edge on wide
            // screens.
            : "w-full max-w-[70ch] text-text"
        }
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
        ) : pending && !isUser && !message.content ? (
          <TypingIndicator label={activityLabel} />
        ) : message.status === "failed" || message.status === "stopped" ? (
          <div className="flex flex-col gap-2">
            {message.content && <AssistantContent content={message.content} />}
            {message.status === "failed" ? (
              <p className="flex items-start gap-1.5 text-incorrect">
                <TriangleAlert size={15} strokeWidth={2} aria-hidden className="mt-0.5 shrink-0" />
                Չհաջողվեց ստանալ պատասխան{message.error_message ? `. ${message.error_message}` : "։"}
              </p>
            ) : (
              <p className="flex items-center gap-1.5 text-text-muted">
                <StopCircle size={15} strokeWidth={1.75} /> Գեներացումը կանգնեցվեց։
              </p>
            )}
          </div>
        ) : isUser ? (
          <p className="text-[15px] leading-relaxed break-words whitespace-pre-wrap">
            {message.content}
          </p>
        ) : (
          <AssistantContent content={message.content} streaming={pending} />
        )}
      </div>

      <div
        /*
          Was `opacity-0 group-hover:opacity-100` alone. A phone has no hover,
          so copy / edit / listen / regenerate were invisible *and* unreachable
          on the platform most students read these answers on — and a keyboard
          user could tab into a button they could not see. Visible by default
          below sm; the quiet hover reveal is kept where a pointer exists, with
          focus-within added so tabbing brings them back.
        */
        className={`mt-1 flex items-center gap-2 text-xs text-text-muted transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 ${
          isUser ? "flex-row-reverse" : ""
        }`}
      >
        <span>{formatTime(message.created_at)}</span>
        {message.edited_at && <span>(խմբագրված)</span>}
        {!editing && !pending && message.content && (
          <button type="button" onClick={handleCopy} className="hover:text-text">
            {copied ? (
              <span className="flex items-center gap-1">
                <Check size={12} strokeWidth={2.5} aria-hidden /> Պատճենվեց
              </span>
            ) : (
              "Պատճենել"
            )}
          </button>
        )}
        {isUser && !editing && onEdit && (
          <button type="button" onClick={() => setEditing(true)} className="hover:text-text">
            Խմբագրել
          </button>
        )}
        {!isUser && !pending && message.status === "sent" && (
          <button type="button" onClick={handleListen} disabled={speaking} className="hover:text-text disabled:opacity-50">
            <span className="flex items-center gap-1">
              {speakError ? (
                <TriangleAlert size={12} strokeWidth={2} aria-hidden />
              ) : (
                <Volume2 size={12} strokeWidth={2} aria-hidden />
              )}
              {speaking ? "…" : speakError ? "Կրկին" : "Լսել"}
            </span>
          </button>
        )}
        {!isUser && !pending && message.status !== "sending" && onRegenerate && (
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

// Sibling bubbles must not re-render on every rAF-batched update to the one
// actively-streaming message — setMessages already produces a new object
// only for the changed message (see useConversationChat.ts), so a shallow
// prop comparison here correctly skips everyone else.
export const MessageBubble = memo(MessageBubbleImpl);
