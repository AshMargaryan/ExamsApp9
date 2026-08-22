import { useEffect, useRef, useState } from "react";
import {
  Ban, Check, CheckCheck, Copy, Download, Flag, Forward, MoreVertical, Paperclip, Pencil,
  Pin, PinOff, Reply as ReplyIcon, Sparkles, Trash2,
} from "lucide-react";
import type { Attachment, Message } from "../../api/chat";
import { useAuth } from "../../auth/AuthContext";
import { useAuthenticatedImageUrl } from "../../hooks/useAuthenticatedImageUrl";
import { isAiSender, messagePreviewText } from "../../lib/chatLabels";
import { cn } from "../../lib/cn";
import { fieldInputClass } from "../ui/Field";
import { downloadAuthenticatedFile, saveBlobUrl } from "../../lib/authenticatedFile";
import { ContextCard } from "./ContextCard";
import { EmojiPicker } from "./EmojiPicker";
import { ImageLightbox } from "./ImageLightbox";
import { ReportMessageModal } from "./ReportMessageModal";
import { VoiceMessagePlayer } from "./VoiceMessagePlayer";
import { formatBytes } from "../../lib/formatBytes";

function senderDisplayName(sender: Message["sender"]): string {
  if (!sender) return "Ջնջված օգտատեր";
  return [sender.first_name, sender.last_name].filter(Boolean).join(" ") || sender.username;
}

