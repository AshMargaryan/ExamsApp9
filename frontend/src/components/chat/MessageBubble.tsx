import type { Attachment, Message } from "../../api/chat";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Բ`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} ԿԲ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} ՄԲ`;
}

function AttachmentView({ attachment, own }: { attachment: Attachment; own: boolean }) {
  if (attachment.file_type === "image") {
    return (
      <a href={attachment.download_url} target="_blank" rel="noreferrer">
        <img
          src={attachment.download_url}
          alt={attachment.original_filename}
          className="max-h-64 max-w-full rounded-md object-cover"
        />
      </a>
    );
  }
  return (
    <a
      href={attachment.download_url}
      target="_blank"
      rel="noreferrer"
      className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
        own ? "border-primary-contrast/30 hover:bg-black/10" : "border-border hover:bg-surface-muted"
      }`}
    >
      <span>📎</span>
      <span className="min-w-0 flex-1 truncate">{attachment.original_filename}</span>
      <span className={own ? "text-primary-contrast/70" : "text-text-muted"}>{formatSize(attachment.file_size)}</span>
    </a>
  );
}

export function MessageBubble({
  message, own, showSender,
}: {
  message: Message;
  own: boolean;
  showSender: boolean;
}) {
  const senderName = message.sender
    ? [message.sender.first_name, message.sender.last_name].filter(Boolean).join(" ") || message.sender.username
    : "Ջնջված օգտատեր";
  const time = new Date(message.created_at).toLocaleTimeString("hy-AM", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className={`flex ${own ? "justify-end" : "justify-start"}`}>
      <div className={`flex max-w-[80%] flex-col gap-1 ${own ? "items-end" : "items-start"}`}>
        {showSender && !own && <span className="px-1 text-xs text-text-muted">{senderName}</span>}
        <div
          className={`flex flex-col gap-2 rounded-2xl px-3.5 py-2.5 ${
            own ? "rounded-br-sm bg-primary text-primary-contrast" : "rounded-bl-sm bg-surface-muted text-text"
          }`}
        >
          {message.attachments.map((a) => (
            <AttachmentView key={a.id} attachment={a} own={own} />
          ))}
          {message.text && <p className="whitespace-pre-wrap break-words">{message.text}</p>}
        </div>
        <span className="px-1 text-xs text-text-muted">{time}</span>
      </div>
    </div>
  );
}
