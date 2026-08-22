import { memo, useRef, useState } from "react";
import { StopCircle } from "lucide-react";
import { synthesizeVoice, type Message } from "../../../api/assistant";
import { hapticStep } from "../../../lib/haptics";
import { AttachmentChip } from "../../assistant/AttachmentChip";
import { AssistantContent } from "../../assistant/content/AssistantContent";
import { TypingIndicator } from "../../assistant/TypingIndicator";
import { MessageActionSheet, type MessageAction } from "./MessageActionSheet";

/*
  A chat message, native.

  The web bubble reveals copy/edit/listen/regenerate/delete on hover. A finger
  has no hover, so on the phone those controls were simply unreachable — the
  whole row was dead. Here a long-press opens an action sheet instead, which is
  both the iOS convention and the only gesture that can express "act on this
  message" without stealing space from every bubble.

  Bubble shape follows the platform too: sender-coloured, tail-cornered, and
  hugging its own side rather than the web's full-width rows.
*/

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const LONG_PRESS_MS = 450;

function MobileMessageBubbleImpl({
  message,
  pending,
  activityLabel,
  onEdit,
  onDelete,
  onRegenerate,
}: {
  message: Message;
  pending?: boolean;
  activityLabel?: string | null;
  onEdit?: (content: string) => void;
  onDelete?: () => void;
  onRegenerate?: () => void;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isUser = message.role === "user";
  const failed = message.status === "failed";
  const stopped = message.status === "stopped";

  function startPress() {
    if (pending || editing) return;
    pressTimer.current = setTimeout(() => {
      hapticStep();
      setSheetOpen(true);
    }, LONG_PRESS_MS);
  }

  function cancelPress() {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = null;
  }

  async function handleListen() {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
      return;
    }
    setSpeaking(true);
    try {
      const blob = await synthesizeVoice(message.content, "nova");
      const audio = new Audio(URL.createObjectURL(blob));
      audioRef.current = audio;
      audio.play().catch(() => {});
    } catch {
      /* the sheet already closed; a failed read-aloud isn't worth a dialog */
    } finally {
      setSpeaking(false);
    }
  }

  const actions: MessageAction[] = [];
  if (message.content) {
    actions.push({
      key: "copy",
      label: "Պատճենել",
      run: () => navigator.clipboard.writeText(message.content),
    });
  }
  if (isUser && onEdit) {
    actions.push({ key: "edit", label: "Խմբագրել", run: () => setEditing(true) });
  }
  if (!isUser && !pending && message.status === "sent") {
    actions.push({ key: "listen", label: speaking ? "Բեռնվում է…" : "Լսել", run: handleListen });
  }
  if (!isUser && !pending && message.status !== "sending" && onRegenerate) {
    actions.push({ key: "regenerate", label: "Կրկին փորձել", run: onRegenerate });
  }
  if (onDelete && !pending) {
    actions.push({ key: "delete", label: "Ջնջել", destructive: true, run: onDelete });
  }

  if (editing) {
    return (
      <div className="flex flex-col items-end gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          autoFocus
          className="w-full rounded-[var(--radius-xl)] border border-primary bg-surface p-3 text-[16px] text-text outline-none"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setDraft(message.content);
              setEditing(false);
            }}
            className="h-11 rounded-[var(--radius)] border border-border px-4 text-[15px] font-medium text-text"
          >
            Չեղարկել
          </button>
          <button
            type="button"
            onClick={() => {
              onEdit?.(draft);
              setEditing(false);
            }}
            className="bg-primary h-11 rounded-[var(--radius)] px-4 text-[15px] font-semibold text-primary-contrast"
          >
            Պահպանել
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
        <div
          onPointerDown={startPress}
          onPointerUp={cancelPress}
          onPointerLeave={cancelPress}
          onPointerCancel={cancelPress}
          // The long-press gesture is the only way to reach message actions, so
          // it needs an equivalent for anyone not using touch.
          onContextMenu={(e) => {
            e.preventDefault();
            if (!pending) setSheetOpen(true);
          }}
          className={`max-w-[85%] px-4 py-2.5 transition-transform active:scale-[0.99] ${
            isUser
              ? "bg-primary rounded-[var(--radius-2xl)] rounded-br-[var(--radius-md)] text-primary-contrast"
              : "rounded-[var(--radius-2xl)] rounded-bl-[var(--radius-md)] border border-border bg-surface text-text"
          } ${failed ? "border-incorrect" : ""}`}
        >
          {message.attachments && message.attachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {message.attachments.map((a) => (
                <AttachmentChip key={a.id} attachment={a} />
              ))}
            </div>
          )}

          {pending && !isUser && !message.content ? (
            <TypingIndicator label={activityLabel} />
          ) : failed || stopped ? (
            <div className="flex flex-col gap-1.5">
              {message.content && <AssistantContent content={message.content} />}
              {failed ? (
                <p className="text-[14px] text-incorrect">
                  ⚠️ Չհաջողվեց ստանալ պատասխան{message.error_message ? `. ${message.error_message}` : "։"}
                </p>
              ) : (
                <p className="flex items-center gap-1.5 text-[14px] text-text-muted">
                  <StopCircle size={15} strokeWidth={1.75} /> Գեներացումը կանգնեցվեց։
                </p>
              )}
            </div>
          ) : isUser ? (
            <p className="text-[16px] leading-relaxed break-words whitespace-pre-wrap">{message.content}</p>
          ) : (
            <AssistantContent content={message.content} streaming={pending} />
          )}
        </div>

        <span className="mt-1 px-1.5 text-[11px] text-text-muted">
          {formatTime(message.created_at)}
          {message.edited_at && " · խմբագրված"}
        </span>
      </div>

      {sheetOpen && (
        <MessageActionSheet actions={actions} onClose={() => setSheetOpen(false)} />
      )}
    </>
  );
}

export const MobileMessageBubble = memo(MobileMessageBubbleImpl);
