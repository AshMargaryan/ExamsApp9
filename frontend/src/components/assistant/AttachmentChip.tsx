import type { Attachment } from "../../api/assistant";
import { FileText, FileType, Image, Paperclip, X, type LucideIcon } from "lucide-react";

/* Five colour emoji in a row of otherwise monochrome chrome, one of which
   (📝) is the same glyph the notepad insert button used for a different
   meaning entirely. */
const TYPE_ICON: Record<Attachment["attachment_type"], LucideIcon> = {
  image: Image,
  pdf: FileText,
  document: FileText,
  text: FileType,
  other: Paperclip,
};

export function AttachmentChip({
  attachment,
  onRemove,
}: {
  attachment: Attachment;
  onRemove?: () => void;
}) {
  if (attachment.attachment_type === "image" && attachment.url) {
    return (
      <div className="relative">
        <img
          src={attachment.url}
          alt={attachment.original_filename}
          className="h-16 w-16 rounded-[var(--radius-md)] border border-border object-cover"
        />
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-text text-xs text-bg"
          >
            <X size={12} strokeWidth={2.5} aria-hidden />
          </button>
        )}
      </div>
    );
  }

  const TypeIcon = TYPE_ICON[attachment.attachment_type];

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
