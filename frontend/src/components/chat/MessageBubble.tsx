import { useState } from "react";
import type { Attachment, Message } from "../../api/chat";
import { useAuthenticatedImageUrl } from "../../hooks/useAuthenticatedImageUrl";
import { downloadAuthenticatedFile, saveBlobUrl } from "../../lib/authenticatedFile";
import { ImageLightbox } from "./ImageLightbox";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} Բ`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} ԿԲ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} ՄԲ`;
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
  return <FileAttachment attachment={attachment} own={own} />;
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