function ImageAttachment({ attachment }: { attachment: Attachment }) {
  const { src, error } = useAuthenticatedImageUrl(attachment.download_url);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (error) {
    return (
      <div className="flex h-40 w-64 max-w-full items-center justify-center rounded-[var(--radius-md)] border border-border bg-surface-muted text-sm text-text-muted">
        Նկարը հասանելի չէ
      </div>
    );
  }

  if (!src) {
    return <div className="h-40 w-64 max-w-full animate-pulse rounded-[var(--radius-md)] bg-surface-muted" />;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setLightboxOpen(true)}
        className="block max-w-full overflow-hidden rounded-[var(--radius-md)]"
      >
        <img
          src={src}
          alt={attachment.original_filename}
          className="max-h-80 w-full max-w-full rounded-[var(--radius-md)] object-cover"
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
      className={`flex min-w-[14rem] items-center gap-2 rounded-[var(--radius-md)] border px-3 py-2 text-left text-sm transition-colors ${
        own ? "border-primary-contrast/30 hover:bg-black/10" : "border-border hover:bg-surface-muted"
      }`}
    >
      <Paperclip size={18} strokeWidth={1.75} />
      <span className="min-w-0 flex-1 truncate">{attachment.original_filename}</span>
      <span className={own ? "shrink-0 text-primary-contrast/70" : "shrink-0 text-text-muted"}>
        {formatBytes(attachment.file_size)}
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
      className={`block max-w-full truncate rounded-[var(--radius-md)] border-l-4 px-2 py-1 text-left text-xs transition-colors ${
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
  message, own, onReply, onForward, onEdit, onDeleteForEveryone, onDeleteForMe, onReport, onAskAI,
  canPin, onTogglePin,
}: {
  message: Message;
  own: boolean;
  onReply: () => void;
  onForward: () => void;
  onEdit: () => void;
  onDeleteForEveryone: () => void;
  onDeleteForMe: () => void;
  onReport: () => void;
  onAskAI: () => void;
  canPin: boolean;
  onTogglePin: () => void;
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

  const canEdit = own && message.message_type === "text" && !message.context_type;
  const isAi = isAiSender(message.sender);

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
        {copied ? <Check size={16} strokeWidth={1.75} /> : <MoreVertical size={16} strokeWidth={1.75} />}
      </button>
      {open && (
        <div
          className={`absolute top-full z-10 mt-1 w-44 overflow-hidden rounded-[var(--radius)] border border-border bg-surface py-1 shadow-lg ${
            own ? "right-0" : "left-0"
          }`}
        >
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onReply();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text hover:bg-surface-muted"
          >
            <ReplyIcon size={15} strokeWidth={1.75} /> Պատասխանել
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onForward();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text hover:bg-surface-muted"
          >
            <Forward size={15} strokeWidth={1.75} /> Փոխանցել
          </button>
          {message.text && (
            <button
              type="button"
              onClick={handleCopy}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text hover:bg-surface-muted"
            >
              <Copy size={15} strokeWidth={1.75} /> Պատճենել
            </button>
          )}
          {message.attachments.length > 0 && (
            <button
              type="button"
              onClick={handleSave}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text hover:bg-surface-muted"
            >
              <Download size={15} strokeWidth={1.75} /> Պահպանել
            </button>
          )}
          {canEdit && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onEdit();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text hover:bg-surface-muted"
            >
              <Pencil size={15} strokeWidth={1.75} /> Խմբագրել
            </button>
          )}
          {own && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onDeleteForEveryone();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-incorrect hover:bg-surface-muted"
            >
              <Trash2 size={15} strokeWidth={1.75} /> Ջնջել բոլորի համար
            </button>
          )}
          {!isAi && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onAskAI();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text hover:bg-surface-muted"
            >
              <Sparkles size={15} strokeWidth={1.75} /> Հարցնել AI-ին
            </button>
          )}
          {canPin && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onTogglePin();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text hover:bg-surface-muted"
            >
              {message.pinned_at ? (
                <>
                  <PinOff size={15} strokeWidth={1.75} /> Հանել ամրակցումից
                </>
              ) : (
                <>
                  <Pin size={15} strokeWidth={1.75} /> Ամրակցել
                </>
              )}
            </button>
          )}
          {!own && !isAi && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onReport();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-incorrect hover:bg-surface-muted"
            >
              <Flag size={15} strokeWidth={1.75} /> Բողոքել
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onDeleteForMe();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-incorrect hover:bg-surface-muted"
          >
            <Trash2 size={15} strokeWidth={1.75} /> Ջնջել ինձ համար
          </button>
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

function EditComposer({
  message, onSave, onCancel,
}: {
  message: Message;
  onSave: (text: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState(message.text);
  return (
    <div className="flex w-72 max-w-full flex-col gap-2 rounded-[var(--radius-xl)] border border-primary bg-surface p-2.5">
      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        className={cn(fieldInputClass, "resize-none px-[var(--space-2)] py-[var(--space-1)] text-[length:var(--text-sm)]")}
      />
      <div className="flex justify-end gap-2 text-xs">
        <button type="button" onClick={onCancel} className="px-2 py-1 text-text-muted hover:text-text">
          Չեղարկել
        </button>
        <button
          type="button"
          onClick={() => text.trim() && onSave(text.trim())}
          className="rounded-[var(--radius)] bg-primary px-2 py-1 font-medium text-primary-contrast hover:bg-primary-hover"
        >
          Պահպանել
        </button>
      </div>
    </div>
  );
}

export function MessageBubble({
  message, own, showSender, highlighted, registerRef, onReply, onForward, onJumpToMessage, onReact,
  onEdit, onDeleteForEveryone, onDeleteForMe, onAskAI, receipt, canPin, onTogglePin,
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
  onEdit: (text: string) => void;
  onDeleteForEveryone: () => void;
  onDeleteForMe: () => void;
  onAskAI: () => void;
  receipt?: "sent" | "read";
  canPin?: boolean;
  onTogglePin?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [reporting, setReporting] = useState(false);
  const isAi = isAiSender(message.sender);
  const senderName = isAi ? "Gitus AI" : senderDisplayName(message.sender);
  const time = new Date(message.created_at).toLocaleTimeString("hy-AM", { hour: "2-digit", minute: "2-digit" });

  if (message.deleted_at) {
    return (
      <div
        ref={registerRef}
        className={`flex items-center gap-1 ${own ? "justify-end" : "justify-start"}`}
      >
        <div className={`flex max-w-[80%] flex-col gap-1 ${own ? "items-end" : "items-start"}`}>
          {showSender && !own && (
            <span className="flex items-center gap-1 px-1 text-xs text-text-muted">
              {isAi && <Sparkles size={11} strokeWidth={1.75} />} {senderName}
            </span>
          )}
          <p className="flex items-center gap-1.5 rounded-[var(--radius-xl)] border border-dashed border-border px-3.5 py-2.5 text-sm italic text-text-muted">
            <Ban size={14} strokeWidth={1.75} /> Հաղորդագրությունը ջնջվել է
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={registerRef}
      className={`group flex items-center gap-1 rounded-[var(--radius-md)] transition-colors ${own ? "justify-end" : "justify-start"} ${
        highlighted ? "bg-primary/10" : ""
      }`}
    >
      {!editing && (
        <MessageActionsMenu
          message={message}
          own={own}
          onReply={onReply}
          onForward={onForward}
          onEdit={() => setEditing(true)}
          onDeleteForEveryone={onDeleteForEveryone}
          onDeleteForMe={onDeleteForMe}
          onReport={() => setReporting(true)}
          onAskAI={onAskAI}
          canPin={!!canPin}
          onTogglePin={() => onTogglePin?.()}
        />
      )}
      {reporting && <ReportMessageModal messageId={message.id} onClose={() => setReporting(false)} />}
      <div className={`flex max-w-[80%] flex-col gap-1 ${own ? "items-end" : "items-start"}`}>
        {(showSender || isAi) && !own && (
          <span className={`flex items-center gap-1 px-1 text-xs ${isAi ? "font-medium text-primary" : "text-text-muted"}`}>
            {isAi && <Sparkles size={11} strokeWidth={1.75} />} {senderName}
          </span>
        )}
        {message.pinned_at && (
          <span className="flex items-center gap-1 px-1 text-xs text-text-muted">
            <Pin size={11} strokeWidth={1.75} /> Ամրակցված
          </span>
        )}
        {editing ? (
          <EditComposer
            message={message}
            onCancel={() => setEditing(false)}
            onSave={(text) => {
              onEdit(text);
              setEditing(false);
            }}
          />
        ) : message.context_type && message.context_data ? (
          <ContextCard
            contextType={message.context_type}
            contextData={message.context_data}
            senderId={message.sender?.id ?? null}
            own={own}
          />
        ) : (
          <div
            className={`flex flex-col gap-2 rounded-[var(--radius-xl)] px-3.5 py-2.5 ${
              own
                ? "rounded-br-[var(--radius-xs)] bg-primary text-primary-contrast"
                : isAi
                  ? "rounded-bl-[var(--radius-xs)] border border-primary/30 bg-primary/5 text-text"
                  : "rounded-bl-[var(--radius-xs)] bg-surface-muted text-text"
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
        )}
        <ReactionBar message={message} own={own} onReact={onReact} />
        <span className="flex items-center gap-1 px-1 text-xs text-text-muted">
          {time}
          {message.edited_at && <span title="Խմբագրված">· խմբագրված</span>}
          {receipt && (
            <span className={receipt === "read" ? "text-primary" : ""}>
              {receipt === "read" ? (
                <CheckCheck size={13} strokeWidth={1.75} />
              ) : (
                <Check size={13} strokeWidth={1.75} />
              )}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}
