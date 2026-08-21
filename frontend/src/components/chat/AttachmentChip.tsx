import type { Attachment } from "../../api/chat";
import { useAuthenticatedImageUrl } from "../../hooks/useAuthenticatedImageUrl";
import { FileText, FileType, Image, Mic, Paperclip, X, type LucideIcon } from "lucide-react";

/* The assistant's AttachmentChip carries the same table; both were five
   colour emoji in otherwise monochrome chrome. */
const TYPE_ICON: Record<Attachment["file_type"], LucideIcon> = {
  image: Image,
  pdf: FileText,
  document: FileText,
  text: FileType,
  audio: Mic,
  other: Paperclip,
};

export function AttachmentChip({
  attachment,
  onRemove,
}: {
  attachment: Attachment;
  onRemove?: () => void;
}) {
  const { src } = useAuthenticatedImageUrl(attachment.file_type === "image" ? attachment.download_url : null);

  if (attachment.file_type === "image") {
    return (
      <div className="relative">
        {src ? (
          <img
            src={src}
            alt={attachment.original_filename}
            className="h-16 w-16 rounded-[var(--radius-md)] border border-border object-cover"
          />
        ) : (
          <div className="h-16 w-16 animate-pulse rounded-[var(--radius-md)] border border-border bg-surface-muted" />
        )}
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label="Հեռացնել կցորդը"
            className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-text text-bg"
          >
            <X size={12} strokeWidth={2.5} aria-hidden />
          </button>
        )}
      </div>
    );
  }

  const TypeIcon = TYPE_ICON[attachment.file_type];

  return (
    <div className="relative flex items-center gap-2 rounded-[var(--radius-md)] border border-border bg-surface-muted px-3 py-2 text-sm text-text">
      <TypeIcon size={15} strokeWidth={1.75} aria-hidden className="shrink-0 text-text-muted" />
      <span className="max-w-[10rem] truncate">{attachment.original_filename}</span>
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label="Հեռացնել կցորդը" className="flex text-text-muted hover:text-text">
          <X size={13} strokeWidth={2} aria-hidden />
        </button>
      )}
    </div>
  );
}
