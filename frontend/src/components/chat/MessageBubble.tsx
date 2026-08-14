import { useEffect, useRef, useState } from "react";
import type { Attachment, Message } from "../../api/chat";
import { useAuth } from "../../auth/AuthContext";
import { useAuthenticatedImageUrl } from "../../hooks/useAuthenticatedImageUrl";
import { messagePreviewText } from "../../lib/chatLabels";
import { downloadAuthenticatedFile, saveBlobUrl } from "../../lib/authenticatedFile";
import { EmojiPicker } from "./EmojiPicker";
import { ImageLightbox } from "./ImageLightbox";
import { VoiceMessagePlayer } from "./VoiceMessagePlayer";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Բ`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} ԿԲ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} ՄԲ`;
}

function senderDisplayName(sender: Message["sender"]): string {
  if (!sender) return "Ջնջված օգտատեր";
  return [sender.first_name, sender.last_name].filter(Boolean).join(" ") || sender.username;
}

function ImageAttachment({ attachment }: { attachment: Attachment }) {
  const { src, error } = useAuthenticatedImageUrl(attachment.download_url);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (error) {
    return (
      <div className="flex h-40 w-64 max-w-full items-center justify-center rounded-md border border-border bg-surface-muted text-sm text-text-muted">
        Նկարը հասանելի չէ
      </div>
    );
  }

  if (!src) {
    return <div className="h-40 w-64 max-w-full animate-pulse rounded-md bg-surface-muted" />;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setLightboxOpen(true)}
        className="block max-w-full overflow-hidden rounded-md"
      >
        <img
          src={src}
          alt={attachment.original_filename}
          className="max-h-80 w-full max-w-full rounded-md object-cover"
        />
      </button>
      {lightboxOpen && (
        <ImageLightbox
          src={src}
          filename={attachment.original_filename}
          onClose={() => setLightboxOpen(false)}
          onSave={() => saveBlobUrl(src, attachment.original_filename)}
        />
      )}
    </>
  );
}

function FileAttachment({ attachment, own }: { attachment: Attachment; own: boolean }) {
  return (
    <button
      type="button"
      onClick={() => downloadAuthenticatedFile(attachment.download_url, attachment.original_filename)}
      className={`flex min-w-[14rem] items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors ${
        own ? "border-primary-contrast/30 hover:bg-black/10" : "border-border hover:bg-surface-muted"
      }`}
    >
      <span className="text-xl">📎</span>
      <span className="min-w-0 flex-1 truncate">{attachment.original_filename}</span>
      <span className={own ? "shrink-0 text-primary-contrast/70" : "shrink-0 text-text-muted"}>
        {formatSize(attachment.file_size)}
      </span>
    </button>
  );
}

function AttachmentView({ attachment, own }: { attachment: Attachment; own: boolean }) {
  if (attachment.file_type === "image") return <ImageAttachment attachment={attachment} />;
  if (attachment.file_type === "audio") return <VoiceMessagePlayer attachment={attachment} own={own} />;
  return <FileAttachment attachment={attachment} own={own} />;
}

