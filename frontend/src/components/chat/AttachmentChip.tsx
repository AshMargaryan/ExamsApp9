import type { Attachment } from "../../api/chat";
import { useAuthenticatedImageUrl } from "../../hooks/useAuthenticatedImageUrl";

const TYPE_ICON: Record<Attachment["file_type"], string> = {
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
  const { src } = useAuthenticatedImageUrl(attachment.file_type === "image" ? attachment.download_url : null);

  if (attachment.file_type === "image") {
    return (
      <div className="relative">
        {src ? (
          <img
            src={src}
            alt={attachment.original_filename}
            className="h-16 w-16 rounded-md border border-border object-cover"
          />
        ) : (
          <div className="h-16 w-16 animate-pulse rounded-md border border-border bg-surface-muted" />
        )}
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
      <span>{TYPE_ICON[attachment.file_type]}</span>
      <span className="max-w-[10rem] truncate">{attachment.original_filename}</span>
      {onRemove && (
        <button type="button" onClick={onRemove} className="text-text-muted hover:text-text">
          ✕
        </button>
      )}
    </div>
  );
}
