import type { Attachment } from "../../api/assistant";

const TYPE_ICON: Record<Attachment["attachment_type"], string> = {
  image: "🖼️",
  pdf: "📕",
  document: "📄",
  text: "📝",
  other: "📎",
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
          className="h-16 w-16 rounded-md border border-border object-cover"
        />
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-text text-xs text-bg"
          >
            ✕
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative flex items-center gap-2 rounded-md border border-border bg-surface-muted px-3 py-2 text-sm text-text">
      <span>{TYPE_ICON[attachment.attachment_type]}</span>
      <span className="max-w-[10rem] truncate">{attachment.original_filename}</span>
      {onRemove && (
        <button type="button" onClick={onRemove} className="text-text-muted hover:text-text">
          ✕
        </button>
      )}
    </div>
  );
}