function ReplyQuote({
  replyTo, own, onClick,
}: {
  replyTo: NonNullable<Message["reply_to"]>;
  own: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block max-w-full truncate rounded-md border-l-4 px-2 py-1 text-left text-xs transition-colors ${
        own
          ? "border-primary-contrast/50 bg-black/10 hover:bg-black/20"
          : "border-primary bg-black/5 hover:bg-black/10"
      }`}
    >
      <p className={`truncate font-medium ${own ? "text-primary-contrast/90" : "text-primary"}`}>
        {senderDisplayName(replyTo.sender)}
      </p>
      <p className={`truncate ${own ? "text-primary-contrast/70" : "text-text-muted"}`}>
        {messagePreviewText(replyTo)}
      </p>
    </button>
  );
}

function MessageActionsMenu({
  message, own, onReply, onForward,
}: {
  message: Message;
  own: boolean;
  onReply: () => void;
  onForward: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleCopy() {
    await navigator.clipboard.writeText(message.text);
    setOpen(false);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  async function handleSave() {
    setOpen(false);
    for (const a of message.attachments) {
      await downloadAuthenticatedFile(a.download_url, a.original_filename);
    }
  }

  return (
    <div
      ref={menuRef}
      className={`relative shrink-0 self-center opacity-0 transition-opacity group-hover:opacity-100 ${
        own ? "order-first" : "order-last"
      }`}
    >
      <button
        type="button"
        title="Ընտրանքներ"
        onClick={() => setOpen((v) => !v)}
        className="rounded-full p-1.5 text-sm text-text-muted hover:bg-surface-muted hover:text-text"
      >
        {copied ? "✅" : "⋮"}
      </button>
      {open && (
        <div
          className={`absolute top-full z-10 mt-1 w-44 overflow-hidden rounded-md border border-border bg-surface py-1 shadow-lg ${
            own ? "right-0" : "left-0"
          }`}
        >
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onReply();
            }}
            className="block w-full px-3 py-2 text-left text-sm text-text hover:bg-surface-muted"
          >
            ↩️ Պատասխանել
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onForward();
            }}
            className="block w-full px-3 py-2 text-left text-sm text-text hover:bg-surface-muted"
          >
            ➡️ Փոխանցել
          </button>
          {message.text && (
            <button
              type="button"
              onClick={handleCopy}
              className="block w-full px-3 py-2 text-left text-sm text-text hover:bg-surface-muted"
            >
              📋 Պատճենել
            </button>
          )}
          {message.attachments.length > 0 && (
            <button
              type="button"
              onClick={handleSave}
              className="block w-full px-3 py-2 text-left text-sm text-text hover:bg-surface-muted"
            >
              💾 Պահպանել
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function groupReactions(reactions: Message["reactions"], currentUserId?: number) {
  const groups = new Map<string, { emoji: string; count: number; reacted: boolean }>();
  for (const r of reactions) {
    const g = groups.get(r.emoji) ?? { emoji: r.emoji, count: 0, reacted: false };
    g.count += 1;
    if (r.user.id === currentUserId) g.reacted = true;
    groups.set(r.emoji, g);
  }
  return [...groups.values()];
}

function ReactionBar({
  message, own, onReact,
}: {
  message: Message;
  own: boolean;
  onReact: (emoji: string) => void;
}) {
  const { user } = useAuth();
  const [pickerOpen, setPickerOpen] = useState(false);
  const groups = groupReactions(message.reactions, user?.id);

  return (
    <div className={`flex flex-wrap items-center gap-1 ${own ? "justify-end" : "justify-start"}`}>
      {groups.map((g) => (
        <button
          key={g.emoji}
          type="button"
          onClick={() => onReact(g.emoji)}
          className={`animate-[pop-in_0.2s_ease-out] rounded-full border px-1.5 py-0.5 text-xs transition-colors ${
            g.reacted
              ? "border-primary bg-primary/10 text-primary"
              : "border-border bg-surface-muted text-text-muted hover:bg-surface"
          }`}
        >
          {g.emoji} {g.count}
        </button>
      ))}
      <div className="relative">
        <button
          type="button"
          title="Ավելացնել ռեակցիա"
          onClick={() => setPickerOpen((v) => !v)}
          className="rounded-full px-1.5 py-0.5 text-xs text-text-muted opacity-0 transition-opacity hover:bg-surface-muted group-hover:opacity-100"
        >
          🙂+
        </button>
        {pickerOpen && (
          <EmojiPicker
            align={own ? "right" : "left"}
            onSelect={(emoji) => {
              onReact(emoji);
              setPickerOpen(false);
            }}
            onClose={() => setPickerOpen(false)}
          />
        )}
      </div>
    </div>
  );
}

export function MessageBubble({
  message, own, showSender, highlighted, registerRef, onReply, onForward, onJumpToMessage, onReact,
}: {
  message: Message;
  own: boolean;
  showSender: boolean;
  highlighted?: boolean;
  registerRef?: (el: HTMLDivElement | null) => void;
  onReply: () => void;
  onForward: () => void;
  onJumpToMessage: (messageId: number) => void;
  onReact: (emoji: string) => void;
}) {
  const senderName = senderDisplayName(message.sender);
  const time = new Date(message.created_at).toLocaleTimeString("hy-AM", { hour: "2-digit", minute: "2-digit" });

  return (
    <div
      ref={registerRef}
      className={`group flex items-center gap-1 rounded-md transition-colors ${own ? "justify-end" : "justify-start"} ${
        highlighted ? "bg-primary/10" : ""
      }`}
    >
      <MessageActionsMenu message={message} own={own} onReply={onReply} onForward={onForward} />
      <div className={`flex max-w-[80%] flex-col gap-1 ${own ? "items-end" : "items-start"}`}>
        {showSender && !own && <span className="px-1 text-xs text-text-muted">{senderName}</span>}
        <div
          className={`flex flex-col gap-2 rounded-2xl px-3.5 py-2.5 ${
            own ? "rounded-br-sm bg-primary text-primary-contrast" : "rounded-bl-sm bg-surface-muted text-text"
          }`}
        >
          {message.reply_to && (
            <ReplyQuote replyTo={message.reply_to} own={own} onClick={() => onJumpToMessage(message.reply_to!.id)} />
          )}
          {message.attachments.map((a) => (
            <AttachmentView key={a.id} attachment={a} own={own} />
          ))}
          {message.text && <p className="whitespace-pre-wrap break-words">{message.text}</p>}
        </div>
        <ReactionBar message={message} own={own} onReact={onReact} />
        <span className="px-1 text-xs text-text-muted">{time}</span>
      </div>
    </div>
  );
}
